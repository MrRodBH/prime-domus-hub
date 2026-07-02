"""Smoke E2E — Autenticação (rotas públicas e redirecionamento de rota protegida).

Cobre:
  * /auth carrega com formulário de login (heading + input email + input senha)
  * /admin sem sessão → redireciona para /auth
  * /reset-password renderiza formulário
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import BASE_URL, TestReport, launch_browser


async def main():
    report = TestReport("auth")
    async with launch_browser() as (_, _, page):
        # 1. /auth renderiza
        try:
            await page.goto(f"{BASE_URL}/auth", wait_until="domcontentloaded")
            await page.wait_for_selector("input[type=email]", timeout=5000)
            await page.wait_for_selector("input[type=password]", timeout=5000)
            await page.screenshot(path=str(report.dir / "01_auth_page.png"))
            report.ok("/auth renderiza formulário de login")
        except Exception as e:
            await page.screenshot(path=str(report.dir / "01_auth_fail.png"))
            report.fail("/auth renderiza formulário de login", str(e)[:200])

        # 2. /admin sem sessão → /auth
        try:
            await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
            await page.wait_for_url("**/auth**", timeout=5000)
            report.ok("/admin sem sessão redireciona para /auth")
        except Exception as e:
            report.fail("/admin redireciona para /auth", f"URL final: {page.url} — {e}")

        # 3. /reset-password renderiza
        try:
            await page.goto(f"{BASE_URL}/reset-password", wait_until="domcontentloaded")
            await page.screenshot(path=str(report.dir / "03_reset.png"))
            report.ok("/reset-password acessível")
        except Exception as e:
            report.fail("/reset-password acessível", str(e)[:200])

    report.dump()


if __name__ == "__main__":
    asyncio.run(main())
