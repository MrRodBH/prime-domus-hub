"""Ciclo 5 — Performance + Regressão.

Mede tempo de resposta e tamanho de payload das rotas públicas críticas
(SSR) e endpoints de API. Sinaliza WARN quando ultrapassar orçamento,
FAIL quando exceder 3× o orçamento.
"""
from __future__ import annotations

import asyncio
import statistics
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))

from tests._helpers.session import BASE_URL, TestReport

# (path, budget_ms, max_kb)
ROUTES = [
    ("/",             1500, 800),
    ("/imoveis",      2000, 900),
    ("/lancamentos",  2000, 900),
    ("/blog",         1500, 500),
    ("/sobre",        1200, 400),
    ("/contato",      1200, 400),
    ("/anuncie",      1200, 400),
    ("/privacidade",  1200, 400),
]
SAMPLES = 3


def measure(url: str) -> tuple[int, float, int]:
    """(status, ms, bytes)"""
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            body = r.read()
            return r.status, (time.perf_counter() - t0) * 1000, len(body)
    except urllib.error.HTTPError as e:
        return e.code, (time.perf_counter() - t0) * 1000, 0
    except Exception:
        return 0, (time.perf_counter() - t0) * 1000, 0


async def main() -> int:
    report = TestReport("performance")
    for path, budget, max_kb in ROUTES:
        url = f"{BASE_URL}{path}"
        samples = [measure(url) for _ in range(SAMPLES)]
        statuses = {s for s, _, _ in samples}
        ms = statistics.median(m for _, m, _ in samples)
        kb = max(b for _, _, b in samples) / 1024
        detail = f"p50={ms:.0f}ms size={kb:.0f}kb status={statuses}"
        if statuses != {200}:
            report.fail(f"route{path}", detail)
        elif ms > budget * 3 or kb > max_kb * 3:
            report.fail(f"route{path}", f"{detail} (budget {budget}ms/{max_kb}kb)")
        elif ms > budget or kb > max_kb:
            report.ok(f"route{path}", f"{detail} ⚠ acima do orçamento {budget}ms/{max_kb}kb")
        else:
            report.ok(f"route{path}", detail)
    report.dump()
    return 0 if all(r["status"] != "FAIL" for r in report.results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
