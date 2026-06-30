import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListarCorretores,
  adminSalvarCorretor,
  adminExcluirCorretor,
  adminAssinarUrl,
  adminCriarUsuarioComLogin,
  adminDefinirPerfilUsuario,
  adminAlterarSenhaUsuario,
} from "@/lib/api/admin.functions";
import { listarEquipes, listarPerfis, listarPerfisPorUsuario } from "@/lib/api/rbac.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { maskPhoneBR, digitsOnly } from "@/lib/phone-br";

export const Route = createFileRoute("/_authenticated/admin/corretores")({
  component: AdminUsuarios,
});

type UserStatus = "ativo" | "inativo" | "bloqueado" | "pendente";
const STATUS_LABEL: Record<UserStatus, string> = {
  ativo: "Ativo", inativo: "Inativo", bloqueado: "Bloqueado", pendente: "Pendente",
};
const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ativo: "default", inativo: "secondary", bloqueado: "destructive", pendente: "outline",
};

const SOBRENOME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,40}$/;
function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Corretor = any;

type Editing = Corretor & {
  email_login?: string;
  password?: string;
  profile_id?: string;
};

function emptyEditing(): Editing {
  return {
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
    status: "ativo" as UserStatus,
    team_id: null,
    email_login: "",
    password: "",
    profile_id: "",
  };
}




function AdminUsuarios() {
  const qc = useQueryClient();
  const { data: corretores } = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const { data: papeis } = useQuery({ queryKey: ["admin", "user-roles"], queryFn: () => adminListarPapeisPorUsuario() });
  const { data: equipes } = useQuery({ queryKey: ["rbac", "equipes"], queryFn: () => listarEquipes() });
  const { data: perfis } = useQuery({ queryKey: ["rbac", "perfis"], queryFn: () => listarPerfis() });
  const { data: perfisUsuarios } = useQuery({ queryKey: ["rbac", "perfis-usuarios"], queryFn: () => listarPerfisPorUsuario() });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, Role[]>();
    (papeis ?? []).forEach((r) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      map.set(r.user_id, arr);
    });
    return map;
  }, [papeis]);

  const customProfilesByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (perfisUsuarios ?? []).forEach((r: any) => {
      if (!r.rbac_profiles || r.rbac_profiles.sistema) return;
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.rbac_profiles.id);
      map.set(r.user_id, arr);
    });
    return map;
  }, [perfisUsuarios]);

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    (equipes ?? []).forEach((t) => m.set(t.id, t.nome));
    return m;
  }, [equipes]);

  const customProfiles = useMemo(
    () => (perfis ?? []).filter((p) => !p.sistema),
    [perfis],
  );

  const criarComLogin = useMutation({
    mutationFn: (e: Editing) =>
      adminCriarUsuarioComLogin({
        data: {
          corretor_id: e.id,
          nome: e.nome,
          sobrenome: e.sobrenome || null,
          email: e.email_login!,
          password: e.password!,
          telefone: e.telefone,
          whatsapp: e.whatsapp,
          creci: e.creci,
          cargo: e.cargo,
          foto_url: e.foto_url,
          bio: e.bio,
          roles: (e.roles ?? ["corretor"]) as Role[],
        },
      }),
  });


  const atualizarPapeis = useMutation({
    mutationFn: (args: { user_id: string; roles: Role[] }) => adminAtualizarPapeis({ data: args }),
  });

  const atualizarPerfisCustom = useMutation({
    mutationFn: (args: { user_id: string; profile_ids: string[] }) => setUserPerfisCustom({ data: args }),
  });

  const salvarSemLogin = useMutation({
    mutationFn: (c: Corretor) => adminSalvarCorretor({ data: c }),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirCorretor({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["admin", "corretores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  async function salvar(e: Editing) {
    try {
      if (e.sobrenome && !SOBRENOME_RE.test(e.sobrenome.trim())) {
        throw new Error("Sobrenome inválido: use apenas letras e somente um sobrenome.");
      }
      const isNew = !e.id;
      const wantsLogin = !!e.email_login;
      if (isNew && wantsLogin) {
        if (!e.password || e.password.length < 6) throw new Error("Defina uma senha de pelo menos 6 caracteres");
        const res = await criarComLogin.mutateAsync(e);
        toast.success(
          res?.email_sent
            ? "Usuário criado. E-mail para definir senha enviado."
            : "Usuário criado. (Não foi possível enviar o e-mail de senha — verifique a configuração de e-mail.)",
        );
      } else if (!isNew) {
        const { email_login: _e, password: _p, roles: _r, custom_profile_ids: _cp, ...rest } = e;
        void _e; void _p; void _r; void _cp;
        await salvarSemLogin.mutateAsync(rest);
        if (e.user_id && e.roles && e.roles.length > 0) {
          await atualizarPapeis.mutateAsync({ user_id: e.user_id, roles: e.roles });
        }
        if (e.user_id) {
          await atualizarPerfisCustom.mutateAsync({
            user_id: e.user_id,
            profile_ids: e.custom_profile_ids ?? [],
          });
        }
        toast.success("Salvo");
      } else {
        const { email_login: _e, password: _p, roles: _r, custom_profile_ids: _cp, ...rest } = e;
        void _e; void _p; void _r; void _cp;
        await salvarSemLogin.mutateAsync(rest);
        toast.success("Salvo");
      }
      qc.invalidateQueries({ queryKey: ["admin", "corretores"] });
      qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
      qc.invalidateQueries({ queryKey: ["rbac", "perfis-usuarios"] });
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }

  }


  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const sanitized = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `corretores/${crypto.randomUUID().slice(0, 8)}-${sanitized}`;
      const { error: upErr } = await supabase.storage.from("site").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path, width: 600, quality: 85 } });
      setEditing({ ...editing, foto_url: url });
      toast.success("Foto enviada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleRole(role: Role) {
    if (!editing) return;
    const current: Role[] = (editing.roles ?? []) as Role[];
    let next: Role[];
    if (current.includes(role)) {
      next = current.filter((r: Role) => r !== role);
    } else {
      // Hierarquia: Secretaria não pode coexistir com Admin/Corretor.
      // Admin + Corretor é permitido.
      if (role === "secretaria") {
        next = ["secretaria"];
      } else {
        next = [...current.filter((r) => r !== "secretaria"), role];
      }
    }
    if (next.length === 0) next = [role];
    setEditing({ ...editing, roles: next });
  }

  const isPending = criarComLogin.isPending || salvarSemLogin.isPending || atualizarPapeis.isPending || atualizarPerfisCustom.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(emptyEditing());
                setOpen(true);
              }}
            >
              <Plus className="size-4 mr-1" /> Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  salvar(editing);
                }}
                className="space-y-4"
              >
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      required
                      value={editing.nome}
                      onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sobrenome *</Label>
                    <Input
                      required
                      value={editing.sobrenome ?? ""}
                      maxLength={40}
                      onChange={(e) => {
                        // permite apenas um sobrenome (sem espaços) e somente letras
                        const v = e.target.value.replace(/\s+/g, "").replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’-]/g, "");
                        setEditing({ ...editing, sobrenome: v });
                      }}
                      placeholder="Apenas um sobrenome"
                    />
                    {editing.sobrenome && !SOBRENOME_RE.test(editing.sobrenome) && (
                      <p className="text-xs text-destructive mt-1">Apenas letras, 2 a 40 caracteres, um único sobrenome.</p>
                    )}
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={maskCPF(editing.cpf ?? "")}
                      onChange={(e) => setEditing({ ...editing, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <Label>CRECI</Label>
                    <Input value={editing.creci ?? ""} onChange={(e) => setEditing({ ...editing, creci: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input value={editing.cargo ?? ""} onChange={(e) => setEditing({ ...editing, cargo: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={(editing.status as UserStatus) ?? "ativo"}
                      onValueChange={(v) => setEditing({ ...editing, status: v as UserStatus })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["ativo","inativo","bloqueado","pendente"] as UserStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Equipe</Label>
                    <Select
                      value={editing.team_id ?? "__none__"}
                      onValueChange={(v) => setEditing({ ...editing, team_id: v === "__none__" ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Sem equipe"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— sem equipe —</SelectItem>
                        {(equipes ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>WhatsApp / Celular</Label>
                    <Input
                      value={maskPhoneBR(editing.whatsapp ?? "")}
                      onChange={(e) => {
                        const d = digitsOnly(e.target.value).slice(0, 11);
                        setEditing({ ...editing, whatsapp: d });
                      }}
                      placeholder="(31) 98888-7777"
                      inputMode="tel"
                    />
                    {(() => {
                      const d = digitsOnly(editing.whatsapp ?? "");
                      if (d.length === 0) {
                        return (
                          <p className="text-xs text-muted-foreground mt-1">
                            Apenas celular com 11 dígitos. Ex.: (31) 98888-7777
                          </p>
                        );
                      }
                      const ok = d.length === 11 && d[2] === "9";
                      return (
                        <p className={`text-xs mt-1 ${ok ? "text-emerald-600" : "text-destructive"}`}>
                          {ok
                            ? "Celular válido."
                            : "Informe um celular com 11 dígitos começando com 9 após o DDD."}
                        </p>
                      );
                    })()}
                  </div>

                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Acesso ao sistema</h3>
                    {editing.user_id && <Badge variant="outline">Login já cadastrado</Badge>}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>E-mail de login {!editing.id && "*"}</Label>
                      <Input
                        type="email"
                        required={!editing.id}
                        disabled={!!editing.id}
                        value={editing.email_login ?? editing.email ?? ""}
                        onChange={(e) => setEditing({ ...editing, email_login: e.target.value, email: e.target.value })}
                        placeholder="usuario@exemplo.com"
                      />
                    </div>
                    {!editing.id && (
                      <div>
                        <Label>Senha provisória *</Label>
                        <PasswordInput
                          required
                          minLength={6}
                          value={editing.password ?? ""}
                          onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                          placeholder="mínimo 6 caracteres"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">Tipo de usuário *</Label>
                    <div className="flex flex-wrap gap-4">
                      {ALL_ROLES.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={(editing.roles ?? []).includes(r)}
                            onCheckedChange={() => toggleRole(r)}
                          />
                          <span className="text-sm">{ROLE_LABEL[r]}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Qualquer tipo pode também ser Admin (basta marcar os dois).
                    </p>
                  </div>

                  {editing.user_id && customProfiles.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Perfis personalizados</Label>
                      <div className="flex flex-wrap gap-3">
                        {customProfiles.map((p) => {
                          const checked = (editing.custom_profile_ids ?? []).includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const cur = editing.custom_profile_ids ?? [];
                                  setEditing({
                                    ...editing,
                                    custom_profile_ids: v ? [...cur, p.id] : cur.filter((x: string) => x !== p.id),
                                  });
                                }}
                              />
                              <span className="text-sm">{p.nome}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Perfis criados em <strong>Perfis & Permissões</strong>. Somam-se ao tipo principal.
                      </p>
                    </div>
                  )}
                </div>


                {editing.user_id && (
                  <ChangePasswordBlock userId={editing.user_id} email={editing.email ?? editing.email_login ?? ""} />
                )}



                <div className="space-y-2 border-t pt-4">
                  <Label>Foto</Label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" />
                  <div className="flex items-center gap-3">
                    {editing.foto_url ? (
                      <div className="relative">
                        <img src={editing.foto_url} alt="" className="size-20 rounded-full object-cover border" />
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, foto_url: "" })}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="size-20 rounded-full bg-muted border" />
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
                      {editing.foto_url ? "Trocar foto" : "Enviar foto"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Bio</Label>
                  <Textarea value={editing.bio ?? ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {corretores?.map((c) => {
              const userRoles = c.user_id ? rolesByUser.get(c.user_id) ?? [] : [];
              const status = (c.status ?? "ativo") as UserStatus;
              const teamNome = c.team_id ? teamNameById.get(c.team_id) ?? "—" : "—";
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{[c.nome, c.sobrenome].filter(Boolean).join(" ")}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">sem login</Badge>
                      ) : (
                        userRoles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                            {ROLE_LABEL[r]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{teamNome}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.whatsapp}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const customIds = c.user_id ? customProfilesByUser.get(c.user_id) ?? [] : [];
                        setEditing({
                          ...c,
                          roles: userRoles.length > 0 ? userRoles : ["corretor"],
                          custom_profile_ids: customIds,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) excluir.mutate(c.id); }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ChangePasswordBlock({ userId, email }: { userId: string; email: string }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const mut = useMutation({
    mutationFn: (new_password: string) =>
      adminAlterarSenhaUsuario({ data: { user_id: userId, new_password } }),
    onSuccess: (res) => {
      setPw1("");
      setPw2("");
      toast.success(
        res?.email_sent
          ? "Senha alterada. E-mail de notificação enviado ao usuário."
          : "Senha alterada. (Não foi possível enviar o e-mail informativo.)",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const minLen = 6;
  const valid = pw1.length >= minLen && pw1 === pw2;
  const mismatch = pw2.length > 0 && pw1 !== pw2;

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Alterar senha</h3>
        {email && <span className="text-xs text-muted-foreground">{email}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        A nova senha é gravada imediatamente, sem envio de e-mail de validação. O
        usuário receberá um e-mail informativo sobre a alteração.
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Nova senha</Label>
          <PasswordInput
            value={pw1}
            minLength={minLen}
            onChange={(e) => setPw1(e.target.value)}
            placeholder={`mínimo ${minLen} caracteres`}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label>Confirmar nova senha</Label>
          <PasswordInput
            value={pw2}
            minLength={minLen}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="repita a nova senha"
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="text-xs text-destructive mt-1">As senhas não conferem.</p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!valid || mut.isPending}
        onClick={() => mut.mutate(pw1)}
      >
        {mut.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
        Alterar senha
      </Button>
    </div>
  );
}

