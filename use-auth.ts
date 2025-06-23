import { googleOauth, sendOtp, verifyOtp } from "@/lib/api/auth";
import { useAuth as useAuthStore } from "@/store/auth";
import { LOCAL_STORAGE_KEY } from "@/utils/local-storage-key";
import { useTurnkey } from "@turnkey/sdk-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "react-hot-toast";

interface AuthConfig {
  redirectTo?: string;
  onSuccess?: () => Promise<void> | void;
  onError?: (error: string) => void;
}

interface UseAuthReturn {
  authenticateWithGoogle: (idToken: string) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<string>;
  verifyEmailOtp: (email: string, otpId: string, otp: string) => Promise<void>;
  isAuthenticated: () => boolean;
  logout: () => void;
}

export const useAuth = (config: AuthConfig = {}): UseAuthReturn => {
  const router = useRouter();
  const { indexedDbClient } = useTurnkey();
  const { logout: logoutTurnkey } = useAuthStore();

  const { redirectTo = "/radar", onSuccess, onError } = config;

  const handleAuthSuccess = useCallback(
    async (message?: string) => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY.IS_LOGGED_IN, "true");

        if (onSuccess) {
          await onSuccess();
        }

        router.push(redirectTo);

        toast.success(message || "Successfully authenticated!");
      } catch (error) {
        console.error("Auth success handler error:", error);
        toast.error("Authentication successful but navigation failed");
      }
    },
    [router, redirectTo, onSuccess],
  );

  const ensureAuthReady = useCallback(async (): Promise<string> => {
    if (!indexedDbClient) {
      throw new Error("Turnkey client not initialized");
    }

    const publicKey = await indexedDbClient.getPublicKey();

    if (!publicKey) {
      throw new Error("Failed to generate authentication key");
    }

    return publicKey;
  }, [indexedDbClient]);

  const authenticateWithGoogle = useCallback(
    async (idToken: string): Promise<void> => {
      const publicKey = await indexedDbClient!.getPublicKey();

      if (!publicKey) {
        throw new Error("Authentication key not found");
      }

      const response = await googleOauth(null, idToken, publicKey);

      if (!response.success || !response.data?.credentialsBundle) {
        throw new Error(response.message || "Google authentication failed");
      }

      await indexedDbClient!.loginWithSession(response.data.credentialsBundle);
      await handleAuthSuccess("Successfully logged in with Google!");
    },
    [ensureAuthReady, indexedDbClient, handleAuthSuccess],
  );

  const sendEmailOtp = useCallback(
    async (email: string): Promise<string> => {
      try {
        await ensureAuthReady();

        const publicKey = await indexedDbClient!.getPublicKey();

        if (!publicKey) {
          throw new Error("Authentication key not found");
        }

        const response = await sendOtp(email, publicKey);

        if (!response.otpId) {
          throw new Error("Failed to send verification code");
        }

        return response.otpId;
      } catch (error) {
        throw error;
      }
    },
    [ensureAuthReady],
  );

  const verifyEmailOtp = useCallback(
    async (email: string, otpId: string, otp: string): Promise<void> => {
      const publicKey = await indexedDbClient!.getPublicKey();

      if (!publicKey) {
        throw new Error("Authentication key not found");
      }

      const response = await verifyOtp(email, otpId, otp, publicKey);

      if (!response.data?.credentialsBundle) {
        throw new Error("Invalid verification code");
      }

      await indexedDbClient!.loginWithSession(response.data.credentialsBundle);
      await handleAuthSuccess("Successfully logged in with email!");
    },
    [indexedDbClient, handleAuthSuccess],
  );

  const isAuthenticated = useCallback((): boolean => {
    return localStorage.getItem(LOCAL_STORAGE_KEY.IS_LOGGED_IN) === "true";
  }, []);

  return {
    authenticateWithGoogle,
    sendEmailOtp,
    verifyEmailOtp,
    isAuthenticated,
    logout: logoutTurnkey,
  };
};
