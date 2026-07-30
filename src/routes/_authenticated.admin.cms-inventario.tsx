import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Blocks, CalendarClock, FileCheck2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getTenantCmsFunctionalInventory,
  listTenantCmsPublicationSchedules,
  listTenantCmsReusableBlocks,
  listTenantCmsTestimonials,
  saveTenantCmsReusableBlock,
  saveTenantCmsTestimonial,
  validateTenantCmsFunctionalComponent,
} from "@/lib/api/tenant-cms-functional.functions";

export const Route = createFileRoute("/_authenticated/admin/cms-inventario")({
  component: CmsFunctionalInventoryPage,
});

function CmsFunctionalInventoryPage() {
  const queryClient = useQueryClient();
  const [testimonialAuthor, setTestimonialAuthor] = useState("");
  const [testimonialContent, setTestimonialContent] = useState("");
  const [blockKey, setBlockKey] = useState("institutional-highlight");
  const [blockName, setBlockName] = useState("Destaque institucional");
  const [blockContent, setBlockContent] = useState('{"title":"Título","description":"Conteúdo reutilizável"}');
  const [validationKey, setValidationKey] = useState("cards");
  const [validationValue, setValidationValue] = useState('{"title":"Cards","cards":[{"title":"Exemplo"}],"columns":"3"}');
  const [validationResult, setValidationResult] = useState("");

  const inventory = useQuery({ queryKey: ["cms-functional", "inventory"], queryFn: () => getTenantCmsFunctionalInventory() });
  const testimonials = useQuery({ queryKey: ["cms-functional", "testimonials"], queryFn: () => listTenantCmsTestimonials() });
  const blocks = useQuery({ queryKey: ["cms-functional", "blocks"], queryFn: () => listTenantCmsReusableBlocks() });
  const schedules = useQuery({ queryKey: ["cms-functional", "schedules"], queryFn: () => listTenantCmsPublicationSchedules() });
  const queries = [inventory, testimonials, blocks, schedules];
  const loading = queries.some((query) => query.isLoading);
  const failed = queries.find((query) => query.isError);
  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ["cms-functional"] });

  const createTestimonial = useMutation({
    mutationFn: () => saveTenantCmsTestimonial({ data: {
      authorName: testimonialAuthor,
      authorRole: null,
      content: testimonialContent,
      mediaId: null,
      rating: null,
      active: true,
    } }),
    onSuccess: async () => {
      setTestimonialAuthor(""); setTestimonialContent("");
      await invalidate();
      toast.success("Depoimento salvo no registry CMS.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createBlock = useMutation({
    mutationFn: () => saveTenantCmsReusableBlock({ data: {
      blockKey,
      name: blockName,
      revision: ((blocks.data ?? []).filter((row: any) => row.block_key === blockKey).reduce((max: number, row: any) => Math.max(max, Number(row.revision)), 0)) + 1,
      status: "draft",
      content: JSON.parse(blockContent),
    } }),
    onSuccess: async () => { await invalidate(); toast.success("Nova revisão imutável criada."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const validateComponent = useMutation({
    mutationFn: () => validateTenantCmsFunctionalComponent({ data: { key: validationKey as any, value: JSON.parse(validationValue) } }),
    onSuccess: (result) => setValidationResult(JSON.stringify(result, null, 2)),
    onError: (error: Error) => setValidationResult(error.message),
  });

  if (loading) return <State title="Carregando inventário CMS" icon={<Loader2 className="size-5 animate-spin" />} />;
  if (failed) return <State title="Inventário CMS indisponível" description={failed.error instanceof Error ? failed.error.message : "Falha segura."} icon={<ShieldCheck className="size-5" />} action={<Button onClick={() => void invalidate()}><RefreshCw className="mr-2 size-4" />Tentar novamente</Button>} />;

  const data = inventory.data!;
  return (
    <div className="mx-auto max-w-[1450px] space-y-6 pb-12">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CMS Functional Inventory</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Componentes fechados, preview validado, publicação atômica ou agendada e rendering público Host-derived.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.componentKeys.length} componentes</Badge>
          <Badge variant="outline">schema v2</Badge>
          <Badge variant="outline">tenant code=false</Badge>
          <Button size="sm" variant="outline" onClick={() => void invalidate()}><RefreshCw className="mr-2 size-4" />Atualizar</Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Componentes" value={data.componentKeys.length} icon={<Blocks className="size-4" />} />
        <Metric label="Depoimentos" value={(testimonials.data ?? []).length} icon={<FileCheck2 className="size-4" />} />
        <Metric label="Blocos reutilizáveis" value={(blocks.data ?? []).length} icon={<Blocks className="size-4" />} />
        <Metric label="Agendamentos" value={(schedules.data ?? []).length} icon={<CalendarClock className="size-4" />} />
      </section>

      <Tabs defaultValue="registry">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="validation">Validação e preview</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
          <TabsTrigger value="blocks">Blocos reutilizáveis</TabsTrigger>
          <TabsTrigger value="schedules">Publicação agendada</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.components.map((component: any) => (
              <Card key={component.key}>
                <CardHeader><CardTitle className="font-mono text-sm">{component.key}</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <Line label="Schema" value={`v${component.schemaVersion}`} />
                  <Line label="Responsivo" value={component.responsiveContract} />
                  <Line label="Preview" value={component.previewContract} />
                  <Line label="Publicação" value={component.publicationContract} />
                  <Line label="Permissão" value={`${component.permissionContract.module}:${component.permissionContract.publishAction}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="validation" className="grid gap-4 pt-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Validar componente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Key</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={validationKey} onChange={(event) => setValidationKey(event.target.value)}>{data.componentKeys.map((key: string) => <option key={key}>{key}</option>)}</select></div>
              <div className="space-y-2"><Label>Configuração JSON</Label><Textarea className="min-h-72 font-mono text-xs" value={validationValue} onChange={(event) => setValidationValue(event.target.value)} /></div>
              <Button disabled={validateComponent.isPending} onClick={() => validateComponent.mutate()}>Validar no servidor</Button>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Resultado</CardTitle></CardHeader><CardContent><Textarea className="min-h-[400px] font-mono text-xs" readOnly value={validationResult} placeholder="Resultado da validação e tenant-reference checks." /></CardContent></Card>
        </TabsContent>

        <TabsContent value="testimonials" className="grid gap-4 pt-4 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader><CardTitle>Novo depoimento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Autor" value={testimonialAuthor} onChange={setTestimonialAuthor} />
              <div className="space-y-2"><Label>Conteúdo</Label><Textarea value={testimonialContent} onChange={(event) => setTestimonialContent(event.target.value)} /></div>
              <Button className="w-full" disabled={!testimonialAuthor.trim() || !testimonialContent.trim() || createTestimonial.isPending} onClick={() => createTestimonial.mutate()}>Salvar depoimento</Button>
            </CardContent>
          </Card>
          <RecordList rows={(testimonials.data ?? []).map((row: any) => ({ id: row.id, title: row.author_name, state: row.active ? "active" : "inactive", detail: row.content }))} empty="Nenhum depoimento." />
        </TabsContent>

        <TabsContent value="blocks" className="grid gap-4 pt-4 xl:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader><CardTitle>Nova revisão de bloco</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Block key" value={blockKey} onChange={setBlockKey} />
              <Field label="Nome" value={blockName} onChange={setBlockName} />
              <div className="space-y-2"><Label>Conteúdo JSON</Label><Textarea className="min-h-52 font-mono text-xs" value={blockContent} onChange={(event) => setBlockContent(event.target.value)} /></div>
              <Button className="w-full" disabled={createBlock.isPending} onClick={() => createBlock.mutate()}>Criar revisão draft</Button>
            </CardContent>
          </Card>
          <RecordList rows={(blocks.data ?? []).map((row: any) => ({ id: row.id, title: `${row.block_key} · r${row.revision}`, state: row.status, detail: row.content_hash }))} empty="Nenhum bloco reutilizável." />
        </TabsContent>

        <TabsContent value="schedules" className="pt-4">
          <RecordList rows={(schedules.data ?? []).map((row: any) => ({ id: row.id, title: `${row.page_id} · r${row.revision}`, state: row.state, detail: `${row.publish_at} · ${row.timezone}` }))} empty="Nenhuma publicação agendada." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="max-w-[65%] text-right font-mono">{value}</span></div>;
}
function RecordList({ rows, empty }: { rows: Array<{ id: string; title: string; state: string; detail: string }>; empty: string }) {
  return <Card><CardContent className="space-y-2 pt-6">{rows.map((row) => <div key={row.id} className="rounded-md border px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm font-medium">{row.title}</span><Badge variant="outline">{row.state}</Badge></div><div className="mt-1 truncate text-xs text-muted-foreground">{row.detail}</div></div>)}{rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p> : null}</CardContent></Card>;
}
function State({ title, description, icon, action }: { title: string; description?: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-8 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">{icon}</div><h1 className="mt-4 text-lg font-semibold">{title}</h1>{description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}
