import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { ClientsAdmin } from "./clients-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Клиенты — MIRRAI Admin", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function ClientsPage() { const user = await requireChatGPTUser("/admin/clients"); return <ClientsAdmin displayName={user.displayName}/>; }
