import type { ReactNode } from "react";
import { getEnv } from "@/lib/env";
import { getTranslator } from "@/lib/i18n/server";
import { getAppSettings } from "@/lib/settings/server";
import { SHIPPED_BARS } from "@/lib/intelligence/track-record";
import { DEFAULT_CHAT_MODEL } from "@/lib/settings/app";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SMALL, INPUT, LABEL, TEXTAREA } from "@/components/formStyles";
import { resetSettings, saveSettings } from "./actions";

/** App wide settings: the daily run, the signal bars, the chatbot and the ticker strip. */
export default async function SettingsPage() {
  const [{ t }, settings] = await Promise.all([getTranslator(), getAppSettings()]);
  const env = getEnv();
  const { run, signals, chat, strip } = settings;

  const check = (name: string, label: string, checked: boolean, hint?: string) => (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-[18px] w-[18px] accent-accent-bright" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );

  return (
    <>
      <PageHeader title={t("admin.settings.title")} description={t("admin.settings.description")} />

      <Group group="run" title={t("admin.settings.run.title")} description={t("admin.settings.run.description")} resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}>
        {check("enabled", t("admin.settings.run.enabled"), run.enabled, t("admin.settings.run.enabledHint"))}
        {check("watchedFirst", t("admin.settings.run.watchedFirst"), run.watchedFirst, t("admin.settings.run.watchedFirstHint"))}
        <div className="max-w-xs">
          <label htmlFor="creditCap" className={LABEL}>{t("admin.settings.run.creditCap")}</label>
          <input id="creditCap" name="creditCap" type="number" min={0} max={1000} defaultValue={run.creditCap ?? ""} placeholder={String(env.AUTOMATION_DAILY_CREDIT_CAP)} className={INPUT} />
          <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.run.creditCapHint", { env: env.AUTOMATION_DAILY_CREDIT_CAP })}</p>
        </div>
      </Group>

      <Group group="signals" title={t("admin.settings.signals.title")} description={t("admin.settings.signals.description")} resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="signalZ" className={LABEL}>{t("admin.settings.signals.z")}</label>
            <input id="signalZ" name="signalZ" type="number" step={0.1} min={SHIPPED_BARS.signalZ} max={5} defaultValue={signals.signalZ} className={INPUT} />
            <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.signals.min", { value: SHIPPED_BARS.signalZ })}</p>
          </div>
          <div>
            <label htmlFor="fitFloor" className={LABEL}>{t("admin.settings.signals.fit")}</label>
            <input id="fitFloor" name="fitFloor" type="number" step={1} min={SHIPPED_BARS.fitFloor * 100} max={95} defaultValue={Math.round(signals.fitFloor * 100)} className={INPUT} />
            <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.signals.min", { value: `${SHIPPED_BARS.fitFloor * 100}%` })}</p>
          </div>
          <div>
            <label htmlFor="minPeers" className={LABEL}>{t("admin.settings.signals.peers")}</label>
            <input id="minPeers" name="minPeers" type="number" step={1} min={SHIPPED_BARS.minPeers} max={10} defaultValue={signals.minPeers} className={INPUT} />
            <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.signals.min", { value: SHIPPED_BARS.minPeers })}</p>
          </div>
        </div>
        <p className="text-xs text-text-subtle">{t("admin.settings.signals.why")}</p>
      </Group>

      <Group
        group="chat"
        title={t("admin.settings.chat.title")}
        description={t("admin.settings.chat.description")}
        resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}
        badge={env.XAI_API_KEY ? <Badge tone="normal">{t("admin.settings.chat.keySet")}</Badge> : <Badge tone="moderate">{t("admin.settings.chat.keyMissing")}</Badge>}
      >
        {check("enabled", t("admin.settings.chat.enabled"), chat.enabled)}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="model" className={LABEL}>{t("admin.settings.chat.model")}</label>
            <input id="model" name="model" defaultValue={chat.model} placeholder={DEFAULT_CHAT_MODEL} maxLength={64} className={INPUT} />
            <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.chat.modelHint", { model: DEFAULT_CHAT_MODEL })}</p>
          </div>
          <div>
            <label htmlFor="dailyLimit" className={LABEL}>{t("admin.settings.chat.limit")}</label>
            <input id="dailyLimit" name="dailyLimit" type="number" min={1} max={500} defaultValue={chat.dailyLimit} className={INPUT} />
          </div>
        </div>
        <div>
          <label htmlFor="extraInstructions" className={LABEL}>{t("admin.settings.chat.instructions")}</label>
          <textarea id="extraInstructions" name="extraInstructions" maxLength={1000} rows={3} defaultValue={chat.extraInstructions} className={TEXTAREA} />
          <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.chat.instructionsHint")}</p>
        </div>
      </Group>

      <Group group="strip" title={t("admin.settings.strip.title")} description={t("admin.settings.strip.description")} resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}>
        <fieldset>
          <legend className={LABEL}>{t("admin.settings.strip.speed")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["slow", "normal", "fast"] as const).map((speed) => (
              <label key={speed} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="speed" value={speed} defaultChecked={strip.speed === speed} className="accent-accent-bright" />
                {t(`admin.settings.strip.speed.${speed}`)}
              </label>
            ))}
          </div>
        </fieldset>
        {check("showNames", t("admin.settings.strip.names"), strip.showNames)}
        {check("showMove", t("admin.settings.strip.move"), strip.showMove, t("admin.settings.strip.moveHint"))}
      </Group>
    </>
  );
}

function Group({
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
