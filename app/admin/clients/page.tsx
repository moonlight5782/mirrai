import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AdminAccessGate } from "../admin-access-gate";
import { ClientsAdmin } from "./clients-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Клиенты — MIRRAI Admin", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function ClientsPage() { const user = await getChatGPTUser(); if (!user) return <AdminAccessGate section="Клиенты" returnTo="/admin/clients" />; const { isPlatformOperator } = await import("../../../db/authorization"); if (!await isPlatformOperator(user)) redirect("/admin"); return <ClientsAdmin displayName={user.displayName}/>; }
