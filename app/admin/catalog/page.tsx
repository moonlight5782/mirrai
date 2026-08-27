import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { CatalogAdmin } from "./catalog-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Каталог моделей — MIRRAI Admin", description: "Состояние 3D-моделей товарного каталога.", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };

export default async function CatalogAdminPage() {
  const user = await requireChatGPTUser("/admin/catalog");
  return <CatalogAdmin displayName={user.displayName}/>;
}
