import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, CardHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SMALL } from "@/components/formStyles";
import { resetSettings, saveSettings } from "./actions";

/**
 * One settings group as a card: its fields, Save, and "Back to defaults".
 * Shared by the Settings page and the pages that own a group's subject
 * (the ticker strip's display settings live next to its list).
 */
export function SettingsGroup({
  group,
  title,
  description,
  resetLabel,
  saveLabel,
  badge,
  children,
}: {
  group: string;
  title: string;
  description: string;
  resetLabel: string;
  saveLabel: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader title={title} description={description} />
        {badge}
      </div>
      <ActionForm action={saveSettings} className="space-y-5">
        <input type="hidden" name="group" value={group} />
        {children}
        <SubmitButton className={BUTTON_PRIMARY}>{saveLabel}</SubmitButton>
      </ActionForm>
      <ActionForm action={resetSettings} className="mt-3">
        <input type="hidden" name="group" value={group} />
        <SubmitButton className={BUTTON_SMALL}>{resetLabel}</SubmitButton>
      </ActionForm>
    </Card>
  );
}

export function SettingCheck({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-[18px] w-[18px] accent-accent-bright" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
