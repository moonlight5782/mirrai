import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { AnalyticsAdmin } from "./analytics-admin";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Аналитика — MIRRAI", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function AnalyticsPage() { const user = await requireChatGPTUser("/admin/analytics"); return <AnalyticsAdmin displayName={user.displayName}/>; }
