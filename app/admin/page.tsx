import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { AdminAccessGate } from "./admin-access-gate";
import { authorizedShop, isPlatformOperator } from "../../db/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Кабинет — MIRRAI", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (user && await isPlatformOperator(user)) redirect("/admin/clients");
  if (user) {
    const access = await authorizedShop(user);
    if (access) redirect(`/admin/catalog?shop=${encodeURIComponent(access.shop.slug)}`);
    redirect("/onboarding");
  }
  return <AdminAccessGate section="Кабинет" returnTo="/admin" />;
}
