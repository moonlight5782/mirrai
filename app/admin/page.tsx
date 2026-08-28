import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { AdminAccessGate } from "./admin-access-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Кабинет — MIRRAI", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (user) redirect("/admin/catalog");
  return <AdminAccessGate section="Кабинет" returnTo="/admin" />;
}
