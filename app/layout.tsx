import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mirrai-try-on.moonlight-5782.chatgpt.site"),
  title: "MIRRAI — мебель в вашем пространстве",
  description: "Фотореалистичный AR-виджет для мебельных интернет-магазинов: реальный масштаб, адаптация света и запуск из карточки товара.",
  openGraph: { title: "MIRRAI — мебель в вашем пространстве", description: "Посмотрите мебель у себя до покупки — прямо из карточки товара.", images: ["/og-furniture.png"] },
  twitter: { card: "summary_large_image", title: "MIRRAI — мебель в вашем пространстве", description: "Посмотрите мебель у себя до покупки — прямо из карточки товара.", images: ["/og-furniture.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
