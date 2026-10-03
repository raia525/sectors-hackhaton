import type { TranslationKey } from "@/lib/i18n/dictionary";
import { INPUT, LABEL } from "@/components/formStyles";

/** Role and language selects, shared by the create and edit user forms. */
export function RoleAndLocale({
  t,
  role = "USER",
  locale = "en",
}: {
  t: (key: TranslationKey) => string;
  role?: string;
  locale?: string;
}) {
  return (
    <>
      <div>
        <label htmlFor="role" className={LABEL}>{t("admin.users.role")}</label>
        <select id="role" name="role" defaultValue={role} className={INPUT}>
          <option value="USER">{t("admin.users.roleUser")}</option>
          <option value="ADMIN">{t("account.roleAdmin")}</option>
        </select>
      </div>
      <div>
        <label htmlFor="locale" className={LABEL}>{t("language.label")}</label>
        <select id="locale" name="locale" defaultValue={locale} className={INPUT}>
          <option value="en">English</option>
          <option value="id">Indonesia</option>
        </select>
      </div>
    </>
  );
}
