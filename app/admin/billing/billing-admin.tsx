"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { commerceQuote, validCounts } from "../../../lib/commerce-quote.mjs";
import "./billing.css";
import { useI18n } from "../../language-provider";

type Pricing = {
  monthlyMinor: number;
  suppliedModelMinor: number;
  generatedModelMinor: number;
  revision: number;
};
type Quote = {
  configured: boolean;
  monthlyMinor?: number;
  preparationMinor?: number;
  firstPeriodMinor?: number;
};
type Item = {
  id: string;
  shopName: string;
  websiteUrl: string;
  suppliedCount: number;
  generatedCount: number;
  status: string;
  operatorNote: string;
  email?: string;
  shopSlug?: string | null;
  quote: Quote;
  createdAt: string;
};
type Data = { operator: boolean; pricing: Pricing | null; items: Item[] };
const money = (value?: number) =>
  value === undefined
    ? "Требуется расчёт"
    : new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "MDL",
      }).format(value / 100);
const statuses: Record<string, string> = {
  pending: "На рассмотрении",
  reviewed: "Расчёт рассмотрен",
  rejected: "Отклонена",
};

function QuoteSummary({ quote }: { quote: Quote }) {
  const { t } = useI18n();

  return (
    <div className="billing-quote">
      <div>
        <span>{t("Подписка / месяц")}</span>
        <strong>{t(money(quote.monthlyMinor))}</strong>
      </div>
      <div>
        <span>{t("Подготовка моделей / разово")}</span>
        <strong>{t(money(quote.preparationMinor))}</strong>
      </div>
      <div>
        <span>{t("Первый месяц + подготовка")}</span>
        <strong>{t(money(quote.firstPeriodMinor))}</strong>
      </div>
    </div>
  );
}

export function BillingAdmin({ displayName }: { displayName: string }) {
  const { t } = useI18n();

  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState(false),
    [supplied, setSupplied] = useState(0),
    [generated, setGenerated] = useState(1);
  const requestId = useRef("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/commerce", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError(
        t("Не удалось загрузить заявки. Проверьте соединение и повторите."),
      );
    }
  }, [t]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function send(body: Record<string, unknown>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/commerce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        const errors: Record<string, string> = {
          pricing_changed: t(
            "Цены обновились. Проверьте новый расчёт и отправьте ещё раз.",
          ),
          invalid_pricing: t(
            "Укажите неотрицательные цены. Создание модели должно стоить дороже проверки готовой.",
          ),
          forbidden: t("Недостаточно прав для этого действия."),
          invalid_website: t("Укажите публичный адрес сайта магазина."),
          rate_limited: t("Слишком много запросов. Попробуйте позже."),
        };
        setError(
          errors[result.error] ??
            t("Не удалось сохранить. Проверьте поля и повторите."),
        );
        if (result.error === "pricing_changed") await load();
        return false;
      }
      setMessage(
        body.action === "request"
          ? t(
              "Заявка сохранена. Оператор увидит её в своём кабинете. Деньги не списывались.",
            )
          : t("Изменения сохранены."),
      );
      await load();
      return true;
    } catch {
      setError(
        t(
          "Нет соединения. Повторная отправка той же заявки не создаст дубликат.",
        ),
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    if (
      await send({
        action: "request",
        id: requestId.current,
        name: form.get("name"),
        websiteUrl: form.get("websiteUrl"),
        suppliedCount: supplied,
        generatedCount: generated,
        pricingRevision: data?.pricing?.revision ?? 0,
      })
    )
      requestId.current = "";
  }
  const quote = validCounts(supplied, generated)
    ? commerceQuote(data?.pricing, supplied, generated)
    : null;
  return (
    <main className="admin-shell">
      <AdminNavigation active="billing" displayName={displayName} />
      <section className="admin-main billing-page">
        <header className="admin-head">
          <div>
            <p>
              {data?.operator
                ? t("ОПЕРАЦИОННЫЙ ЦЕНТР")
                : t("ПОДКЛЮЧЕНИЕ И СТОИМОСТЬ")}
            </p>
            <h1>
              {data?.operator ? t("Тарифы и заявки") : t("Заявки и расчёт")}
            </h1>
          </div>
          <button onClick={() => void load()} disabled={pending}>
            {t("Обновить")}
          </button>
        </header>
        <p className="billing-notice">
          {t(
            "Онлайн-оплата пока не подключена. Это предварительный расчёт и запрос на согласование, не оплаченный счёт. Окончательный объём работ подтверждается после проверки файлов.",
          )}
        </p>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {!data ? (
          <p>{t("Загружаем данные…")}</p>
        ) : (
          <>
            {data.operator ? (
              <form
                className="billing-panel billing-form"
                key={data.pricing?.revision ?? 0}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void send({
                    action: "pricing",
                    revision: data.pricing?.revision ?? 0,
                    monthlyMinor: Math.round(Number(form.get("monthly")) * 100),
                    suppliedModelMinor: Math.round(
                      Number(form.get("supplied")) * 100,
                    ),
                    generatedModelMinor: Math.round(
                      Number(form.get("generated")) * 100,
                    ),
                  });
                }}
              >
                <h2>{t("Ваши цены в MDL")}</h2>
                <p>
                  {t(
                    "Готовая модель: проверка и подготовка. Новая модель: создание и подготовка. Старые заявки сохраняют прежний расчёт.",
                  )}
                </p>
                <label>
                  {t("Подписка в месяц")}
                  <input
                    name="monthly"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={
                      data.pricing ? data.pricing.monthlyMinor / 100 : ""
                    }
                  />
                </label>
                <label>
                  {t("Одна готовая модель — разово")}
                  <input
                    name="supplied"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={
                      data.pricing ? data.pricing.suppliedModelMinor / 100 : ""
                    }
                  />
                </label>
                <label>
                  {t("Создание одной модели — разово")}
                  <input
                    name="generated"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={
                      data.pricing ? data.pricing.generatedModelMinor / 100 : ""
                    }
                  />
                </label>
                <button disabled={pending}>{t("Сохранить тарифы")}</button>
              </form>
            ) : (
              <form
                className="billing-panel billing-form"
                onSubmit={submitRequest}
              >
                <h2>{t("Запросить подключение магазина")}</h2>
                <p>
                  {t(
                    "Можно отправить заявку на ещё один магазин. Отправка не включает подписку и не запускает платную генерацию.",
                  )}
                </p>
                <label>
                  {t("Название магазина")}
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  {t("Адрес сайта")}
                  <input
                    name="websiteUrl"
                    type="url"
                    required
                    placeholder="https://store.md"
                  />
                </label>
                <label>
                  {t("Сколько готовых 3D-моделей")}
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={supplied}
                    onChange={(e) => setSupplied(Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  {t("Для скольких товаров нужно создать модель")}
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={generated}
                    onChange={(e) => setGenerated(Number(e.target.value))}
                    required
                  />
                </label>
                {quote ? (
                  <QuoteSummary quote={quote} />
                ) : (
                  <p role="alert">
                    {t("Укажите от 1 до 10 000 моделей суммарно.")}
                  </p>
                )}
                <button disabled={pending || !quote}>
                  {pending ? t("Сохраняем…") : t("Отправить заявку на расчёт")}
                </button>
                <a href="/admin/catalog">
                  {t("Загрузить готовые модели в существующий магазин →")}
                </a>
              </form>
            )}
            <h2>{data.operator ? t("Заявки клиентов") : t("Мои заявки")}</h2>
            {!data.items.length && <p>{t("Заявок пока нет.")}</p>}
            <div className="billing-requests">
              {data.items.map((item) => (
                <article className="billing-panel" key={item.id}>
                  <header>
                    <h3>{item.shopName}</h3>
                    <span>{t(statuses[item.status] ?? item.status)}</span>
                  </header>
                  <p>
                    {item.websiteUrl}
                    {item.email ? ` · ${item.email}` : ""}
                  </p>
                  <small>
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </small>
                  <p>
                    {t("Готовых моделей:")} {item.suppliedCount}
                    {t(". Создать:")} {item.generatedCount}.
                  </p>
                  <QuoteSummary quote={item.quote} />
                  {item.operatorNote && (
                    <p>
                      {t("Ответ MIRRAI:")} {item.operatorNote}
                    </p>
                  )}
                  {item.shopSlug ? (
                    <p>
                      <a
                        href={`/admin/catalog?shop=${encodeURIComponent(item.shopSlug)}`}
                      >
                        {t("Открыть каталог магазина →")}
                      </a>
                    </p>
                  ) : (
                    data.operator &&
                    item.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              t(
                                "Создать магазин для автора заявки и включить бесплатный пилот на 14 дней? Это не подтверждение оплаты.",
                              ),
                            )
                          )
                            void send({ action: "provision", id: item.id });
                        }}
                      >
                        {t("Подключить магазин · пилот 14 дней")}
                      </button>
                    )
                  )}
                  {data.operator && (
                    <form
                      className="billing-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void send({
                          action: "review",
                          id: item.id,
                          status: form.get("status"),
                          note: form.get("note"),
                        });
                      }}
                    >
                      <label>
                        {t("Статус")}
                        <select name="status" defaultValue={item.status}>
                          <option value="pending">
                            {t("На рассмотрении")}
                          </option>
                          <option value="reviewed">
                            {t("Расчёт рассмотрен")}
                          </option>
                          <option value="rejected">{t("Отклонена")}</option>
                        </select>
                      </label>
                      <label>
                        {t("Ответ клиенту")}
                        <textarea
                          name="note"
                          maxLength={2000}
                          defaultValue={item.operatorNote}
                        />
                      </label>
                      <button disabled={pending}>{t("Сохранить ответ")}</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
            <p>
              {t(
                "Показаны последние 100 заявок. Статус рассмотрения не означает оплату или активацию магазина.",
              )}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
