import { useEffect, useRef, useState } from "react";
import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { adminVincularCorretorIdentidade } from "@/lib/api/tenant-broker-directory.functions";
import { listTenantMemberships } from "@/lib/api/tenant-lifecycle.functions";
import type { BrokerDirectoryItem } from "./broker-team-directory-read-model";

function safeFailure(error: unknown, listing = false): string {
  const message = error instanceof Error ? error.message.toLocaleLowerCase("pt-BR") : "";
  if (/acesso negado|owner ativo|membership de gestão não encontrada|forbidden|permission|denied/.test(message)) {
    return listing ? "Consulta de identidades não autorizada para este contexto." : "Vínculo não autorizado para este contexto.";
  }
  if (/tenant selection required|selecione|invalid tenant|sem tenant|workspace indisponível/.test(message)) {
    return "Seleção de identidades indisponível. Selecione um contexto de trabalho válido.";
  }
  if (!listing && message.includes("conflito de vínculo")) {
    return "Conflito de vínculo. Atualize o diretório para conferir a situação; nenhuma troca de identidade está disponível.";
  }
  return listing
    ? "Consulta de identidades indisponível. Tente consultar novamente."
    : "Não foi possível confirmar o vínculo. Confira o diretório antes de tentar novamente. Sua seleção foi preservada.";
}

type Option = { userId: string; email: string | null };

export function BrokerIdentityLinkPanel({ broker }: { broker: BrokerDirectoryItem }) {
  const client = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [userId, setUserId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const alive = useRef(true);
  const locked = useRef(false);
  const request = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current++; }; }, []);
  const mutationKey = ["directory", "broker-identity-link", broker.id];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: (target: string) => adminVincularCorretorIdentidade({ data: { corretorId: broker.id, userId: target } }),
    retry: false,
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["directory", "brokers-teams", "read-only"] }); },
  });

  async function loadOptions() {
    const sequence = ++request.current;
    setOpened(true); setLoading(true); setQueryError(""); setConfirming(false);
    try {
      // The server owns the narrower membership-list authorization. No fallback lookup.
      const rows = await listTenantMemberships();
      if (!alive.current || sequence !== request.current) return;
      setOptions(rows.filter(row => row.status === "active").map(row => ({ userId: row.userId, email: row.email })));
    } catch (error) {
      if (alive.current && sequence === request.current) { setOptions([]); setQueryError(safeFailure(error, true)); }
    } finally {
      if (alive.current && sequence === request.current) setLoading(false);
    }
  }

  async function submit() {
    if (locked.current || pending || completed || broker.identityLinked || !confirming || !options.some(option => option.userId === userId)) return;
    locked.current = true;
    setMessage("");
    try {
      const result = await mutation.mutateAsync(userId);
      if (!alive.current) return;
      setCompleted(true); setConfirming(false);
      setMessage(result.status === "already_linked" ? "Esta identidade já estava vinculada a este corretor." : "Identidade vinculada com sucesso.");
    } catch (error) {
      if (alive.current) { setMessage(safeFailure(error)); setConfirming(false); }
    } finally { locked.current = false; }
  }

  const linked = broker.identityLinked || completed;
  const selected = options.find(option => option.userId === userId);
  return <section aria-label="Vínculo de identidade" className="space-y-3 rounded-2xl border border-border bg-card p-5">
    <h2 className="font-semibold">Identidade de acesso</h2>
    <p className="text-sm text-muted-foreground">Vincule uma identidade existente a {broker.displayName}. Esta ação não cria acesso e não permite troca ou desvinculação.</p>
    {message && <p role={completed ? "status" : "alert"} className="text-sm">{message}</p>}
    {linked ? <p className="text-sm">Este corretor possui identidade vinculada.</p> : <>
      {!opened ? <Button type="button" disabled={pending} onClick={loadOptions}>Selecionar identidade</Button> : <>
        {loading && <p role="status">Carregando identidades…</p>}
        {queryError && <p role="alert">{queryError}</p>}
        {!loading && !queryError && options.length === 0 && <p role="status">Nenhuma identidade com participação ativa disponível.</p>}
        <label className="block text-sm">Identidade existente
          <select aria-label="Identidade existente" className="mt-1 w-full min-w-0 rounded-md border bg-background p-2" value={userId} disabled={loading || !!queryError || !options.length || pending || confirming} onChange={event => { setUserId(event.target.value); setMessage(""); }}>
            <option value="">Selecione uma identidade</option>
            {options.map(option => <option key={option.userId} value={option.userId}>{option.email ? `${option.email} — ${option.userId}` : option.userId}</option>)}
          </select>
        </label>
        {confirming ? <div className="space-y-3" role="group" aria-label="Confirmar vínculo">
          <p className="break-words text-sm">Confirmar vínculo inicial de {broker.displayName} com {selected?.email ?? selected?.userId}? Não será possível trocar a identidade nesta interface.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={submit}>{pending ? "Vinculando…" : "Confirmar vínculo"}</Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Voltar à seleção</Button>
          </div>
        </div> : <Button type="button" disabled={loading || !!queryError || pending || !selected} onClick={() => setConfirming(true)}>Revisar vínculo</Button>}
        <Button type="button" variant="outline" disabled={loading || pending || confirming} onClick={loadOptions}>Consultar identidades novamente</Button>
      </>}
    </>}
  </section>;
}
