import type { Metadata } from "next";
import { DemoStore } from "./store";

export const metadata: Metadata = {
  title: "Демонстрация виджета MIRRAI",
  description: "Карточка мебельного товара с установленным AR-виджетом MIRRAI.",
  openGraph: { title: "Демонстрация виджета MIRRAI", description: "Карточка мебельного товара с AR-просмотром.", images: [] },
  twitter: { card: "summary", title: "Демонстрация виджета MIRRAI", description: "Карточка мебельного товара с AR-просмотром.", images: [] },
};

export default function DemoStorePage() { return <DemoStore/>; }
