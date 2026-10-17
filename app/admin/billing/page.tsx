import type { Metadata } from "next";
import { getCurrentUser } from "../../auth";
import { AdminAccessGate } from "../admin-access-gate";
import { BillingAdmin } from "./billing-admin";
import { adminReturnTo } from "../admin-access-gate";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заявки и расчёт — MIRRAI", robots: { index: false, follow: false } };
export default async function BillingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  const returnTo = await adminReturnTo("/admin/billing", searchParams);
  return user ? <BillingAdmin displayName={user.displayName} returnTo={returnTo}/> : <AdminAccessGate section="Заявки и расчёт" returnTo={returnTo}/>;
}
