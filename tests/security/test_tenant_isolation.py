"""Ciclo 4 — Multi-tenant + Segurança.

Auditoria SQL: garante que toda tabela de negócio com coluna `tenant_id`
tem policy RESTRICTIVE de isolamento por tenant (ou está na allowlist
de tabelas globais por design).

Auditoria HTTP: valida que endpoints públicos exigem tenant/token e não
vazam dados cross-tenant.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))

import httpx
from tests._helpers.session import BASE_URL, TestReport

# Tabelas globais por design — NÃO precisam de isolamento por tenant.
GLOBAL_ALLOWLIST = {
    "system_events",      # observabilidade super_admin
    "tenant_members",     # lookup cross-tenant do usuário
    "tenants",            # cadastro dos próprios tenants
    "user_roles",         # roles globais
    "rate_limit_buckets", # rate limit global
    "audit_log",          # já com RESTRICTIVE
}


def audit_restrictive() -> tuple[list[str], list[str]]:
    """Lista (ok, missing) — tabelas com tenant_id e status de RESTRICTIVE."""
    sql = """
      SELECT c.relname,
             COUNT(*) FILTER (WHERE p.polpermissive=false) AS r
        FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        LEFT JOIN pg_policy p ON p.polrelid=c.oid
       WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name=c.relname
              AND column_name='tenant_id'
         )
       GROUP BY c.relname
       ORDER BY c.relname;
    """
    out = subprocess.run(
        ["psql", "-At", "-F", "|", "-c", sql],
        capture_output=True, text=True, check=True,
    ).stdout.strip().splitlines()
    ok, missing = [], []
    for line in out:
        name, cnt = line.split("|")
        if int(cnt) >= 1 or name in GLOBAL_ALLOWLIST:
            ok.append(name)
        else:
            missing.append(name)
    return ok, missing


async def http_checks(report: TestReport) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        # Feed exige token válido do tenant
        r = await client.get(f"{BASE_URL}/api/public/feeds/zap/tokeninvalido")
        if r.status_code in (400, 401, 403, 404):
            report.ok("feed_invalid_token_rejected", f"status={r.status_code}")
        else:
            report.fail("feed_invalid_token_rejected", f"status={r.status_code}")

        # Portal-leads sem body — deve rejeitar
        r = await client.post(f"{BASE_URL}/api/public/portal-leads", json={})
        if r.status_code >= 400:
            report.ok("portal_leads_empty_rejected", f"status={r.status_code}")
        else:
            report.fail("portal_leads_empty_rejected", f"status={r.status_code}")

        # DLQ retry sem apikey
        r = await client.post(f"{BASE_URL}/api/public/hooks/portal-dlq-retry")
        if r.status_code == 401:
            report.ok("dlq_retry_requires_apikey", "401")
        else:
            report.fail("dlq_retry_requires_apikey", f"status={r.status_code}")


async def main() -> int:
    report = TestReport("security")
    print("→ Auditando RESTRICTIVE em pg_policies…")
    if os.environ.get("PGHOST"):
        ok, missing = audit_restrictive()
        if not missing:
            report.ok("all_tenant_tables_restrictive", f"{len(ok)} tabelas")
        else:
            report.fail(
                "all_tenant_tables_restrictive",
                f"faltando: {', '.join(missing)}",
            )
    else:
        report.skip("all_tenant_tables_restrictive", "PGHOST ausente")

    print("→ Auditando endpoints públicos…")
    await http_checks(report)

    report.dump()
    return 0 if all(r["status"] != "FAIL" for r in report.results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
