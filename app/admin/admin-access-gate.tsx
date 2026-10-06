/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation is intentional for the deployed vinext runtime */
import { chatGPTSignInPath } from "../chatgpt-auth";
import { getI18n } from "../../lib/i18n-server";

type AdminSection =
  | "Клиенты"
  | "Каталог"
  | "Аналитика"
  | "Установка"
  | "Подписка"
  | "Команда"
  | "Кабинет"
  | "Заявки и расчёт";

const sections = [
  {
    label: "Клиенты",
    href: "/admin/clients",
    text: "Магазины, владельцы и состояние подключения",
  },
  {
    label: "Каталог",
    href: "/admin/catalog",
    text: "Товары и готовность 3D-моделей",
  },
  {
    label: "Аналитика",
    href: "/admin/analytics",
    text: "Открытия, запуски AR и размещения",
  },
  {
    label: "Установка",
    href: "/admin/setup",
    text: "Пошаговое подключение виджета",
  },
  {
    label: "Подписка",
    href: "/admin/subscription",
    text: "Тариф, статус и условия пилота",
  },
] as const;

export async function AdminAccessGate({
  section,
  returnTo,
}: {
  section: AdminSection;
  returnTo: string;
}) {
  const { t } = await getI18n();

  return (
    <main className="admin-gate">
      <nav className="admin-gate-nav">
        <a href="/" className="admin-brand">
          MIRR<span>AI</span>
        </a>
        <a href="/">{t("Вернуться на сайт")}</a>
      </nav>
      <section className="admin-gate-content">
        <div className="admin-gate-copy">
          <p>{t("ЗАЩИЩЁННЫЙ КАБИНЕТ")}</p>
          <h1>
            {section === "Кабинет" ? t("Управляйте AR‑витриной") : t(section)}
          </h1>
          <span>
            {t(
              "Войдите по рабочей почте и паролю. После входа мы вернём вас именно в этот раздел.",
            )}
          </span>
          <a className="admin-gate-login" href={chatGPTSignInPath(returnTo)}>
            {t("Войти в кабинет")} <b>→</b>
          </a>
          <a
            className="admin-gate-register"
            href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t("Создать аккаунт магазина")}
          </a>
          <small>
            {t(
              "Кабинет и данные каждого магазина доступны только его сотрудникам.",
            )}
          </small>
        </div>
        <div className="admin-gate-sections">
          {sections.map((item, index) => (
            <a
              key={item.href}
              className={item.label === section ? "active" : ""}
              href={item.href}
            >
              <i>0{index + 1}</i>
              <span>
                <b>{t(item.label)}</b>
                <small>{t(item.text)}</small>
              </span>
              <em>↗</em>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function adminReturnTo(
  pathname: string,
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const params = searchParams ? await searchParams : {};
  const shop = Array.isArray(params.shop) ? params.shop[0] : params.shop;
  return shop ? `${pathname}?shop=${encodeURIComponent(shop)}` : pathname;
}
