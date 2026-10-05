import { getEnv } from "@/lib/env";
import { getTranslator } from "@/lib/i18n/server";
import { getAppSettings } from "@/lib/settings/server";
import { SHIPPED_BARS } from "@/lib/intelligence/track-record";
import { DEFAULT_CHAT_MODEL } from "@/lib/settings/app";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { INPUT, LABEL, TEXTAREA } from "@/components/formStyles";
import { SettingCheck, SettingsGroup } from "./SettingsGroup";

/** App wide settings: the daily run, the signal bars and the assistant. The ticker strip's display settings live on its own page. */
export default async function SettingsPage() {
  const [{ t }, settings] = await Promise.all([getTranslator(), getAppSettings()]);
  const env = getEnv();
  const { run, signals, chat } = settings;

  const check = (name: string, label: string, checked: boolean, hint?: string) => (
    <SettingCheck name={name} label={label} checked={checked} hint={hint} />
  );

  return (
    <>
      <PageHeader title={t("admin.settings.title")} description={t("admin.settings.description")} />

      <SettingsGroup group="run" title={t("admin.settings.run.title")} description={t("admin.settings.run.description")} resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}>
        {check("enabled", t("admin.settings.run.enabled"), run.enabled, t("admin.settings.run.enabledHint"))}
        {check("watchedFirst", t("admin.settings.run.watchedFirst"), run.watchedFirst, t("admin.settings.run.watchedFirstHint"))}
        <div className="max-w-xs">
          <label htmlFor="creditCap" className={LABEL}>{t("admin.settings.run.creditCap")}</label>
          <input id="creditCap" name="creditCap" type="number" min={0} max={1000} defaultValue={run.creditCap ?? ""} placeholder={String(env.AUTOMATION_DAILY_CREDIT_CAP)} className={INPUT} />
          <p className="mt-1.5 text-xs text-text-subtle">{t("admin.settings.run.creditCapHint", { env: env.AUTOMATION_DAILY_CREDIT_CAP })}</p>
        </div>
      </SettingsGroup>

      <SettingsGroup group="signals" title={t("admin.settings.signals.title")} description={t("admin.settings.signals.description")} resetLabel={t("admin.settings.reset")} saveLabel={t("account.save")}>
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
      </SettingsGroup>

      <SettingsGroup
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
      </SettingsGroup>

    </>
  );
}
