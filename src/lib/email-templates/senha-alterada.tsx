import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  nome?: string;
  alterado_por?: string;
  quando?: string;
}

const SenhaAlteradaEmail = ({ nome = "", alterado_por = "um administrador", quando = "" }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sua senha de acesso foi alterada — RM Prime Imóveis</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Senha alterada</Heading>
        <Text style={p}>
          {nome ? `Olá, ${nome}.` : "Olá."} Informamos que a senha da sua conta de
          acesso ao painel da RM Prime Imóveis foi alterada {quando ? `em ${quando} ` : ""}
          por {alterado_por}.
        </Text>
        <Text style={p}>
          Se foi você que realizou a alteração, nenhuma ação é necessária.
        </Text>
        <Text style={pStrong}>
          Caso <b>não</b> tenha sido você, entre em contato imediatamente com o
          administrador do sistema para proteger sua conta.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Este é um e-mail informativo automático. Por favor, não responda.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SenhaAlteradaEmail,
  subject: "Sua senha foi alterada — RM Prime Imóveis",
  displayName: "Senha alterada (notificação)",
  previewData: {
    nome: "Carlos",
    alterado_por: "um administrador",
    quando: new Date().toLocaleString("pt-BR"),
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const h1 = { color: "#0b3a3a", fontSize: "22px", margin: "0 0 12px" };
const p = { color: "#4b5563", fontSize: "14px", lineHeight: "1.6", margin: "0 0 14px" };
const pStrong = { color: "#0b3a3a", fontSize: "14px", lineHeight: "1.6", margin: "0 0 14px" };
const hr = { borderColor: "#e5e7eb", margin: "24px 0 12px" };
const footer = { color: "#9ca3af", fontSize: "12px" };
