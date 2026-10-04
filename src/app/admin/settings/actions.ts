"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { SETTING_GROUPS, validateGroup, type SettingGroup } from "@/lib/settings/app";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * Saves one settings group. The form's fields are turned into the group's
 * shape here, then validated by the same Zod schema that reads it back, so
 * a value the app would refuse to use can never be stored. Signal bars
 * below the shipped values are refused with their own message.
 */

const num = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));
const on = (formData: FormData, name: string) => formData.get(name) === "on";

function readGroup(group: SettingGroup, f: FormData): unknown {
  switch (group) {
    case "run":
      return { enabled: on(f, "enabled"), creditCap: num(f.get("creditCap")), watchedFirst: on(f, "watchedFirst") };
    case "signals":
      return { signalZ: num(f.get("signalZ")), fitFloor: (num(f.get("fitFloor")) ?? NaN) / 100, minPeers: num(f.get("minPeers")) };
    case "chat":
      return {
        enabled: on(f, "enabled"),
        model: String(f.get("model") ?? "").trim(),
        dailyLimit: num(f.get("dailyLimit")),
        extraInstructions: String(f.get("extraInstructions") ?? "").trim(),
      };
    case "strip":
      return { speed: f.get("speed"), showNames: on(f, "showNames"), showMove: on(f, "showMove") };
  }
}

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const group = String(formData.get("group") ?? "") as SettingGroup;
  if (!SETTING_GROUPS.includes(group)) return { error: msg("admin.error.invalid") };

  const result = validateGroup(group, readGroup(group, formData));
  if (!result.ok) {
    return {
      error:
        group === "signals"
          ? msg("admin.settings.error.stricterOnly")
          : msg("admin.settings.error.fields", { fields: result.fields.join(", ") }),
    };
  }

  await prisma.appSetting.upsert({
    where: { key: group },
    create: { key: group, value: result.value },
    update: { value: result.value },
  });
  await audit(admin, "settings.save", group, result.value);
  revalidatePath("/", "layout");
  return { ok: msg("admin.saved") };
}

/** Restores a group's shipped defaults by deleting its row. */
export async function resetSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const group = String(formData.get("group") ?? "") as SettingGroup;
  if (!SETTING_GROUPS.includes(group)) return { error: msg("admin.error.invalid") };
  await prisma.appSetting.deleteMany({ where: { key: group } });
  await audit(admin, "settings.reset", group);
  revalidatePath("/", "layout");
  return { ok: msg("admin.settings.resetDone") };
}
