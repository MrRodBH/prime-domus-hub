"""CMS E2E — páginas, blog, formulários, campanhas, mídias, versionamento.

Requer sessão. Cobertura smoke por rota.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import (
    BASE_URL, TestReport, auth_status, launch_browser, restore_supabase_session,
)

PAGES = [
    ("/admin/paginas", "paginas"),
    ("/admin/blog", "blog-admin"),
    ("/admin/blog/novo", "blog-novo"),
    ("/admin/formularios", "formularios"),
    ("/admin/campanhas", "campanhas"),
    ("/admin/cms-auditoria", "cms-auditoria"),
    ("/admin/cms-transferencia", "cms-transferencia"),
    ("/admin/perfis", "perfis-rbac"),
]


async def main():
    report = TestReport("cms")
    if auth_status() != "injected":
        for p, _ in PAGES:
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
                    report.fail(path, "redirect /auth")
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
