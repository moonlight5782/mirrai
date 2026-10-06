/* eslint-disable @next/next/no-html-link-for-pages -- full navigation is intentional in the hosted runtime */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { authorizedShop, isPlatformOperator } from "../../db/authorization";
import { OnboardingForm } from "./onboarding-form";
import { getI18n } from "../../lib/i18n-server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Подключить магазин — MIRRAI"),
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage() {
  const { t } = await getI18n();

  const user = await getChatGPTUser();
  if (!user)
    return (
      <main className="onboarding-gate">
        <a className="brand" href="/">
          MIRR<span>AI</span>
        </a>
        <section>
          <p>{t("КАБИНЕТ МАГАЗИНА")}</p>
          <h1>{t("Подключите магазин")}</h1>
          <span>
            {t(
              "Создайте отдельный аккаунт магазина или войдите по рабочей почте.",
            )}
          </span>
          <a href="/register?returnTo=%2Fonboarding">
            {t("Создать аккаунт")} <b>→</b>
          </a>
          <a
            className="secondary-auth-link"
            href={chatGPTSignInPath("/onboarding")}
          >
            {t("Уже есть аккаунт — войти")}
          </a>
        </section>
      </main>
    );
  if (await isPlatformOperator(user)) redirect("/admin/clients");
  const existing = await authorizedShop(user);
  if (existing)
    redirect(`/admin/catalog?shop=${encodeURIComponent(existing.shop.slug)}`);
  return <OnboardingForm displayName={user.displayName} email={user.email} />;
}
