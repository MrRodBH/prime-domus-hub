import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  nome?: string;
  email?: string;
  telefone?: string;
  mensagem?: string;
  origem?: string;
  imovel_codigo?: string;
  imovel_titulo?: string;
  recebido_em?: string;
}

const NovoLeadEmail = ({
  nome = "Sem nome",
  email,
  telefone,
  mensagem,
  origem = "site",
  imovel_codigo,
  imovel_titulo,
  recebido_em,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo lead recebido: {nome}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Novo lead recebido 🏠</Heading>
        <Text style={p}>
          Você recebeu um novo contato pelo site da RM Prime Imóveis.
        </Text>

        <Section style={card}>
          <Row label="Nome" value={nome} />
          {email ? <Row label="E-mail" value={email} /> : null}
          {telefone ? <Row label="Telefone" value={telefone} /> : null}
          <Row label="Origem" value={origem} />
          {imovel_codigo || imovel_titulo ? (
            <Row
              label="Imóvel"
              value={`${imovel_codigo ?? ""} ${imovel_titulo ?? ""}`.trim()}
            />
          ) : null}
          {recebido_em ? <Row label="Recebido em" value={recebido_em} /> : null}
        </Section>

        {mensagem ? (
          <>
            <Heading as="h2" style={h2}>Mensagem</Heading>
            <Text style={msg}>{mensagem}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          Acesse o painel administrativo para gerenciar este lead.
        </Text>
      </Container>
    </Body>
  </Html>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={rowStyle}>
    <strong style={{ color: "#0b3a3a" }}>{label}:</strong>{" "}
    <span style={{ color: "#1f2937" }}>{value}</span>
  </Text>
);

export const template = {
  component: NovoLeadEmail,
  subject: (d: Record<string, unknown>) =>
    `Novo lead: ${(d.nome as string) || "Contato pelo site"}`,
  displayName: "Notificação de novo lead",
  previewData: {
    nome: "João Silva",
    email: "joao@example.com",
    telefone: "(31) 99999-0000",
    mensagem: "Tenho interesse no apartamento no Belvedere.",
    origem: "imovel:BLV-001",
    imovel_codigo: "BLV-001",
    imovel_titulo: "Apartamento alto padrão no Belvedere",
    recebido_em: "16/06/2026 18:30",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const h1 = { color: "#0b3a3a", fontSize: "22px", margin: "0 0 8px" };
const h2 = { color: "#0b3a3a", fontSize: "16px", margin: "24px 0 8px" };
const p = { color: "#4b5563", fontSize: "14px", margin: "0 0 16px" };
const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
};
const rowStyle = { fontSize: "14px", margin: "6px 0", lineHeight: "1.5" };
const msg = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "1.6",
  whiteSpace: "pre-wrap" as const,
};
const hr = { borderColor: "#e5e7eb", margin: "24px 0 12px" };
const footer = { color: "#6b7280", fontSize: "12px" };
