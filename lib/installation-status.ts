export const CONNECTED_INSTALLATION_STATUS = "connected";

export function installationIsConnected(status: string | null | undefined) {
  return status === CONNECTED_INSTALLATION_STATUS;
}
