import type { Metadata } from "next";
import { getCurrentUser } from "../../auth";
import { AdminAccessGate } from "../admin-access-gate";
import { TeamAdmin } from "./team-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Команда и доступ — MIRRAI", robots: { index: false, follow: false } };
export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; const raw = params.shop; const shopSlug = Array.isArray(raw) ? raw[0] ?? "" : raw ?? ""; const user = await getCurrentUser(); return user ? <TeamAdmin displayName={user.displayName} shopSlug={shopSlug}/> : <AdminAccessGate section="Команда" returnTo={`/admin/team${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`}/>; }
