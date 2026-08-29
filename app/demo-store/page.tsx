import type { Metadata } from "next";
import { DemoStore } from "./store";

export const metadata: Metadata = {
  title: "HUGGE × MIRRAI — рабочая AR-витрина",
  description: "Реальные товары каталога HUGGE с подключённым AR-виджетом MIRRAI.",
  openGraph: { title: "HUGGE × MIRRAI — рабочая AR-витрина", description: "Реальный каталог HUGGE и статусы 3D-моделей.", images: [] },
  twitter: { card: "summary", title: "HUGGE × MIRRAI — рабочая AR-витрина", description: "Реальный каталог HUGGE и статусы 3D-моделей.", images: [] },
};

export default function DemoStorePage() { return <DemoStore/>; }
