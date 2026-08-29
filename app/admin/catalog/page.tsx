import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { CatalogAdmin } from "./catalog-admin";
import { AdminAccessGate, adminReturnTo } from "../admin-access-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Каталог моделей — MIRRAI Admin", description: "Состояние 3D-моделей товарного каталога.", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };

export default async function CatalogAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getChatGPTUser();
  const params = await searchParams;
  const rawShop = Array.isArray(params.shop) ? params.shop[0] : params.shop;
  const shopSlug = rawShop?.slice(0, 60) ?? "";
  return user ? <CatalogAdmin displayName={user.displayName} shopSlug={shopSlug}/> : <AdminAccessGate section="Каталог" returnTo={await adminReturnTo("/admin/catalog", Promise.resolve(params))} />;
}
