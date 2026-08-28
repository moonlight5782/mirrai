import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AdminAccessGate } from "../admin-access-gate";
import { ClientsAdmin } from "./clients-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Клиенты — MIRRAI Admin", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function ClientsPage() { const user = await getChatGPTUser(); return user ? <ClientsAdmin displayName={user.displayName}/> : <AdminAccessGate section="Клиенты" returnTo="/admin/clients" />; }
