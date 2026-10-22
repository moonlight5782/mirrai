import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "../auth";
import { RecoveryForm } from "./recovery-form";
import { getI18n } from "../../lib/i18n-server";
import { isGoogleOnlyAuth } from "../../lib/auth-mode";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Доступ к аккаунту — MIRRAI",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function AccountAccessPage() {
  const { t } = await getI18n();

  const user = await getCurrentUser();
  return (
    <main className="merchant-auth">
      <Link href="/" className="brand">
        MIRR<span>AI</span>
      </Link>
      <section>
        <div>
          <p>{t("БЕЗОПАСНОСТЬ АККАУНТА")}</p>
          <h1>{t("Доступ к MIRRAI")}</h1>
        </div>
        {await isGoogleOnlyAuth() ? (
          <p>{t("Восстановите доступ через аккаунт Google, с которым вы входили в MIRRAI.")}</p>
        ) : (
          <RecoveryForm
            email={user?.email ?? ""}
            verified={user?.emailVerified ?? false}
          />
        )}
        <footer>
          <a href="/login">{t("Вернуться ко входу")}</a> ·{" "}
          <a href="/admin">{t("В кабинет")}</a>
        </footer>
      </section>
    </main>
  );
}
