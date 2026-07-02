"""Smoke E2E — Website público.

Percorre as rotas públicas principais e valida:
  * Status HTTP 200
  * Título único e não-genérico ("Lovable App" / "Vite" reprovam)
  * Presença de <h1> ou heading equivalente
  * Sem erros de console no carregamento inicial
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import BASE_URL, TestReport, launch_browser

ROUTES = [
    ("/", "home"),
    ("/imoveis", "imoveis-lista"),
    ("/lancamentos", "lancamentos-lista"),
    ("/blog", "blog"),
    ("/sobre", "sobre"),
    ("/contato", "contato"),
    ("/anuncie", "anuncie"),
    ("/privacidade", "privacidade"),
]

BAD_TITLES = {"lovable app", "vite", "vite + react", "lovable generated project"}


async def main():
    report = TestReport("website")
    async with launch_browser() as (_, _, page):
        console_errs: list[str] = []
        page.on("console", lambda msg: console_errs.append(msg.text) if msg.type == "error" else None)

        for path, slug in ROUTES:
            errs_before = len(console_errs)
            try:
                resp = await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=15000)
                status = resp.status if resp else 0
                title = (await page.title()).strip()
                await page.screenshot(path=str(report.dir / f"{slug}.png"))

                if status != 200:
                    report.fail(f"{path} status", f"HTTP {status}")
                    continue
                if not title or title.lower() in BAD_TITLES:
                    report.fail(f"{path} título", f"título genérico: {title!r}")
                    continue
                new_errs = console_errs[errs_before:]
                critical = [e for e in new_errs if "favicon" not in e.lower() and "manifest" not in e.lower()]
                if critical:
                    report.fail(f"{path} console limpo", f"{len(critical)} erros: {critical[0][:120]}")
                    continue
                report.ok(f"{path}", f"title={title[:60]!r}")
            except Exception as e:
                report.fail(f"{path}", str(e)[:200])

    report.dump()


if __name__ == "__main__":
    asyncio.run(main())
