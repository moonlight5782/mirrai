import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "../auth";
import { InviteClient } from "./invite-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Приглашение — MIRRAI", robots: { index: false, follow: false } };

export default async function InvitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? "";
  const user = await getCurrentUser();
  return <main className="onboarding-gate"><Link className="brand" href="/">MIRR<span>AI</span></Link><section><InviteClient token={token} signedIn={Boolean(user)} currentEmail={user?.email}/></section></main>;
}
