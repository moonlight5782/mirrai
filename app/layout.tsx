import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Manrope({ variable: "--font-sans", subsets: ["cyrillic", "latin"] });
const serif = Playfair_Display({ variable: "--font-serif", subsets: ["cyrillic", "latin"] });
export const metadata: Metadata = {
  title: "MIRRAI — примеряйте до покупки",
  description: "Виртуальная примерка одежды и AR-просмотр предметов в вашем пространстве.",
  openGraph: { title: "MIRRAI — примеряйте до покупки", description: "Одежда на вас. Предметы — в вашем пространстве.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "MIRRAI — примеряйте до покупки", description: "Одежда на вас. Предметы — в вашем пространстве.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>; }
