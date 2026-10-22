import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation keeps auth redirects reliable in Vinext */
import { redirect } from "next/navigation";
import { getCurrentUser, safeReturnTo } from "../auth";
import { AuthForm } from "./auth-form";
import { googleConfiguration } from "../../lib/google-auth";
import { getI18n } from "../../lib/i18n-server";
import { isGoogleOnlyAuth } from "../../lib/auth-mode";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Вход — MIRRAI"), robots: { index: false, follow: false } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();

  const params = await searchParams;
  const raw = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;
  const returnTo = safeReturnTo(raw, "/admin");
  const googleOnly = await isGoogleOnlyAuth();
  if (await getCurrentUser()) redirect(returnTo);
  return (
    <main className="merchant-auth">
      <a className="brand" href="/">
        MIRR<span>AI</span>
      </a>
      <section>
        <div>
          <p>{t("КАБИНЕТ МАГАЗИНА")}</p>
          <h1>{t("С возвращением")}</h1>
          <span>
            {t(
              "Управляйте каталогом, 3D-моделями, установкой виджета и статистикой в одном месте.",
            )}
          </span>
        </div>
        <AuthForm
          mode="login"
          returnTo={returnTo}
          googleEnabled={Boolean(googleConfiguration())}
          googleOnly={googleOnly}
          oauthError={
            typeof params.oauth === "string" ? params.oauth : undefined
          }
        />
        {!googleOnly && <footer>
          {t("Нет аккаунта?")}{" "}
          <a href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            {t("Зарегистрироваться")}
          </a>
        </footer>}
      </section>
    </main>
  );
}
