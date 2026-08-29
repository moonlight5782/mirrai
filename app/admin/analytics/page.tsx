import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AnalyticsAdmin } from "./analytics-admin";
import { AdminAccessGate, adminReturnTo } from "../admin-access-gate";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Аналитика — MIRRAI", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const user = await getChatGPTUser(); const params = await searchParams; const rawShop = Array.isArray(params.shop) ? params.shop[0] : params.shop; const shopSlug = rawShop?.slice(0, 60) ?? ""; return user ? <AnalyticsAdmin displayName={user.displayName} shopSlug={shopSlug}/> : <AdminAccessGate section="Аналитика" returnTo={await adminReturnTo("/admin/analytics", Promise.resolve(params))} />; }
