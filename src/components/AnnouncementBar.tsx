"use client";

import { useSyncExternalStore } from "react";
import type { LiveAnnouncement } from "@/lib/brand/settings";
import { useTranslation } from "@/lib/i18n/client";
import { IconClose } from "./ui/icons";

/**
 * Admin announcements, shown above the header.
 *
 * Filtered by audience here (the schedule was already applied on the
 * server). A dismissal is remembered per announcement in localStorage, read
 * through useSyncExternalStore so the server render (nothing dismissed) and
 * the first client render agree, with no flash and no hydration mismatch.
 */

const STORAGE_KEY = "shadow-idx-dismissed";
const EVENT = "shadow-idx-dismissed-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function readDismissed(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function dismiss(id: string) {
  try {
    const current = readDismissed().split(",").filter(Boolean);
    localStorage.setItem(STORAGE_KEY, [...current, id].slice(-20).join(","));
  } catch {
    // Blocked storage: the banner simply comes back on the next page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

const TONES: Record<LiveAnnouncement["tone"], string> = {
  INFO: "ink",
  WARNING: "bg-[#fef3c7] text-[#78350f]",
  SUCCESS: "bg-[#dcfce7] text-[#14532d]",
};

export function AnnouncementBar({
  announcements,
  signedIn,
}: {
  announcements: LiveAnnouncement[];
  signedIn: boolean;
}) {
  const { locale, t } = useTranslation();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => "");
  const hidden = new Set(dismissed.split(","));

  const visible = announcements.filter(
    (a) =>
      !hidden.has(a.id) &&
      (a.audience === "ALL" || (a.audience === "SIGNED_IN") === signedIn),
  );
  if (visible.length === 0) return null;

  return (
    <div className="relative z-40">
      {visible.map((a) => (
        <div
          key={a.id}
          role="status"
          className={`flex items-center justify-center gap-3 px-10 py-2.5 text-center text-[13px] font-semibold ${TONES[a.tone]}`}
        >
          <span>
            {a.message[locale]}
            {a.link ? (
              <>
                {" "}
                <a href={a.link.url} className="underline underline-offset-2">
                  {a.link.label[locale]}
                </a>
              </>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => dismiss(a.id)}
            aria-label={t("announcement.dismiss")}
            className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
