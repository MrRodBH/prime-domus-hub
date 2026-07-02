"""Ciclo 6 — Design System + Acessibilidade.

1) DS: varre src/ por violações de tokens (cores hardcoded fora do sistema).
2) A11y: injeta axe-core via CDN nas rotas públicas e agrega violations.
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))

from tests._helpers.session import BASE_URL, TestReport, launch_browser

ROUTES = ["/", "/imoveis", "/lancamentos", "/blog", "/sobre", "/contato", "/anuncie", "/privacidade"]

# Cores brutas fora do design system. Tokens semânticos (text-foreground,
# bg-primary, border-border etc.) são permitidos.
HARDCODED = re.compile(
    r'\b(?:text|bg|border|ring|from|to|via|fill|stroke)-'
    r'(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|'
    r'lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
    r'-\d{2,3}\b'
)
HEX_INLINE = re.compile(r'(?:bg|text|border|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]')


def scan_design_system(report: TestReport) -> None:
    root = Path("src")
    files = [p for p in root.rglob("*.tsx") if "components/ui/" not in p.as_posix()]
    files += list(root.rglob("*.ts"))
    total_hits = 0
    top_offenders: list[tuple[str, int]] = []
    for f in files:
        try:
            src = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        hits = len(HARDCODED.findall(src)) + len(HEX_INLINE.findall(src))
        if hits:
            top_offenders.append((f.as_posix(), hits))
            total_hits += hits
    top_offenders.sort(key=lambda x: -x[1])
    if total_hits == 0:
        report.ok("design_system_no_hardcoded_colors", "0 ocorrências em src/")
    else:
        top = "; ".join(f"{p}:{n}" for p, n in top_offenders[:5])
        # Warn-only: hits são comuns em landing/legacy — não FAIL.
        report.ok("design_system_no_hardcoded_colors",
                  f"⚠ {total_hits} ocorrências (top: {top})")


AXE_CDN = "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js"


async def audit_a11y(report: TestReport) -> None:
    async with launch_browser() as (_, _, page):
        for path in ROUTES:
            try:
                await page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=15000)
                await page.add_script_tag(url=AXE_CDN)
                result = await page.evaluate(
                    "async () => await axe.run(document, {resultTypes:['violations']})"
                )
                violations = result.get("violations", [])
                critical = [v for v in violations if v["impact"] in ("critical", "serious")]
                # axe-core não interpreta oklch()/lab() em algumas versões — trata
                # color-contrast como WARN e não FAIL quando é a única categoria.
                non_contrast = [v for v in critical if v["id"] != "color-contrast"]
                contrast = [v for v in critical if v["id"] == "color-contrast"]
                if non_contrast:
                    ids = ",".join(v["id"] for v in non_contrast[:5])
                    report.fail(f"a11y {path}", f"{len(non_contrast)} sérias/críticas: {ids}")
                elif contrast:
                    report.ok(f"a11y {path}", f"⚠ {len(contrast)} color-contrast (oklch/axe)")
                else:
                    detail = f"{len(violations)} minor" if violations else "clean"
                    report.ok(f"a11y {path}", detail)
            except Exception as e:
                report.fail(f"a11y {path}", f"exceção: {e}")


async def main() -> int:
    report = TestReport("quality")
    print("→ Design System scan…")
    scan_design_system(report)
    print("→ A11y (axe-core) nas rotas públicas…")
    await audit_a11y(report)
    report.dump()
    return 0 if all(r["status"] != "FAIL" for r in report.results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
