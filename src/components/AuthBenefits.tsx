import { getTranslator } from "@/lib/i18n/server";
import { IconBell, IconTarget, IconWallet } from "./ui/icons";

/**
 * What an account is for, as three plain points.
 *
 * Shown beside the sign-in and sign-up forms and on the signed-out watchlist,
 * so someone deciding whether to register sees what they get before being
 * asked for an email address. Meant to sit inside an ink panel.
 */
export async function AuthBenefits() {
  const { t } = await getTranslator();

  const points = [
    { icon: <IconTarget />, text: t("auth.panelPoint1") },
    { icon: <IconBell />, text: t("auth.panelPoint2") },
    { icon: <IconWallet />, text: t("auth.panelPoint3") },
  ];

  return (
    <div className="self-center">
      <h3 className="text-[15px] font-bold text-text">{t("auth.panelTitle")}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((point) => (
          <li
            key={point.text}
            className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-surface-raised p-4 text-[14px] leading-relaxed text-text-muted"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[#fb7a2e]">
              {point.icon}
            </span>
            <span className="pt-1">{point.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
