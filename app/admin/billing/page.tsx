import type { Metadata } from "next";
import { getCurrentUser } from "../../auth";
import { AdminAccessGate } from "../admin-access-gate";
import { BillingAdmin } from "./billing-admin";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заявки и расчёт — MIRRAI", robots: { index: false, follow: false } };
export default async function BillingPage() {
  const user = await getCurrentUser();
  return user ? <BillingAdmin displayName={user.displayName}/> : <AdminAccessGate section="Заявки и расчёт" returnTo="/admin/billing"/>;
}
