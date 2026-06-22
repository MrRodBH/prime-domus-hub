import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListarCorretores,
  adminSalvarCorretor,
  adminExcluirCorretor,
  adminAssinarUrl,
  adminCriarUsuarioComLogin,
  adminAtualizarPapeis,
  adminListarPapeisPorUsuario,
} from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/corretores")({
  component: AdminUsuarios,
});

type Role = "admin" | "corretor" | "secretaria";
const ROLE_LABEL: Record<Role, string> = { admin: "Admin", corretor: "Corretor", secretaria: "Secretaria" };
const ALL_ROLES: Role[] = ["admin", "corretor", "secretaria"];

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Corretor = any;

type Editing = Corretor & {
  email_login?: string;
  password?: string;
  roles?: Role[];
  _slugTouched?: boolean;
};

function emptyEditing(): Editing {
  return {
    nome: "",
    slug: "",
    creci: "",
    email: "",
    telefone: "",
    whatsapp: "",
    cargo: "",
    bio: "",
    foto_url: "",
    ativo: true,
    email_login: "",
    password: "",
    roles: ["corretor"],
    _slugTouched: false,
  };
}

function AdminUsuarios() {
  const qc = useQueryClient();
  const { data: corretores } = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const { data: papeis } = useQuery({ queryKey: ["admin", "user-roles"], queryFn: () => adminListarPapeisPorUsuario() });
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

  const criarComLogin = useMutation({
    mutationFn: (e: Editing) =>
      adminCriarUsuarioComLogin({
        data: {
          corretor_id: e.id,
          nome: e.nome,
          slug: e.slug,
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
        const { email_login: _e, password: _p, roles: _r, _slugTouched: _st, ...rest } = e;
        void _e; void _p; void _r; void _st;
        await salvarSemLogin.mutateAsync(rest);
        if (e.user_id && e.roles && e.roles.length > 0) {
          await atualizarPapeis.mutateAsync({ user_id: e.user_id, roles: e.roles });
        }
        toast.success("Salvo");
      } else {
        const { email_login: _e, password: _p, roles: _r, _slugTouched: _st, ...rest } = e;
        void _e; void _p; void _r; void _st;
        await salvarSemLogin.mutateAsync(rest);
        toast.success("Salvo");
      }
      qc.invalidateQueries({ queryKey: ["admin", "corretores"] });
      qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
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
    const next = current.includes(role) ? current.filter((r: Role) => r !== role) : [...current, role];
    setEditing({ ...editing, roles: next });
  }

  const isPending = criarComLogin.isPending || salvarSemLogin.isPending || atualizarPapeis.isPending;

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
                      onChange={(e) => {
                        const nome = e.target.value;
                        const next: Editing = { ...editing, nome };
                        if (!editing._slugTouched) next.slug = slugify(nome);
                        setEditing(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input
                      required
                      value={editing.slug}
                      onChange={(e) =>
                        setEditing({ ...editing, slug: slugify(e.target.value), _slugTouched: true })
                      }
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
                  <div className="md:col-span-2">
                    <Label>WhatsApp</Label>
                    <Input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="5531999990000" />
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
                        <Input
                          type="text"
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
                </div>

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
              <TableHead>E-mail</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {corretores?.map((c) => {
              const userRoles = c.user_id ? rolesByUser.get(c.user_id) ?? [] : [];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
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
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.whatsapp}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...c, roles: userRoles.length > 0 ? userRoles : ["corretor"] });
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
