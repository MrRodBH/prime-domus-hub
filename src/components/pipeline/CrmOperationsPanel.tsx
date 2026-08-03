import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Download, ListTodo, Loader2, Paperclip, Plus, RefreshCw, Save, Search, Tags, Trash2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addTenantLeadNote,
  assignTenantLead,
  createTenantLeadTask,
  findTenantLeadDuplicateCandidates,
  getTenantLeadAggregate,
  listTenantLeadAssignees,
  setTenantLeadTags,
  transitionTenantLeadTask,
  updateTenantLead,
  type CrmLeadAggregateDto,
  type CrmTaskDto,
} from "@/lib/api/tenant-crm.functions";
import { listTenantCrmTags } from "@/lib/api/tenant-crm-management.functions";
import {
  consumeTenantCrmAttachmentUploadTarget,
  deleteTenantCrmAttachment,
  getTenantCrmAttachmentDownloadUrl,
  listTenantCrmAttachments,
} from "@/lib/api/tenant-crm-functional.functions";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { supabase } from "@/integrations/supabase/client";
import { QUALIFICATION_KEYS, TASK_TYPE_KEYS, type QualificationKey, type TaskTypeKey } from "@/lib/crm/crm-registry";

type OperationState =
  | "ready"
  | "dirty"
  | "saving"
  | "saved"
  | "save_failed"
  | "assigning"
  | "assigned"
  | "assignment_failed"
  | "task_creating"
  | "task_open"
  | "task_completing"
  | "task_completed"
  | "task_cancelled"
  | "duplicate_candidate"
  | "merge_review_required"
  | "conflict"
  | "error"
  | "retry_available";

function idempotencyKey(operation: string, resourceId: string): string {
  return `crm:${operation}:${resourceId}:${crypto.randomUUID()}`;
}

function stateLabel(state: OperationState): string {
  const labels: Record<OperationState, string> = {
    ready: "Pronto",
    dirty: "Alterações pendentes",
    saving: "Salvando",
    saved: "Salvo",
    save_failed: "Falha ao salvar",
    assigning: "Atribuindo",
    assigned: "Responsável atualizado",
    assignment_failed: "Falha na atribuição",
    task_creating: "Criando tarefa",
    task_open: "Tarefa aberta",
    task_completing: "Concluindo tarefa",
    task_completed: "Tarefa concluída",
    task_cancelled: "Tarefa cancelada",
    duplicate_candidate: "Possíveis duplicados",
    merge_review_required: "Revisão de merge obrigatória",
    conflict: "Conflito de versão",
    error: "Erro",
    retry_available: "Nova tentativa disponível",
  };
  return labels[state];
}

function errorState(error: unknown): OperationState {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("alterado por outra operação") || message.includes("conflito")
    ? "conflict"
    : "retry_available";
}

export function CrmOperationsPanel({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [operationState, setOperationState] = useState<OperationState>("ready");
  const [qualification, setQualification] = useState<QualificationKey>("nao_qualificado");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("unassigned");
  const [taskType, setTaskType] = useState<TaskTypeKey>("follow_up");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [note, setNote] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [duplicatesEnabled, setDuplicatesEnabled] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const aggregateQuery = useQuery({
    queryKey: ["crm", "lead-aggregate", leadId],
    queryFn: () => getTenantLeadAggregate({ data: { leadId } }),
  });
  const assigneesQuery = useQuery({
    queryKey: ["crm", "assignees"],
    queryFn: () => listTenantLeadAssignees(),
  });
  const tagsQuery = useQuery({
    queryKey: ["crm", "tags"],
    queryFn: () => listTenantCrmTags(),
  });
  const duplicatesQuery = useQuery({
    queryKey: ["crm", "duplicates", leadId],
    queryFn: () => findTenantLeadDuplicateCandidates({ data: { leadId } }),
    enabled: duplicatesEnabled,
  });
  const attachmentsQuery = useQuery({
    queryKey: ["crm", "attachments", leadId],
    queryFn: () => listTenantCrmAttachments({ data: { leadId } }),
  });

  const aggregate = aggregateQuery.data;

  useEffect(() => {
    if (!aggregate) return;
    setQualification(aggregate.lead.qualification_key);
    setAssigneeUserId(aggregate.lead.assigned_to ?? "unassigned");
    setSelectedTagIds(
      aggregate.tags
        .map((tag) => tag.id)
        .filter((value): value is string => typeof value === "string"),
    );
  }, [aggregate]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["crm", "lead-aggregate", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] }),
    ]);
  };

  const qualifyMutation = useMutation({
    mutationFn: async () => {
      if (!aggregate) throw new Error("Aggregate CRM indisponível.");
      setOperationState("saving");
      return updateTenantLead({
        data: {
          id: leadId,
          expected_version: aggregate.rowVersion,
          qualification_key: qualification,
          idempotencyKey: idempotencyKey("qualification", leadId),
        },
      });
    },
    onSuccess: async () => {
      setOperationState("saved");
      toast.success("Qualificação atualizada.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error));
      toast.error(error.message);
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (!aggregate) throw new Error("Aggregate CRM indisponível.");
      setOperationState("assigning");
      return assignTenantLead({
        data: assigneeUserId === "unassigned"
          ? {
              leadId,
              expectedVersion: aggregate.rowVersion,
              strategy: "unassigned",
              reason: "Atribuição atualizada pelo detalhe operacional do CRM.",
              idempotencyKey: idempotencyKey("unassign", leadId),
            }
          : {
              leadId,
              expectedVersion: aggregate.rowVersion,
              strategy: "manual_member",
              assigneeUserId,
              reason: "Atribuição manual pelo detalhe operacional do CRM.",
              idempotencyKey: idempotencyKey("assign", leadId),
            },
      });
    },
    onSuccess: async () => {
      setOperationState("assigned");
      toast.success("Responsável atualizado.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error) === "conflict" ? "conflict" : "assignment_failed");
      toast.error(error.message);
    },
  });

  const taskMutation = useMutation({
    mutationFn: async () => {
      setOperationState("task_creating");
      if (!taskTitle.trim()) throw new Error("Informe o título da tarefa.");
      return createTenantLeadTask({
        data: {
          leadId,
          type: taskType,
          title: taskTitle.trim(),
          dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
          idempotencyKey: idempotencyKey("task", leadId),
        },
      });
    },
    onSuccess: async () => {
      setOperationState("task_open");
      setTaskTitle("");
      setTaskDueAt("");
      toast.success("Tarefa criada.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error));
      toast.error(error.message);
    },
  });

  const taskTransitionMutation = useMutation({
    mutationFn: async ({ task, status }: { task: CrmTaskDto; status: "completed" | "cancelled" | "open" }) => {
      setOperationState(status === "completed" ? "task_completing" : "saving");
      return transitionTenantLeadTask({
        data: {
          taskId: task.id,
          toStatus: status,
          expectedVersion: task.row_version,
          reason: status === "open" ? "Reabertura confirmada pelo usuário." : null,
          idempotencyKey: idempotencyKey(`task-${status}`, task.id),
        },
      });
    },
    onSuccess: async (_data, variables) => {
      setOperationState(variables.status === "completed" ? "task_completed" : variables.status === "cancelled" ? "task_cancelled" : "task_open");
      toast.success("Tarefa atualizada.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error));
      toast.error(error.message);
    },
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      setOperationState("saving");
      return addTenantLeadNote({
        data: {
          leadId,
          note: note.trim(),
          idempotencyKey: idempotencyKey("note", leadId),
        },
      });
    },
    onSuccess: async () => {
      setOperationState("saved");
      setNote("");
      toast.success("Nota adicionada.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error));
      toast.error(error.message);
    },
  });

  const tagsMutation = useMutation({
    mutationFn: async () => {
      if (!aggregate) throw new Error("Aggregate CRM indisponível.");
      setOperationState("saving");
      return setTenantLeadTags({
        data: {
          leadId,
          tagIds: selectedTagIds,
          expectedVersion: aggregate.rowVersion,
          idempotencyKey: idempotencyKey("tags", leadId),
        },
      });
    },
    onSuccess: async () => {
      setOperationState("saved");
      toast.success("Tags atualizadas.");
      await refresh();
    },
    onError: (error: Error) => {
      setOperationState(errorState(error));
      toast.error(error.message);
    },
  });

  const attachmentUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const target = await createUploadTarget({
        data: {
          domain: "crm-attachment",
          entityId: leadId,
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
      });
      const { error } = await supabase.storage.from(target.bucket).upload(target.path, file, { upsert: false });
      if (error) throw error;
      return consumeTenantCrmAttachmentUploadTarget({
        data: {
          leadId,
          uploadTargetId: target.targetId,
          displayName: file.name,
          mimeType: file.type || null,
          size: file.size,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Anexo registrado com provenance server-side.");
      await queryClient.invalidateQueries({ queryKey: ["crm", "attachments", leadId] });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    },
  });

  const attachmentDownloadMutation = useMutation({
    mutationFn: (attachmentId: string) => getTenantCrmAttachmentDownloadUrl({ data: { attachmentId } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error: Error) => toast.error(error.message),
  });

  const attachmentDeleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteTenantCrmAttachment({ data: { attachmentId } }),
    onSuccess: async () => {
      toast.success("Anexo excluído.");
      await queryClient.invalidateQueries({ queryKey: ["crm", "attachments", leadId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const overdueTaskIds = useMemo(() => new Set(
    (aggregate?.tasks ?? [])
      .filter((task) => task.due_at && ["open", "in_progress"].includes(task.status) && new Date(task.due_at).getTime() < Date.now())
      .map((task) => task.id),
  ), [aggregate?.tasks]);

  if (aggregateQuery.isLoading) {
    return <PanelState icon={<Loader2 className="h-4 w-4 animate-spin" />} title="Carregando workflow operacional" state="loading" />;
  }
  if (aggregateQuery.isError) {
    return (
      <PanelState
        icon={<AlertCircle className="h-4 w-4" />}
        title={aggregateQuery.error instanceof Error ? aggregateQuery.error.message : "Falha ao carregar CRM"}
        state="error"
        action={<Button size="sm" variant="outline" onClick={() => aggregateQuery.refetch()}><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</Button>}
      />
    );
  }
  if (!aggregate) {
    return <PanelState icon={<AlertCircle className="h-4 w-4" />} title="Aggregate CRM indisponível" state="empty" />;
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-card" data-crm-state={operationState}>
      <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Operação CRM</h3>
          <p className="text-xs text-muted-foreground">Pipeline, assignment, tarefas, anexos, timeline, tags e diagnósticos.</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {stateLabel(operationState)}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <OperationBlock title="Qualificação" icon={<CheckCircle2 className="h-4 w-4" />}>
            <div className="flex gap-2">
              <Select value={qualification} onValueChange={(value) => { setQualification(value as QualificationKey); setOperationState("dirty"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_KEYS.map((key) => <SelectItem key={key} value={key}>{key.replaceAll("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => qualifyMutation.mutate()} disabled={qualifyMutation.isPending || qualification === aggregate.lead.qualification_key}>
                {qualifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </OperationBlock>

          <OperationBlock title="Responsável" icon={<UserRound className="h-4 w-4" />}>
            <div className="flex gap-2">
              <Select value={assigneeUserId} onValueChange={(value) => { setAssigneeUserId(value); setOperationState("dirty"); }}>
                <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {(assigneesQuery.data ?? []).map((assignee) => (
                    <SelectItem key={assignee.user_id} value={assignee.user_id}>
                      {[assignee.nome, assignee.sobrenome].filter(Boolean).join(" ") || assignee.email || assignee.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => assignmentMutation.mutate()} disabled={assignmentMutation.isPending || assigneeUserId === (aggregate.lead.assigned_to ?? "unassigned")}>
                {assignmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </OperationBlock>

          <OperationBlock title="Nova tarefa" icon={<ListTodo className="h-4 w-4" />}>
            <div className="space-y-2">
              <Select value={taskType} onValueChange={(value) => setTaskType(value as TaskTypeKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_KEYS.map((key) => <SelectItem key={key} value={key}>{key.replaceAll("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Título da tarefa" maxLength={300} />
              <Input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
              <Button size="sm" onClick={() => taskMutation.mutate()} disabled={taskMutation.isPending || !taskTitle.trim()}>
                {taskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Criar tarefa
              </Button>
            </div>
          </OperationBlock>

          <OperationBlock title="Nota" icon={<Plus className="h-4 w-4" />}>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Registrar nota operacional" maxLength={4000} />
            <Button className="mt-2" size="sm" onClick={() => noteMutation.mutate()} disabled={noteMutation.isPending || !note.trim()}>
              {noteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Adicionar nota
            </Button>
          </OperationBlock>
        </div>

        <div className="space-y-4">
          <OperationBlock title="Tarefas" icon={<Clock3 className="h-4 w-4" />}>
            {aggregate.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-crm-state="empty">Nenhuma tarefa.</p>
            ) : (
              <div className="space-y-2">
                {aggregate.tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-foreground/10 p-2" data-crm-state={overdueTaskIds.has(task.id) ? "task_overdue" : task.status === "completed" ? "task_completed" : "task_open"}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="text-[11px] text-muted-foreground">{task.task_type} · {task.status}{task.due_at ? ` · ${new Date(task.due_at).toLocaleString("pt-BR")}` : ""}</div>
                      </div>
                      <div className="flex gap-1">
                        {task.status !== "completed" && task.status !== "cancelled" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => taskTransitionMutation.mutate({ task, status: "completed" })}>Concluir</Button>
                            <Button size="sm" variant="ghost" onClick={() => taskTransitionMutation.mutate({ task, status: "cancelled" })}>Cancelar</Button>
                          </>
                        )}
                        {(task.status === "completed" || task.status === "cancelled") && (
                          <Button size="sm" variant="outline" onClick={() => taskTransitionMutation.mutate({ task, status: "open" })}>Reabrir</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OperationBlock>

          <OperationBlock title="Anexos" icon={<Paperclip className="h-4 w-4" />}>
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) attachmentUploadMutation.mutate(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={attachmentUploadMutation.isPending}
            >
              {attachmentUploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enviar anexo
            </Button>
            {attachmentsQuery.isPending ? (
              <p className="mt-2 text-xs text-muted-foreground">Carregando anexos…</p>
            ) : attachmentsQuery.isError ? (
              <p className="mt-2 text-xs text-destructive">Falha ao carregar anexos.</p>
            ) : (attachmentsQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground" data-crm-state="empty">Nenhum anexo.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {(attachmentsQuery.data ?? []).map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 p-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{attachment.display_name}</div>
                      <div className="text-[11px] text-muted-foreground">{attachment.mime_type ?? "arquivo"} · {Number(attachment.size ?? 0).toLocaleString("pt-BR")} bytes</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => attachmentDownloadMutation.mutate(attachment.id)} disabled={attachmentDownloadMutation.isPending}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => attachmentDeleteMutation.mutate(attachment.id)} disabled={attachmentDeleteMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OperationBlock>

          <OperationBlock title="Tags" icon={<Tags className="h-4 w-4" />}>
            {(tagsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tag ativa no catálogo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(tagsQuery.data ?? []).map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <Button
                      key={tag.id}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => {
                        setSelectedTagIds((current) => active ? current.filter((id) => id !== tag.id) : [...current, tag.id]);
                        setOperationState("dirty");
                      }}
                    >
                      {tag.name}
                    </Button>
                  );
                })}
              </div>
            )}
            <Button className="mt-2" size="sm" variant="outline" onClick={() => tagsMutation.mutate()} disabled={tagsMutation.isPending}>
              {tagsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar tags
            </Button>
          </OperationBlock>

          <OperationBlock title="Duplicidade" icon={<Search className="h-4 w-4" />}>
            <Button size="sm" variant="outline" onClick={() => setDuplicatesEnabled(true)} disabled={duplicatesQuery.isFetching}>
              {duplicatesQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Verificar duplicados
            </Button>
            {duplicatesQuery.data && (
              <div className="mt-2" data-crm-state={duplicatesQuery.data.candidates.length > 0 ? "merge_review_required" : "ready"}>
                {duplicatesQuery.data.candidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum candidato exato por e-mail ou telefone.</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-amber-700">{duplicatesQuery.data.candidates.length} candidato(s). Merge automático está desabilitado.</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {duplicatesQuery.data.candidates.map((candidate, index) => (
                        <li key={typeof candidate.id === "string" ? candidate.id : index}>
                          {typeof candidate.nome === "string" ? candidate.nome : "Lead"} — revisão explícita obrigatória
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </OperationBlock>

          <OperationBlock title="Timeline recente" icon={<Clock3 className="h-4 w-4" />}>
            {aggregate.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum evento canônico registrado após o cutover.</p>
            ) : (
              <ol className="space-y-2">
                {aggregate.activities.slice(0, 10).map((activity, index) => (
                  <li key={typeof activity.id === "string" ? activity.id : index} className="border-l-2 border-primary/30 pl-2 text-xs">
                    <div className="font-medium">{typeof activity.event_type === "string" ? activity.event_type : "evento"}</div>
                    <div className="text-muted-foreground">{typeof activity.created_at === "string" ? new Date(activity.created_at).toLocaleString("pt-BR") : ""}</div>
                  </li>
                ))}
              </ol>
            )}
          </OperationBlock>
        </div>
      </div>
    </section>
  );
}

function OperationBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-foreground/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function PanelState({ icon, title, state, action }: { icon: React.ReactNode; title: string; state: "loading" | "empty" | "error"; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/10 bg-card p-4" data-crm-state={state}>
      <div className="flex items-center gap-2 text-sm">{icon}{title}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
