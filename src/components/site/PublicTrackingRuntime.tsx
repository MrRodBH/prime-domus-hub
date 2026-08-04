import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { PublicTrackingSnapshotDto } from "@/lib/tracking/tracking-contracts";
import {
  TRACKING_CONSENT_EVENT,
  readTrackingConsent,
  saveTrackingConsent,
  type TrackingConsentState,
} from "@/lib/tracking/tracking-consent";
import {
  dispatchCataloguedTrackingEvent,
  removeAllTrackingProviderRuntimes,
} from "@/lib/tracking/public-tracking-runtime";
import { Button } from "@/components/ui/button";

function currentPagePayload(pathname?: string) {
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { referrerHost = ""; }
  return {
    path: pathname ?? window.location.pathname,
    title: document.title.slice(0, 200),
    referrerHost,
  };
}

export function PublicTrackingRuntime({ snapshot }: { snapshot: PublicTrackingSnapshotDto }) {
  const router = useRouter();
  const [consent, setConsent] = useState<TrackingConsentState>(() => ({ status: "unknown", choice: null }));
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const policyRevision = snapshot.consent.policyRevision;
  const activeProviderCount = useMemo(
    () => snapshot.connectors.filter((connector) => connector.availabilityState === "active" || connector.availabilityState === "preview_ready").length,
    [snapshot.connectors],
  );

  useEffect(() => {
    const initial = readTrackingConsent(policyRevision);
    setConsent(initial);
    if (initial.choice) {
      setAnalytics(initial.choice.analytics);
      setMarketing(initial.choice.marketing);
    }
    const onConsent = () => {
      const next = readTrackingConsent(policyRevision);
      setConsent(next);
      if (next.choice) {
        setAnalytics(next.choice.analytics);
        setMarketing(next.choice.marketing);
      }
    };
    window.addEventListener(TRACKING_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(TRACKING_CONSENT_EVENT, onConsent);
  }, [policyRevision]);

  useEffect(() => {
    if (consent.status === "unknown") return;
    if (!consent.choice?.analytics && !consent.choice?.marketing) {
      removeAllTrackingProviderRuntimes();
      return;
    }
    void dispatchCataloguedTrackingEvent({
      snapshot,
      consent,
      eventKey: "page_view",
      payload: currentPagePayload(),
    });
    return router.subscribe("onResolved", ({ toLocation }) => {
      void dispatchCataloguedTrackingEvent({
        snapshot,
        consent,
        eventKey: "page_view",
        payload: currentPagePayload(toLocation.pathname),
      });
    });
  }, [consent, router, snapshot]);

  function applyChoice(nextAnalytics: boolean, nextMarketing: boolean) {
    const choice = saveTrackingConsent({
      policyRevision,
      analytics: nextAnalytics,
      marketing: nextMarketing,
    });
    setConsent({ status: "granted_or_restricted", choice });
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setShowPreferences(false);
    if (!nextAnalytics && !nextMarketing) removeAllTrackingProviderRuntimes();
  }

  const shouldShowNotice = snapshot.consent.noticeEnabled && consent.status === "unknown";
  if (!shouldShowNotice && !showPreferences) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur"
      aria-label="Preferências de privacidade e tracking"
      data-tracking-consent-state={consent.status}
      data-tracking-provider-count={activeProviderCount}
    >
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Preferências de privacidade</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recursos essenciais permanecem ativos. Analytics e marketing só carregam após sua escolha. Nenhum tenant, usuário, lead, telefone ou e-mail é enviado pelo runtime de tracking.
          </p>
        </div>

        {showPreferences ? (
          <div className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1"
              />
              <span><strong>Analytics</strong><br /><span className="text-xs text-muted-foreground">Medição de navegação e uso.</span></span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
                className="mt-1"
              />
              <span><strong>Marketing</strong><br /><span className="text-xs text-muted-foreground">Pixel e eventos de conversão catalogados.</span></span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {showPreferences ? (
            <Button size="sm" variant="outline" onClick={() => applyChoice(analytics, marketing)}>Salvar preferências</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowPreferences(true)}>Configurar</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => applyChoice(false, false)}>Somente essenciais</Button>
          <Button size="sm" onClick={() => applyChoice(true, true)}>Aceitar analytics e marketing</Button>
        </div>
      </div>
    </aside>
  );
}
