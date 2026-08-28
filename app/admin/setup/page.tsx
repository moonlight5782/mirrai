import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { SetupWizard } from "./setup-wizard";
import { AdminAccessGate, adminReturnTo } from "../admin-access-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подключение магазина — MIRRAI", description: "Пошаговая установка AR-виджета.", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getChatGPTUser();
  return user ? <SetupWizard displayName={user.displayName}/> : <AdminAccessGate section="Установка" returnTo={await adminReturnTo("/admin/setup", searchParams)} />;
}
