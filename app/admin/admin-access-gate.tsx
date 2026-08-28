import Link from "next/link";
import { chatGPTSignInPath } from "../chatgpt-auth";

type AdminSection = "Клиенты" | "Каталог" | "Аналитика" | "Установка" | "Кабинет";

const sections = [
  { label: "Клиенты", href: "/admin/clients", text: "Магазины, владельцы и состояние подключения" },
  { label: "Каталог", href: "/admin/catalog", text: "Товары и готовность 3D-моделей" },
  { label: "Аналитика", href: "/admin/analytics", text: "Открытия, запуски AR и размещения" },
  { label: "Установка", href: "/admin/setup", text: "Пошаговое подключение виджета" },
] as const;

export function AdminAccessGate({ section, returnTo }: { section: AdminSection; returnTo: string }) {
  return (
    <main className="admin-gate">
      <nav className="admin-gate-nav">
        <Link href="/" className="admin-brand">MIRR<span>AI</span></Link>
        <Link href="/">Вернуться на сайт</Link>
      </nav>
      <section className="admin-gate-content">
        <div className="admin-gate-copy">
          <p>ЗАЩИЩЁННЫЙ КАБИНЕТ</p>
          <h1>{section === "Кабинет" ? "Управляйте AR\u2011витриной" : section}</h1>
          <span>Войдите, чтобы открыть данные магазина. После входа мы вернём вас именно в этот раздел.</span>
          <a className="admin-gate-login" href={chatGPTSignInPath(returnTo)}>Войти в кабинет <b>→</b></a>
          <small>Данные каталогов и клиентов не показываются посторонним посетителям.</small>
        </div>
        <div className="admin-gate-sections">
          {sections.map((item, index) => (
            <Link key={item.href} className={item.label === section ? "active" : ""} href={item.href}>
              <i>0{index + 1}</i><span><b>{item.label}</b><small>{item.text}</small></span><em>↗</em>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function adminReturnTo(pathname: string, searchParams?: Promise<Record<string, string | string[] | undefined>>) {
  const params = searchParams ? await searchParams : {};
  const shop = Array.isArray(params.shop) ? params.shop[0] : params.shop;
  return shop ? `${pathname}?shop=${encodeURIComponent(shop)}` : pathname;
}
