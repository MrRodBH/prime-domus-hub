import { z } from "zod";

export const BROKER_DIRECTORY_VIEW_KEYS = ["directory", "teams"] as const;
export type BrokerDirectoryView = (typeof BROKER_DIRECTORY_VIEW_KEYS)[number];

export const brokerTeamDirectorySearchSchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    team: z.string().uuid().optional(),
    view: z.enum(BROKER_DIRECTORY_VIEW_KEYS).optional(),
  })
  .strict();

export type BrokerTeamDirectorySearch = {
  q?: string;
  team?: string;
  view?: BrokerDirectoryView;
};
