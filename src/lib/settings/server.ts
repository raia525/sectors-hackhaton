import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { DEFAULT_SETTINGS, parseAll, type AppSettings, type SignalBars } from "./app";

/**
 * The admin settings, read once per request. A database failure falls back
 * to the shipped defaults, the same rule as the brand settings: no setting
 * is worth an error page.
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  try {
    const rows = await prisma.appSetting.findMany({ select: { key: true, value: true } });
    return parseAll(rows);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function getSignalBars(): Promise<SignalBars> {
  return (await getAppSettings()).signals;
}

/** The daily run's credit cap: the admin value when set, else the environment. */
export async function dailyCreditCap(): Promise<number> {
  const { run } = await getAppSettings();
  return run.creditCap ?? getEnv().AUTOMATION_DAILY_CREDIT_CAP;
}

/** True when the chatbot can run: a key is configured and the admin left it on. */
export async function chatAvailable(): Promise<boolean> {
  if (!getEnv().XAI_API_KEY) return false;
  return (await getAppSettings()).chat.enabled;
}
