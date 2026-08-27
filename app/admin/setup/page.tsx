import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подключение магазина — MIRRAI", description: "Пошаговая установка AR-виджета.", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };

export default async function SetupPage() {
  const user = await requireChatGPTUser("/admin/setup");
  return <SetupWizard displayName={user.displayName}/>;
}
