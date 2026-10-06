import { getI18n } from "../../lib/i18n-server";
import type { Metadata } from "next";
import { DemoStore } from "./store";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("HUGGE × MIRRAI — рабочая AR-витрина"),
    description: t(
      "Реальные товары каталога HUGGE с подключённым AR-виджетом MIRRAI.",
    ),
    openGraph: {
      title: t("HUGGE × MIRRAI — рабочая AR-витрина"),
      description: t("Реальный каталог HUGGE и статусы 3D-моделей."),
      images: [],
    },
    twitter: {
      card: "summary",
      title: t("HUGGE × MIRRAI — рабочая AR-витрина"),
      description: t("Реальный каталог HUGGE и статусы 3D-моделей."),
      images: [],
    },
  };
}

export default function DemoStorePage() {
  return <DemoStore />;
}
