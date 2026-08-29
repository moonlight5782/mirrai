import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AdminAccessGate, adminReturnTo } from "../admin-access-gate";
import { SubscriptionAdmin } from "./subscription-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подписка — MIRRAI", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getChatGPTUser();
  const params = await searchParams;
  const rawShop = Array.isArray(params.shop) ? params.shop[0] : params.shop;
  const shopSlug = rawShop?.slice(0, 60) ?? "";
  return user ? <SubscriptionAdmin displayName={user.displayName} shopSlug={shopSlug}/> : <AdminAccessGate section="Подписка" returnTo={await adminReturnTo("/admin/subscription", Promise.resolve(params))}/>;
}
