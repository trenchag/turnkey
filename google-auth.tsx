"use client";

import { useAuth } from "@/hooks/use-auth";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { useTurnkey } from "@turnkey/sdk-react";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const POPUP_DIMENSIONS = { width: 500, height: 600 } as const;

interface GoogleTokenPayload {
  email: string;
  name: string;
  picture?: string;
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  nonce: string;
}

interface GoogleAuthProps {
  useRedirect?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export const GoogleAuth: React.FC<GoogleAuthProps> = ({
  useRedirect = false,
  onLoadingChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { indexedDbClient } = useTurnkey();
  const { authenticateWithGoogle } = useAuth();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectURI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI?.replace(
    /\/$/,
    "",
  );

  const updateLoadingState = useCallback(
    (loading: boolean) => {
      setIsLoading(loading);
      onLoadingChange?.(loading);
    },
    [onLoadingChange],
  );

  useEffect(() => {
    if (!useRedirect || !window.location.hash) return;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const idToken = hashParams.get("id_token");
    const state = hashParams.get("state");

    if (!idToken || !state) return;

    const stateParams = new URLSearchParams(state);
    const provider = stateParams.get("provider");
    const flow = stateParams.get("flow");

    if (provider === "google" && flow === "redirect") {
      handleAuthSuccess(idToken);

      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );
    }
  }, [useRedirect]);

  const handleAuthSuccess = useCallback(
    async (idToken: string) => {
      try {
        const decodedToken = jwtDecode<GoogleTokenPayload>(idToken);
        console.log("Google OAuth successful for:", decodedToken.email);

        await authenticateWithGoogle(idToken);
      } catch (error) {
        console.error("Google authentication failed:", error);
        throw error;
      } finally {
        updateLoadingState(false);
      }
    },
    [authenticateWithGoogle, updateLoadingState],
  );

  const buildOAuthUrl = useCallback(async (): Promise<string> => {
    if (!indexedDbClient) {
      throw new Error("Turnkey client not initialized");
    }

    const publicKey = await indexedDbClient.getPublicKey();

    if (!publicKey) {
      throw new Error("Failed to generate authentication key");
    }

    const nonce = bytesToHex(sha256(publicKey));
    const flow = useRedirect ? "redirect" : "popup";

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", googleClientId!);
    authUrl.searchParams.set("redirect_uri", redirectURI!);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("state", `provider=google&flow=${flow}`);

    return authUrl.toString();
  }, [indexedDbClient, googleClientId, redirectURI, useRedirect]);

  const handlePopupFlow = useCallback(
    async (authUrl: string): Promise<void> => {
      const { width, height } = POPUP_DIMENSIONS;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const authWindow = window.open(
        "about:blank",
        "_blank",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`,
      );

      if (!authWindow) {
        throw new Error(
          "Failed to open authentication window. Please allow popups.",
        );
      }

      authWindow.location.href = authUrl;

      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          try {
            const url = authWindow.location.href || "";

            if (url.startsWith(window.location.origin)) {
              const hashParams = new URLSearchParams(url.split("#")[1] || "");
              const idToken = hashParams.get("id_token");

              if (idToken) {
                authWindow.close();
                clearInterval(interval);
                handleAuthSuccess(idToken).then(resolve).catch(reject);
              }
            }
          } catch {}

          if (authWindow.closed) {
            clearInterval(interval);
            updateLoadingState(false);
            reject(new Error("Authentication cancelled"));
          }
        }, 500);
      });
    },
    [handleAuthSuccess, updateLoadingState],
  );

  const handleLogin = useCallback(async (): Promise<void> => {
    if (!googleClientId || !redirectURI) {
      throw new Error("Google OAuth not properly configured");
    }

    updateLoadingState(true);

    try {
      const authUrl = await buildOAuthUrl();

      if (useRedirect) {
        window.location.href = authUrl;
      } else {
        await handlePopupFlow(authUrl);
      }
    } catch (error) {
      updateLoadingState(false);
      console.error("Google login initiation failed:", error);
      throw error;
    }
  }, [
    googleClientId,
    redirectURI,
    buildOAuthUrl,
    useRedirect,
    handlePopupFlow,
    updateLoadingState,
  ]);

  return (
    <Button
      variant="outline"
      onClick={handleLogin}
      disabled={isLoading || !googleClientId}
    >
      {isLoading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {isLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
};

export default GoogleAuth;
