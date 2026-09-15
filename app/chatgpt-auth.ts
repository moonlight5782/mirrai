// Compatibility layer for the existing dashboard imports. Authentication is
// now owned by MIRRAI and no longer depends on a ChatGPT account.
export { getCurrentUser as getChatGPTUser } from "./auth";
export type { AppUser as ChatGPTUser } from "./auth";
import { safeReturnTo } from "./auth";

export function chatGPTSignInPath(returnTo: string) {
  return `/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/") {
  return `/logout?returnTo=${encodeURIComponent(safeReturnTo(returnTo, "/"))}`;
}
