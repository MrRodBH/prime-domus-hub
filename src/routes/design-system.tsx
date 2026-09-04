import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Building2, Check, Globe2, Info, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PALETA_GRAFICOS, origemDosLeads } from "@/components/demo/demo-data";

export const Route = createFileRoute("/design-system")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Padrões visuais — Real One" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PaginaDePadroesVisuais,
});

const cores = [
  { nome: "Petróleo", uso: "Navegação e ações principais", valor: "#123F47" },
  { nome: "Dourado", uso: "Destaques e atenção", valor: "#D6A84B" },
  { nome: "Violeta", uso: "Inteligência artificial", valor: PALETA_GRAFICOS.violeta },
  { nome: "Coral", uso: "Campanhas e conversão", valor: PALETA_GRAFICOS.coral },
  { nome: "Esmeralda", uso: "Sucesso e crescimento", valor: PALETA_GRAFICOS.esmeralda },
  { nome: "Azul-céu", uso: "Informação e visitas", valor: PALETA_GRAFICOS.azulCeu },
];

function PaginaDePadroesVisuais() {
  return (
    <main className="min-h-dvh bg-[#f6f4ef] text-[#123f47]">
      <header className="sticky top-0 z-30 border-b border-[#123f47]/10 bg-[#fbfaf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/demonstracao">
              <ArrowLeft className="mr-2 size-4" />
              Voltar à demonstração
            </Link>
          </Button>
          <Badge className="ml-auto bg-[#123f47] text-white hover:bg-[#123f47]">
            Versão para homologação
          </Badge>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a56f19]">
            Biblioteca da interface
          </p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Padrões visuais da Real One</h1>
          <p className="mt-4 text-base leading-7 text-[#587076]">
            Referência viva para revisar cores, textos, campos, componentes, gráficos e
            comportamento responsivo da plataforma e das experiências personalizadas de cada
            empresa.
          </p>
        </div>

        <Secao
          titulo="Plataforma e empresa cliente"
          descricao="A identidade do produto permanece separada da marca, do domínio e dos dados de cada cliente."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-[#123f47]/10">
              <CardContent className="flex h-full flex-col p-6">
                <span className="flex size-12 items-center justify-center rounded-xl bg-[#123f47] text-white">
                  <Globe2 className="size-5" />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a56f19]">
                  Produto SaaS
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Real One</h3>
                <p className="mt-2 text-sm leading-6 text-[#587076]">
                  Interface central, acesso da equipe e operação de múltiplas empresas.
                </p>
                <div className="mt-5 rounded-xl bg-[#f6f4ef] p-4">
                  <span className="block text-xs text-[#587076]">Domínio da plataforma</span>
                  <code className="mt-1 block font-semibold text-[#123f47]">realone.com.br</code>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden rounded-2xl border-[#d6a84b]/30">
              <CardContent className="flex h-full flex-col p-6">
                <span className="flex size-12 items-center justify-center rounded-xl bg-[#d6a84b] text-[#123f47]">
                  <Building2 className="size-5" />
                </span>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a56f19]">
                    Primeira empresa cliente
                  </p>
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                    Representação sintética
                  </Badge>
                </div>
                <h3 className="mt-2 text-2xl font-semibold">RM Prime Imóveis</h3>
                <p className="mt-2 text-sm leading-6 text-[#587076]">
                  Marca, site, domínio e cadastros isolados do cliente dentro da Real One.
                </p>
                <div className="mt-5 rounded-xl bg-[#f6f4ef] p-4">
                  <span className="block text-xs text-[#587076]">Domínio da primeira empresa</span>
                  <code className="mt-1 block font-semibold text-[#123f47]">
                    rmprimeimoveis.com.br
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </Secao>

        <Secao
          titulo="Cores da plataforma"
          descricao="A paleta combina identidade premium com cores funcionais distintas. Gráficos não dependem apenas de tons de azul."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cores.map((cor) => (
              <Card key={cor.nome} className="overflow-hidden rounded-2xl border-[#123f47]/10">
                <div className="h-24" style={{ backgroundColor: cor.valor }} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <strong>{cor.nome}</strong>
                    <code className="text-xs text-[#587076]">{cor.valor}</code>
                  </div>
                  <p className="mt-1 text-xs text-[#587076]">{cor.uso}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Secao>

        <Secao
          titulo="Tipografia e hierarquia"
          descricao="Títulos diferenciam áreas importantes; textos de apoio permanecem diretos e legíveis."
        >
          <Card className="rounded-2xl border-[#123f47]/10">
            <CardContent className="space-y-5 p-6">
              <div>
                <span className="text-xs text-[#587076]">Título principal</span>
                <h2 className="mt-1 text-4xl font-semibold">Resultados que orientam decisões.</h2>
              </div>
              <div>
                <span className="text-xs text-[#587076]">Título de seção</span>
                <h3 className="mt-1 text-2xl font-semibold">Desempenho das campanhas</h3>
              </div>
              <div>
                <span className="text-xs text-[#587076]">Texto de conteúdo</span>
                <p className="mt-1 max-w-3xl text-sm leading-6">
                  Cada campo explica o que deve ser informado e como a informação será utilizada.
                  Siglas técnicas recebem contexto sempre que aparecem.
                </p>
              </div>
            </CardContent>
          </Card>
        </Secao>

        <Secao
          titulo="Campos e ações"
          descricao="Os rótulos ficam sempre visíveis, em português e associados ao campo correspondente."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-2xl border-[#123f47]/10">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="nome-contato">Nome completo do contato</Label>
                  <Input id="nome-contato" placeholder="Ex.: Mariana Alves" />
                  <p className="text-xs text-[#587076]">
                    Utilizado para identificar o lead no atendimento.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem-contato">Origem da oportunidade</Label>
                  <Input id="origem-contato" placeholder="Ex.: Campanha Coberturas em BH" />
                  <p className="text-xs text-[#587076]">
                    Informe a campanha, portal ou canal que trouxe o contato.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-[#123f47] hover:bg-[#0b3036]">Salvar contato</Button>
                  <Button variant="outline">Cancelar</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#123f47]/10">
              <CardHeader>
                <CardTitle className="text-lg">Preferências da experiência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f7f5f0] p-4">
                  <span>
                    <strong className="block text-sm">Receber alertas de novos leads</strong>
                    <span className="mt-1 block text-xs text-[#587076]">
                      Notifica a equipe quando um contato chega.
                    </span>
                  </span>
                  <Switch defaultChecked aria-label="Receber alertas de novos leads" />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f7f5f0] p-4">
                  <span>
                    <strong className="block text-sm">Exibir recomendações da IA</strong>
                    <span className="mt-1 block text-xs text-[#587076]">
                      Mostra prioridades calculadas para a operação.
                    </span>
                  </span>
                  <Switch
                    defaultChecked
                    aria-label="Exibir recomendações da inteligência artificial"
                  />
                </label>
              </CardContent>
            </Card>
          </div>
        </Secao>

        <Secao
          titulo="Estados e mensagens"
          descricao="Cor, ícone e texto trabalham juntos para que nenhuma informação dependa apenas da percepção de cor."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Mensagem
              icone={Check}
              titulo="Configuração concluída"
              texto="O canal está pronto para receber dados de demonstração."
              classes="border-emerald-200 bg-emerald-50 text-emerald-950"
            />
            <Mensagem
              icone={Info}
              titulo="Ação necessária"
              texto="Adicione uma identificação pública antes de continuar."
              classes="border-sky-200 bg-sky-50 text-sky-950"
            />
            <Mensagem
              icone={TriangleAlert}
              titulo="Conexão protegida"
              texto="Credenciais reais ainda não foram fornecidas."
              classes="border-amber-200 bg-amber-50 text-amber-950"
            />
          </div>
        </Secao>

        <Secao
          titulo="Gráficos responsivos"
          descricao="Legendas claras, cores distintas e representação textual acompanham cada visualização."
        >
          <Card className="rounded-2xl border-[#123f47]/10">
            <CardContent className="grid gap-6 p-5 lg:grid-cols-[1fr_0.8fr] lg:p-7">
              <div className="h-72" role="img" aria-label="Exemplo de gráfico de origem dos leads">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={origemDosLeads}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {origemDosLeads.map((item) => (
                        <Cell key={item.nome} fill={item.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor) => [`${valor}%`, "Participação"]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center">
                <Sparkles className="size-7 text-violet-600" />
                <h3 className="mt-4 text-2xl font-semibold">Leitura rápida e inclusiva</h3>
                <p className="mt-2 text-sm leading-6 text-[#587076]">
                  A legenda nomeia cada série. Em telas pequenas, o gráfico se ajusta à largura
                  disponível sem criar rolagem horizontal.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {origemDosLeads.map((item) => (
                    <li
                      key={item.nome}
                      className="flex items-center justify-between border-b border-[#123f47]/8 pb-2"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: item.cor }}
                        />
                        {item.nome}
                      </span>
                      <strong>{item.valor}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </Secao>
      </div>
    </main>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#587076]">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

function Mensagem({
  icone: Icone,
  titulo,
  texto,
  classes,
}: {
  icone: typeof Check;
  titulo: string;
  texto: string;
  classes: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${classes}`}>
      <Icone className="size-5" />
      <h3 className="mt-4 font-semibold">{titulo}</h3>
      <p className="mt-1 text-sm leading-6 opacity-75">{texto}</p>
    </div>
  );
}
