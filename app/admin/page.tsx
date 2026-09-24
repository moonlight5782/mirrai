import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { AdminAccessGate } from "./admin-access-gate";
import { authorizedShop, isPlatformOperator } from "../../db/authorization";
import { OverviewAdmin } from "./overview-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Кабинет — MIRRAI", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const slug = typeof params.shop === "string" ? params.shop : undefined;
  const user = await getChatGPTUser();
  if (user && !slug && await isPlatformOperator(user)) redirect("/admin/clients");
  if (user) {
    const access = await authorizedShop(user, slug);
    if (access) return <OverviewAdmin displayName={user.displayName} shopSlug={access.shop.slug}/>;
    redirect("/onboarding");
  }
  return <AdminAccessGate section="Кабинет" returnTo={slug ? `/admin?shop=${encodeURIComponent(slug)}` : "/admin"} />;
}
