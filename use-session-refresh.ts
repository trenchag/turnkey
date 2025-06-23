import { useAuth } from "@/store/auth";
import { LOCAL_STORAGE_KEY } from "@/utils/local-storage-key";
import { TIME_CONSTANTS } from "@/utils/time";
import { useTurnkey } from "@turnkey/sdk-react";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect } from "react";

interface TurnkeySession {
  exp: number;
  public_key: string;
  session_type: string;
  user_id: string;
  organization_id: string;
}

export const useSessionRefresh = () => {
  const { indexedDbClient } = useTurnkey();
  const { logout } = useAuth();

  const checkAndRefreshSession = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem(
        LOCAL_STORAGE_KEY.TURNKEY_SESSION,
      );

      if (!sessionToken || !indexedDbClient) {
        return;
      }

      const decodedToken = jwtDecode<TurnkeySession>(sessionToken);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decodedToken.exp - currentTime;

      if (timeUntilExpiry < 0) {
        logout();
        return;
      }

      if (timeUntilExpiry < TIME_CONSTANTS.DAY) {
        const publicKey = await indexedDbClient.getPublicKey();

        if (!publicKey) {
          throw new Error("Failed to get public key");
        }

        await indexedDbClient.refreshSession({
          sessionType: "SESSION_TYPE_READ_WRITE",
          publicKey,
          expirationSeconds: TIME_CONSTANTS.MONTH.toString(),
        });
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      logout();
    }
  }, [indexedDbClient, logout]);

  useEffect(() => {
    checkAndRefreshSession();
    const interval = setInterval(checkAndRefreshSession, TIME_CONSTANTS.HOUR);
    return () => clearInterval(interval);
  }, [checkAndRefreshSession]);

  return { checkAndRefreshSession };
};
