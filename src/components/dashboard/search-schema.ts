import { z } from "zod";

export const DASHBOARD_PERIOD_KEYS = ["7d", "30d", "month", "year", "custom"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIOD_KEYS)[number];

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardInsightsSearchSchema = z
  .object({
    period: z.enum(DASHBOARD_PERIOD_KEYS).optional(),
    from: z.string().regex(isoDate).optional(),
    to: z.string().regex(isoDate).optional(),
    origin: z.string().trim().min(1).max(200).optional(),
    broker: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((search, context) => {
    if (search.period === "custom" && (!search.from || !search.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "O período personalizado exige datas inicial e final.",
      });
    }

    if (search.from && search.to && search.to < search.from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "A data final deve ser igual ou posterior à data inicial.",
      });
    }
  });

export type DashboardInsightsSearch = {
  period?: DashboardPeriod;
  from?: string;
  to?: string;
  origin?: string;
  broker?: string;
};
