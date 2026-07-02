"""Smoke E2E — Super Admin (requer sessão injetada).

Pula automaticamente quando LOVABLE_BROWSER_AUTH_STATUS != "injected".
Quando executado com sessão:
  * /super carrega dashboard
  * /super/observabilidade carrega
  * /super/dlq carrega
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import (
    BASE_URL, TestReport, auth_status, launch_browser, restore_supabase_session,
)

PAGES = [
    ("/super", "dashboard"),
    ("/super/observabilidade", "observabilidade"),
    ("/super/dlq", "dlq"),
]


async def main():
    report = TestReport("super-admin")
    if auth_status() != "injected":
        for path, slug in PAGES:
            report.skip(path, f"auth_status={auth_status()} — usuário precisa entrar no preview")
        report.dump()
        return

    async with launch_browser() as (_, context, page):
        await restore_supabase_session(context, page)
        for path, slug in PAGES:
            try:
                resp = await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(500)
                await page.screenshot(path=str(report.dir / f"{slug}.png"))
                url = page.url
                if "/auth" in url:
                    report.fail(path, "redirecionou para /auth (sem permissão super_admin?)")
                    continue
                if resp and resp.status >= 400:
                    report.fail(path, f"HTTP {resp.status}")
                    continue
                report.ok(path, f"final={url}")
            except Exception as e:
                report.fail(path, str(e)[:200])

    report.dump()


if __name__ == "__main__":
    asyncio.run(main())
