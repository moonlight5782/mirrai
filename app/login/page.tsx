import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation keeps auth redirects reliable in Vinext */
import { redirect } from "next/navigation";
import { getCurrentUser, safeReturnTo } from "../auth";
import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Вход — MIRRAI", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeReturnTo(raw, "/admin");
  if (await getCurrentUser()) redirect(returnTo);
  return <main className="merchant-auth"><a className="brand" href="/">MIRR<span>AI</span></a><section><div><p>КАБИНЕТ МАГАЗИНА</p><h1>С возвращением</h1><span>Управляйте каталогом, 3D-моделями, установкой виджета и статистикой в одном месте.</span></div><AuthForm mode="login" returnTo={returnTo}/><footer>Нет аккаунта? <a href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Зарегистрироваться</a></footer></section></main>;
}
