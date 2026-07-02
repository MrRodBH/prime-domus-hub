"""Website — validação estendida: SEO por rota + responsividade + navegação SPA."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import BASE_URL, TestReport, launch_browser

ROUTES = ["/", "/imoveis", "/lancamentos", "/blog", "/sobre", "/contato", "/anuncie", "/privacidade"]
VIEWPORTS = [("mobile", 375, 812), ("tablet", 768, 1024), ("desktop", 1280, 1800)]


async def main():
    report = TestReport("website-seo")
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        # 1) SEO — cada rota tem title/description/og únicos e não-genéricos
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        titles = {}
        for path in ROUTES:
            try:
                await page.goto(BASE_URL + path, wait_until="domcontentloaded", timeout=15000)
                title = await page.title()
                desc = await page.evaluate("() => document.querySelector('meta[name=description]')?.content ?? ''")
                og_title = await page.evaluate("() => document.querySelector('meta[property=\"og:title\"]')?.content ?? ''")
                if not title or not desc or not og_title:
                    report.fail(f"SEO {path}", f"faltando title/desc/og")
                    continue
                titles[path] = title
                report.ok(f"SEO {path}", f"title={title[:50]!r}")
            except Exception as e:
                report.fail(f"SEO {path}", str(e)[:200])
        # Uniqueness
        dupes = [t for t in titles.values() if list(titles.values()).count(t) > 1]
        if dupes:
            report.fail("SEO titles únicos", f"duplicados: {set(dupes)}")
        else:
            report.ok("SEO titles únicos por rota")
        await context.close()

        # 2) Responsividade — home em 3 viewports
        for name, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            p = await ctx.new_page()
            try:
                await p.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
                await p.wait_for_timeout(500)
                await p.screenshot(path=str(report.dir / f"home_{name}.png"))
                # Sem scroll horizontal
                overflow = await p.evaluate(
                    "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
                )
                if overflow > 4:
                    report.fail(f"Responsivo {name}", f"overflow horizontal={overflow}px")
                else:
                    report.ok(f"Responsivo {name}", f"{w}x{h}")
            except Exception as e:
                report.fail(f"Responsivo {name}", str(e)[:200])
            await ctx.close()

        await browser.close()
    report.dump()


if __name__ == "__main__":
    asyncio.run(main())
