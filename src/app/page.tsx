import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HOME_PATH, parsePreferences } from "@/lib/settings/user";

/**
 * `/` is the landing page for a signed-out visitor and nothing else.
 *
 * A signed-in user is sent to the section they chose as their start page
 * (Market by default). The old analysis address, `/?symbol=`, still works
 * and goes to `/stocks?symbol=`, so links in emails already sent keep
 * opening the right stock.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const [{ symbol }, user] = await Promise.all([searchParams, getCurrentUser()]);

  if (symbol) redirect(`/stocks?symbol=${encodeURIComponent(symbol)}`);
  if (!user) return <Landing />;

  const account = await prisma.user
    .findUnique({ where: { id: user.id }, select: { preferences: true } })
    .catch(() => null);
  redirect(HOME_PATH[parsePreferences(account?.preferences).homeTab]);
}
