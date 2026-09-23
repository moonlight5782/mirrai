import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "../auth";
import { RecoveryForm } from "./recovery-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Доступ к аккаунту — MIRRAI", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function AccountAccessPage() {
  const user = await getCurrentUser();
  return <main className="merchant-auth"><Link href="/" className="brand">MIRR<span>AI</span></Link><section>
    <div><p>БЕЗОПАСНОСТЬ АККАУНТА</p><h1>Доступ к MIRRAI</h1></div>
    <RecoveryForm email={user?.email ?? ""} verified={user?.emailVerified ?? false}/>
    <footer><a href="/login">Вернуться ко входу</a> · <a href="/admin">В кабинет</a></footer>
  </section></main>;
}
