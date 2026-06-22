import * as React from "react";
import {
  Body,
  Button,
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
  link?: string;
}

const DefinirSenhaEmail = ({ nome = "", link = "#" }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Defina sua senha de acesso — RM Prime Imóveis</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bem-vindo(a) à RM Prime Imóveis</Heading>
        <Text style={p}>
          {nome ? `Olá, ${nome}.` : "Olá."} Sua conta de acesso ao painel foi
          criada. Para definir sua senha definitiva e acessar o sistema, clique
          no botão abaixo.
        </Text>

        <Button href={link} style={btn}>
          Definir minha senha
        </Button>

        <Text style={small}>
          Se o botão não funcionar, copie e cole este link no navegador:
          <br />
          <span style={{ wordBreak: "break-all", color: "#0b3a3a" }}>{link}</span>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Este link é pessoal e expira em alguns minutos. Caso não tenha
          solicitado este acesso, ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: DefinirSenhaEmail,
  subject: "Defina sua senha — RM Prime Imóveis",
  displayName: "Definir senha (novo usuário)",
  previewData: {
    nome: "Rodolfo",
    link: "https://rmprimeimoveis.com.br/reset-password#access_token=...",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const h1 = { color: "#0b3a3a", fontSize: "22px", margin: "0 0 12px" };
const p = { color: "#4b5563", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" };
const btn = {
  backgroundColor: "#0b3a3a",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  display: "inline-block",
};
const small = { color: "#6b7280", fontSize: "12px", margin: "20px 0 0", lineHeight: "1.5" };
const hr = { borderColor: "#e5e7eb", margin: "24px 0 12px" };
const footer = { color: "#9ca3af", fontSize: "12px" };
