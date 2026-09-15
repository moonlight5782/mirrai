/* eslint-disable @next/next/no-html-link-for-pages -- full navigation is intentional in the hosted runtime */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { authorizedShop, isPlatformOperator } from "../../db/authorization";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подключить магазин — MIRRAI", robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const user = await getChatGPTUser();
  if (!user) return <main className="onboarding-gate"><a className="brand" href="/">MIRR<span>AI</span></a><section><p>КАБИНЕТ МАГАЗИНА</p><h1>Подключите магазин</h1><span>Создайте отдельный аккаунт магазина или войдите по рабочей почте.</span><a href="/register?returnTo=%2Fonboarding">Создать аккаунт <b>→</b></a><a className="secondary-auth-link" href={chatGPTSignInPath("/onboarding")}>Уже есть аккаунт — войти</a></section></main>;
  if (await isPlatformOperator(user)) redirect("/admin/clients");
  const existing = await authorizedShop(user);
  if (existing) redirect(`/admin/catalog?shop=${encodeURIComponent(existing.shop.slug)}`);
  return <OnboardingForm displayName={user.displayName} email={user.email}/>;
}
