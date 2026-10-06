import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./language-provider";
import { getI18n } from "../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL("https://mirrai-try-on.moonlight-5782.chatgpt.site"),
    title: t("MIRRAI — мебель в вашем пространстве"),
    description: t(
      "Фотореалистичный AR-виджет для мебельных интернет-магазинов: реальный масштаб, адаптация света и запуск из карточки товара.",
    ),
    openGraph: {
      title: t("MIRRAI — мебель в вашем пространстве"),
      description: t(
        "Посмотрите мебель у себя до покупки — прямо из карточки товара.",
      ),
      images: ["/og-furniture.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("MIRRAI — мебель в вашем пространстве"),
      description: t(
        "Посмотрите мебель у себя до покупки — прямо из карточки товара.",
      ),
      images: ["/og-furniture.png"],
    },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
