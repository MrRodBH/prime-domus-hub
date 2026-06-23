import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const ULTIMA_ATUALIZACAO = "26 de novembro de 2025";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | RM Prime Imóveis" },
      {
        name: "description",
        content:
          "Saiba como a RM Prime Imóveis coleta, utiliza e protege seus dados pessoais em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade | RM Prime Imóveis" },
      {
        property: "og:description",
        content:
          "Saiba como a RM Prime Imóveis coleta, utiliza e protege seus dados pessoais em conformidade com a LGPD.",
      },
      { property: "og:url", content: "https://www.rmprimeimoveis.com.br/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://www.rmprimeimoveis.com.br/privacidade" }],
  }),
  component: PrivacidadePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl md:text-3xl text-petroleum mb-4">{title}</h2>
      <div className="text-foreground/80 text-base leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function PrivacidadePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Institucional</span>
        <h1 className="font-display text-4xl md:text-5xl mt-4 mb-4 leading-[1.05]">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {ULTIMA_ATUALIZACAO}
        </p>

        <p className="mt-8 text-foreground/80 leading-relaxed">
          A RM Prime Imóveis respeita sua privacidade e está comprometida com a proteção dos
          dados pessoais de seus clientes, parceiros, proprietários de imóveis, locatários e
          visitantes do site.
        </p>
        <p className="mt-4 text-foreground/80 leading-relaxed">
          Esta Política de Privacidade explica como coletamos, utilizamos, armazenamos e
          protegemos suas informações em conformidade com a Lei Geral de Proteção de Dados
          (Lei nº 13.709/2018 — LGPD).
        </p>

        <Section title="1. Quem Somos">
          <p>
            A RM Prime Imóveis é uma empresa especializada na intermediação de compra, venda,
            locação e administração de imóveis.
          </p>
          <p>
            Website oficial:{" "}
            <a
              href="https://www.rmprimeimoveis.com.br"
              className="text-gold hover:underline"
            >
              https://www.rmprimeimoveis.com.br
            </a>
          </p>
        </Section>

        <Section title="2. Dados Coletados">
          <p>Podemos coletar os seguintes dados:</p>
          <p className="font-semibold text-petroleum mt-4">Dados fornecidos pelo usuário</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nome completo</li>
            <li>Telefone</li>
            <li>WhatsApp</li>
            <li>E-mail</li>
            <li>Cidade</li>
            <li>Interesse imobiliário</li>
            <li>Mensagens enviadas pelos formulários</li>
          </ul>
          <p className="font-semibold text-petroleum mt-4">Dados coletados automaticamente</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Endereço IP</li>
            <li>Navegador utilizado</li>
            <li>Sistema operacional</li>
            <li>Dispositivo utilizado</li>
            <li>Páginas visitadas</li>
            <li>Data e horário de acesso</li>
            <li>Cookies e tecnologias semelhantes</li>
          </ul>
        </Section>

        <Section title="3. Finalidade da Coleta">
          <p>Os dados são utilizados para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Entrar em contato com interessados em imóveis.</li>
            <li>Responder solicitações enviadas pelo site.</li>
            <li>Agendar visitas.</li>
            <li>Apresentar imóveis compatíveis com o perfil do cliente.</li>
            <li>Enviar informações sobre oportunidades imobiliárias.</li>
            <li>Melhorar a experiência de navegação.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </Section>

        <Section title="4. Compartilhamento de Dados">
          <p>A RM Prime Imóveis não comercializa dados pessoais.</p>
          <p>Os dados poderão ser compartilhados apenas quando necessário com:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Corretores associados.</li>
            <li>Proprietários de imóveis envolvidos na negociação.</li>
            <li>Prestadores de serviços tecnológicos.</li>
            <li>Plataformas de CRM imobiliário.</li>
            <li>Ferramentas de automação e marketing.</li>
            <li>Autoridades públicas quando exigido por lei.</li>
          </ul>
          <p>Todos os parceiros devem adotar medidas adequadas de proteção dos dados.</p>
        </Section>

        <Section title="5. Armazenamento e Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Acesso não autorizado.</li>
            <li>Perda.</li>
            <li>Alteração indevida.</li>
            <li>Divulgação indevida.</li>
            <li>Uso fraudulento.</li>
          </ul>
          <p>
            Embora utilizemos boas práticas de segurança, nenhum sistema é totalmente imune a
            riscos.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>O site utiliza cookies para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Melhorar a navegação.</li>
            <li>Personalizar conteúdo.</li>
            <li>Medir desempenho do site.</li>
            <li>Realizar análises estatísticas.</li>
            <li>Apoiar campanhas de marketing digital.</li>
          </ul>
          <p>
            O usuário pode desabilitar cookies diretamente em seu navegador, embora isso possa
            afetar algumas funcionalidades do site.
          </p>
        </Section>

        <Section title="7. Direitos do Titular dos Dados">
          <p>Nos termos da LGPD, você poderá solicitar:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Confirmação da existência de tratamento.</li>
            <li>Acesso aos seus dados.</li>
            <li>Correção de informações incompletas ou desatualizadas.</li>
            <li>Anonimização ou exclusão de dados quando aplicável.</li>
            <li>Portabilidade dos dados.</li>
            <li>Revogação do consentimento.</li>
            <li>Informações sobre compartilhamento de dados.</li>
          </ul>
        </Section>

        <Section title="8. Retenção dos Dados">
          <p>Os dados serão mantidos apenas pelo período necessário para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cumprimento das finalidades descritas nesta política.</li>
            <li>Cumprimento de obrigações legais.</li>
            <li>Exercício regular de direitos em processos judiciais ou administrativos.</li>
          </ul>
        </Section>

        <Section title="9. Links para Sites de Terceiros">
          <p>Nosso site pode conter links para plataformas externas.</p>
          <p>
            A RM Prime Imóveis não é responsável pelas práticas de privacidade de sites de
            terceiros.
          </p>
          <p>
            Recomendamos que o usuário consulte as respectivas políticas de privacidade antes
            de fornecer qualquer informação.
          </p>
        </Section>

        <Section title="10. Alterações nesta Política">
          <p>
            Esta Política de Privacidade poderá ser atualizada periodicamente para refletir
            alterações legais, operacionais ou tecnológicas.
          </p>
          <p>A versão mais recente estará sempre disponível nesta página.</p>
        </Section>

        <Section title="11. Contato">
          <p>
            Para exercer seus direitos relacionados à proteção de dados ou esclarecer dúvidas
            sobre esta Política de Privacidade, entre em contato com a RM Prime Imóveis pelos
            canais oficiais disponibilizados no site.
          </p>
          <p>
            Website:{" "}
            <a
              href="https://www.rmprimeimoveis.com.br"
              className="text-gold hover:underline"
            >
              https://www.rmprimeimoveis.com.br
            </a>
          </p>
        </Section>

        <div className="mt-16 flex justify-center">
          <Link
            to="/"
            className="bg-petroleum hover:bg-gold text-linen px-10 py-4 rounded-full text-sm uppercase tracking-[0.18em] font-medium transition-colors"
          >
            Voltar para a Página Inicial
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Última atualização: {ULTIMA_ATUALIZACAO}
        </p>
      </main>
      <Footer />
    </div>
  );
}
