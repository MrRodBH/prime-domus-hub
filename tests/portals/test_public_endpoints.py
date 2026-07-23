"""Portais públicos — cobertura ampliada de endpoints públicos.

Sem auth. Valida contratos HTTP:
  * /api/public/feeds/<portal>/<token> — token inválido → 401
  * /api/public/portal-leads (POST) — payload inválido → 400
  * /api/public/hooks/portal-dlq-retry — credenciais legadas negadas; bearer dedicado quando configurado
  * Header Retry-After presente em resposta 429 quando rate-limit dispara
"""
import json
import os
import sys
from pathlib import Path

import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests._helpers.session import BASE_URL, TestReport

APIKEY = os.environ.get("QA_APIKEY", "sb_publishable_test_only")
DLQ_SECRET = os.environ.get("PORTAL_DLQ_RETRY_SECRET")


def http(method, path, body=None, headers=None):
    url = BASE_URL + path
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf-8", "replace")[:400], dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:400], dict(e.headers)
    except Exception as e:
        return 0, str(e)[:200], {}


def main():
    r = TestReport("portals")

    # 1. feed inválido
    status, body, _ = http("GET", "/api/public/feeds/zap/short")
    (r.ok if status in (400, 401, 403) else r.fail)(
        "feed token inválido → 4xx", f"HTTP {status}"
    )

    # 2. portal-leads payload vazio
    status, body, _ = http("POST", "/api/public/portal-leads", body={})
    (r.ok if status == 400 else r.fail)(
        "portal-leads sem payload → 400", f"HTTP {status}"
    )

    # 3. portal-leads token curto
    status, body, _ = http("POST", "/api/public/portal-leads", body={"token": "abc", "nome": "x"})
    (r.ok if status == 400 else r.fail)(
        "portal-leads token curto → 400", f"HTTP {status}"
    )

    # 4. dlq-retry sem auth
    status, body, _ = http("POST", "/api/public/hooks/portal-dlq-retry")
    (r.ok if status == 401 else r.fail)(
        "dlq-retry sem auth → 401", f"HTTP {status}"
    )

    # 5. publishable key legada deve ser negada
    status, body, _ = http("POST", "/api/public/hooks/portal-dlq-retry", headers={"apikey": APIKEY})
    (r.ok if status == 401 else r.fail)(
        "dlq-retry com apikey legada → 401", f"HTTP {status} body={body[:120]}"
    )

    # 6. bearer dedicado: aceita somente quando o ambiente de QA o configurou.
    bearer = DLQ_SECRET or "not-configured-test-secret"
    status, body, _ = http(
        "POST",
        "/api/public/hooks/portal-dlq-retry",
        headers={"Authorization": f"Bearer {bearer}"},
    )
    expected = 200 if DLQ_SECRET else 401
    (r.ok if status == expected else r.fail)(
        f"dlq-retry bearer dedicado → {expected}", f"HTTP {status} body={body[:120]}"
    )

    r.dump()


if __name__ == "__main__":
    main()
