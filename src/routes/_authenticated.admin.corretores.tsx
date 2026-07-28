import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListarCorretores,
  adminSalvarCorretor,
  adminExcluirCorretor,
  adminAssinarUrl,
} from "@/lib/api/admin.functions";
import { listarEquipes } from "@/lib/api/rbac.functions";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Archive, Upload, Loader2, UsersRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { maskPhoneBR, digitsOnly } from "@/lib/phone-br";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/corretores")({ component: BrokerDirectoryPage });

type UserStatus = "ativo" | "inativo" | "bloqueado" | "pendente";
type BrokerForm = {
  id?: string;
  nome: string;
  sobrenome: string;
  cpf: string;
  creci: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cargo: string;
  bio: string;
  foto_url: string;
  ativo: boolean;
  status: UserStatus;
  team_id: string | null;
  user_id?: string | null;
};

const emptyForm = (): BrokerForm => ({
  nome: "",
  sobrenome: "",
  cpf: "",
  creci: "",
  email: "",
  telefone: "",
  whatsapp: "",
  cargo: "",
  bio: "",
  foto_url: "",
  ativo: true,
  status: "ativo",
  team_id: null,
});

function brokerPayload(form: BrokerForm) {
  return {
    id: form.id,
    nome: form.nome,
    sobrenome: form.sobrenome || null,
    cpf: form.cpf || null,
    creci: form.creci || null,
    email: form.email || null,
    telefone: form.telefone || null,
    whatsapp: form.whatsapp || null,
    cargo: form.cargo || null,
    bio: form.bio || null,
    foto_url: form.foto_url || null,
    ativo: form.ativo,
    status: form.status,
    team_id: form.team_id,
  };
}

function BrokerDirectoryPage() {
  const qc = useQueryClient();
  const brokers = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const teams = useQuery({ queryKey: ["rbac", "equipes"], queryFn: () => listarEquipes() });
  const [editing, setEditing] = useState<BrokerForm | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: (form: BrokerForm) => adminSalvarCorretor({ data: brokerPayload(form) }),
    onSuccess: () => {
      toast.success("Registro profissional salvo sem alterar login, membership ou senha.");
      void qc.invalidateQueries({ queryKey: ["admin", "corretores"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => adminExcluirCorretor({ data: { id } }),
    onSuccess: () => {
      toast.success("Registro profissional arquivado. O acesso do usuário não foi alterado.");
      void qc.invalidateQueries({ queryKey: ["admin", "corretores"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const target = await createUploadTarget({ data: { domain: "corretor-foto", originalFileName: file.name, mimeType: file.type, size: file.size } });
      const { error } = await supabase.storage.from(target.bucket).upload(target.path, file, { upsert: false });
      if (error) throw error;
      const signed = await adminAssinarUrl({ data: { bucket: target.bucket, path: target.path, width: 600, quality: 85 } });
      setEditing({ ...editing, foto_url: signed.url });
      toast.success("Foto enviada.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AdminPageHeader eyebrow="Diretório profissional" title="Corretores" />
          <p className="mt-1 text-sm text-muted-foreground">
            Este cadastro contém somente dados profissionais. Login, membership role e perfis de acesso são geridos separadamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin/memberships"><UsersRound className="mr-2 size-4" /> Membros e acessos</Link></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={() => { setEditing(emptyForm()); setOpen(true); }}><Plus className="mr-1 size-4" /> Novo registro</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader><DialogTitle>{editing?.id ? "Editar corretor" : "Novo registro profissional"}</DialogTitle></DialogHeader>
              {editing ? (
                <form onSubmit={(event) => { event.preventDefault(); save.mutate(editing); }} className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Para conceder acesso ao SaaS, utilize “Membros e acessos”. Este formulário nunca cria usuário Auth, senha, membership ou user_roles.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome *"><Input required value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></Field>
                    <Field label="Sobrenome"><Input value={editing.sobrenome} onChange={(event) => setEditing({ ...editing, sobrenome: event.target.value })} /></Field>
                    <Field label="CPF"><Input value={editing.cpf} onChange={(event) => setEditing({ ...editing, cpf: event.target.value.replace(/\D/g, "").slice(0, 11) })} /></Field>
                    <Field label="CRECI"><Input value={editing.creci} onChange={(event) => setEditing({ ...editing, creci: event.target.value })} /></Field>
                    <Field label="E-mail profissional"><Input type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></Field>
                    <Field label="Cargo"><Input value={editing.cargo} onChange={(event) => setEditing({ ...editing, cargo: event.target.value })} /></Field>
                    <Field label="Telefone"><Input value={maskPhoneBR(editing.telefone)} onChange={(event) => setEditing({ ...editing, telefone: digitsOnly(event.target.value) })} /></Field>
                    <Field label="WhatsApp"><Input value={maskPhoneBR(editing.whatsapp)} onChange={(event) => setEditing({ ...editing, whatsapp: digitsOnly(event.target.value) })} /></Field>
                    <Field label="Equipe">
                      <Select value={editing.team_id ?? "__none__"} onValueChange={(value) => setEditing({ ...editing, team_id: value === "__none__" ? null : value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="__none__">Sem equipe</SelectItem>{(teams.data ?? []).map((team) => <SelectItem key={team.id} value={team.id}>{team.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select value={editing.status} onValueChange={(value: UserStatus) => setEditing({ ...editing, status: value, ativo: value === "ativo" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{(["ativo", "inativo", "bloqueado", "pendente"] as UserStatus[]).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Biografia"><Textarea rows={5} value={editing.bio} onChange={(event) => setEditing({ ...editing, bio: event.target.value })} /></Field>
                  <div>
                    <Label>Foto profissional</Label>
                    <div className="mt-1 flex items-center gap-3">
                      {editing.foto_url ? <img src={editing.foto_url} alt="Foto do corretor" className="size-16 rounded-full border object-cover" /> : <div className="size-16 rounded-full border bg-muted" />}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                      <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />} Enviar foto</Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={save.isPending || uploading}>Salvar registro</Button>
                </form>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {brokers.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Carregando diretório…</div>
      ) : brokers.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm"><p>Não foi possível carregar o diretório.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void brokers.refetch()}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Contato</TableHead><TableHead>CRECI</TableHead><TableHead>Equipe</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {(brokers.data ?? []).map((broker: any) => (
                <TableRow key={broker.id}>
                  <TableCell><div className="font-medium">{broker.nome} {broker.sobrenome ?? ""}</div><div className="text-xs text-muted-foreground">{broker.cargo ?? "—"}</div>{broker.user_id ? <Badge className="mt-1" variant="outline">membership vinculável</Badge> : null}</TableCell>
                  <TableCell><div>{broker.email ?? "—"}</div><div className="text-xs text-muted-foreground">{broker.telefone ?? broker.whatsapp ?? "—"}</div></TableCell>
                  <TableCell>{broker.creci ?? "—"}</TableCell>
                  <TableCell>{(teams.data ?? []).find((team) => team.id === broker.team_id)?.nome ?? "—"}</TableCell>
                  <TableCell><Badge variant={broker.ativo ? "default" : "secondary"}>{broker.status ?? (broker.ativo ? "ativo" : "inativo")}</Badge></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing({ ...emptyForm(), id: broker.id, nome: broker.nome ?? "", sobrenome: broker.sobrenome ?? "", cpf: broker.cpf ?? "", creci: broker.creci ?? "", email: broker.email ?? "", telefone: broker.telefone ?? "", whatsapp: broker.whatsapp ?? "", cargo: broker.cargo ?? "", bio: broker.bio ?? "", foto_url: broker.foto_url ?? "", ativo: Boolean(broker.ativo), status: broker.status ?? (broker.ativo ? "ativo" : "inativo"), team_id: broker.team_id ?? null, user_id: broker.user_id ?? null }); setOpen(true); }}><Pencil className="size-4" /></Button>{broker.ativo ? <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Arquivar o registro de ${broker.nome}? O login não será removido.`)) archive.mutate(broker.id); }}><Archive className="size-4 text-destructive" /></Button> : null}</div></TableCell>
                </TableRow>
              ))}
              {!brokers.data?.length ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum corretor cadastrado.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
