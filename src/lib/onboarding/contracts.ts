import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";
import { digits, normalizeCnpj, planFeatures } from "@/components/demo/interactive/formats";
const text = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(200).default("");
const address = z
  .object({
    zip: z
      .string()
      .transform(digits)
      .pipe(z.string().regex(/^\d{8}$/)),
    street: text,
    number: text,
    complement: optional,
    district: text,
    city: text,
    region: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,
      ),
  })
  .strict();
const phone = z
  .string()
  .transform(digits)
  .pipe(z.string().regex(/^\d{10,11}$/));
export const companySchema = z
  .object({
    legalName: text,
    cnpj: z
      .string()
      .transform(normalizeCnpj)
      .pipe(z.string().regex(/^[A-Z0-9]{12}\d{2}$/)),
    responsible: text,
    cpf: z
      .string()
      .transform(digits)
      .pipe(z.string().regex(/^\d{11}$/)),
    email: z.string().trim().email().max(254),
    whatsapp: phone,
    phone: z.union([z.literal(""), phone]),
    address,
    billingSame: z.boolean(),
    billingAddress: address.nullable(),
  })
  .strict()
  .superRefine((v, c) => {
    if (!v.billingSame && !v.billingAddress)
      c.addIssue({
        code: "custom",
        path: ["billingAddress"],
        message: "Preencha o endereço de cobrança.",
      });
  });
export const saveCompanySchema = z
  .object({
    tenantId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    planId: z.string().uuid(),
    company: companySchema,
  })
  .strict();
export const savePlanSchema = z
  .object({
    id: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable(),
    code: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
    name: text,
    description: z.string().trim().max(2000),
    status: z.enum(["draft", "active", "archived"]),
    monthlyPriceCents: z.number().int().min(0).max(100000000),
    propertyLimit: z.number().int().min(0).max(1000000),
    features: z
      .array(z.enum(planFeatures))
      .max(planFeatures.length)
      .refine((v) => new Set(v).size === v.length),
    portal: z.string().trim().max(100),
    productId: z.string().trim().max(200),
  })
  .strict();
export type Company = z.infer<typeof companySchema>;
export type PlanInput = z.infer<typeof savePlanSchema>;
export type CompanyInput = z.infer<typeof saveCompanySchema>;
export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  metadata: Record<string, Json | undefined>;
  updated_at: string;
};
export type CompanyRow = {
  id: string;
  nome: string;
  dominio_principal: string | null;
  plano_codigo: string | null;
  metadata: Record<string, Json | undefined>;
  updated_at: string;
};
export type OnboardingSnapshot = { plans: PlanRow[]; tenants: CompanyRow[] };
