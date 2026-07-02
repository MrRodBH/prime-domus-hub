"""Helpers compartilhados: bootstrap de browser + restauração de sessão Supabase.

Uso:
    from tests._helpers.session import launch_browser, restore_supabase_session

    async with launch_browser() as (browser, context, page):
        await restore_supabase_session(context, page)
        await page.goto(BASE_URL + "/admin")
"""
from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Tuple

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

BASE_URL = os.environ.get("QA_BASE_URL", "http://localhost:8080")
ARTIFACTS_ROOT = Path(os.environ.get("QA_ARTIFACTS", "/tmp/qa"))
ARTIFACTS_ROOT.mkdir(parents=True, exist_ok=True)


def artifacts_dir(suite: str) -> Path:
    d = ARTIFACTS_ROOT / suite
    d.mkdir(parents=True, exist_ok=True)
    return d


@asynccontextmanager
async def launch_browser() -> AsyncIterator[Tuple[Browser, BrowserContext, Page]]:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        try:
            yield browser, context, page
        finally:
            await browser.close()


def auth_status() -> str:
    return os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "no_supabase")


async def restore_supabase_session(context: BrowserContext, page: Page) -> bool:
    """Restaura a sessão Supabase injetada pelo Lovable. Retorna False quando não há sessão."""
    status = auth_status()
    if status != "injected":
        return False

    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE_URL
        await context.add_cookies(cookies)

    await page.goto(BASE_URL)
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
    return True


class TestReport:
    """Coletor simples de resultados por suíte (pass/fail + evidências)."""

    def __init__(self, suite: str):
        self.suite = suite
        self.results: list[dict] = []
        self.dir = artifacts_dir(suite)

    def ok(self, name: str, detail: str = ""):
        self.results.append({"name": name, "status": "OK", "detail": detail})
        print(f"  ✅ {name} {detail}")

    def fail(self, name: str, detail: str = ""):
        self.results.append({"name": name, "status": "FAIL", "detail": detail})
        print(f"  ❌ {name} {detail}")

    def skip(self, name: str, detail: str = ""):
        self.results.append({"name": name, "status": "SKIP", "detail": detail})
        print(f"  ⊘  {name} {detail}")

    def dump(self) -> Path:
        out = self.dir / "report.json"
        out.write_text(json.dumps({"suite": self.suite, "results": self.results}, indent=2))
        passed = sum(1 for r in self.results if r["status"] == "OK")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        skipped = sum(1 for r in self.results if r["status"] == "SKIP")
        print(f"\n[{self.suite}] {passed} OK · {failed} FAIL · {skipped} SKIP → {out}")
        return out
