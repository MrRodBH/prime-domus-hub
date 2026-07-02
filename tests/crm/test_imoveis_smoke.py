"""Imóveis + Lançamentos + Uploads (smoke) — requer sessão.

Cobre acessibilidade e render das telas de catálogo interno + form novo.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import (
    BASE_URL, TestReport, auth_status, launch_browser, restore_supabase_session,
)

PAGES = [
    ("/admin/imoveis", "imoveis-lista"),
    ("/admin/imoveis/novo", "imoveis-novo"),
    ("/admin/lancamentos", "lancamentos-lista"),
    ("/admin/lancamentos/novo", "lancamentos-novo"),
    ("/admin/midias", "midias"),
    ("/admin/portais", "portais"),
    ("/admin/site", "site-config"),
    ("/admin/bairros", "bairros"),
    ("/admin/cidades", "cidades"),
]


async def main():
    report = TestReport("imoveis")
    if auth_status() != "injected":
        for p, s in PAGES:
            report.skip(p, "requer login no preview")
        report.dump()
        return
    async with launch_browser() as (_, context, page):
        await restore_supabase_session(context, page)
        for path, slug in PAGES:
            try:
                resp = await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(600)
                await page.screenshot(path=str(report.dir / f"{slug}.png"))
                if "/auth" in page.url:
                    report.fail(path, "redirecionou para /auth")
                    continue
                if resp and resp.status >= 400:
                    report.fail(path, f"HTTP {resp.status}")
                    continue
                report.ok(path)
            except Exception as e:
                report.fail(path, str(e)[:200])
    report.dump()


if __name__ == "__main__":
    asyncio.run(main())
