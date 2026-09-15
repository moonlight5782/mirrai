import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation keeps auth redirects reliable in Vinext */
import { redirect } from "next/navigation";
import { getCurrentUser, safeReturnTo } from "../auth";
import { AuthForm } from "../login/auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Регистрация — MIRRAI", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const invite = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  const returnTo = safeReturnTo(raw, "/onboarding");
  if (await getCurrentUser()) redirect(returnTo);
  return <main className="merchant-auth"><a className="brand" href="/">MIRR<span>AI</span></a><section><div><p>ПЕРВЫЙ ШАГ</p><h1>Создайте кабинет</h1><span>{invite ? "Создайте аккаунт с почтой, указанной в приглашении." : "После регистрации добавьте магазин, загрузите каталог и получите код виджета."}</span></div><AuthForm mode="register" returnTo={returnTo}/><footer>Уже есть аккаунт? <a href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Войти</a></footer></section></main>;
}
