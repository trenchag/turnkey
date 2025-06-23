"use client";

import { turnkeyConfig } from "@/config/turnkey";
import { getNonce, verifyWallet } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import {
  PhantomAuthState,
  PhantomProvider,
  UsePhantomAuthReturn,
} from "@/types/phantom";
import { LOCAL_STORAGE_KEY } from "@/utils/local-storage-key";
import { SolanaWallet } from "@/utils/solana-wallet-stamper";
import { TIME_CONSTANTS } from "@/utils/time";
import { Turnkey } from "@turnkey/sdk-browser";
import { useTurnkey } from "@turnkey/sdk-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const turnkeyBrowserSDK = new Turnkey(turnkeyConfig);
const walletClient = turnkeyBrowserSDK.walletClient(
  turnkeyConfig?.wallet as SolanaWallet,
);

export const usePhantomAuth = (): UsePhantomAuthReturn => {
  const { indexedDbClient } = useTurnkey();

  const router = useRouter();
  const { logout } = useAuth();

  const [state, setState] = useState<PhantomAuthState>({
    isPhantomDetected: false,
    isConnected: false,
    isAuthenticating: false,
    walletAddress: null,
    error: null,
  });

  const getPhantomProvider = useCallback((): PhantomProvider | null => {
    if (typeof window !== "undefined" && window.phantom?.solana) {
      return window.phantom.solana;
    }
    return null;
  }, []);

  useEffect(() => {
    const checkPhantomAvailability = () => {
      const provider = getPhantomProvider();
      setState((prev) => ({
        ...prev,
        isPhantomDetected: !!provider,
      }));
    };

    checkPhantomAvailability();

    const timeoutId = setTimeout(checkPhantomAvailability, 1000);

    return () => clearTimeout(timeoutId);
  }, [getPhantomProvider]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const authenticateWithPhantom = useCallback(async () => {
    let provider: PhantomProvider | null = null;

    try {
      provider = getPhantomProvider();
      if (!provider) {
        throw new Error(
          "Phantom wallet not detected. Please install Phantom wallet.",
        );
      }

      if (!indexedDbClient) {
        throw new Error("Turnkey client not initialized");
      }

      const clientPublicKey = await indexedDbClient.getPublicKey();
      const { publicKey: walletAddress } = await provider.connect();
      const publicKey = await walletClient.getPublicKey();

      if (!publicKey) {
        throw new Error("Failed to generate Turnkey public key");
      }

      const nonceResponse = await getNonce(walletAddress);
      const nonce = nonceResponse.nonce;

      const message = `Sign this message to authenticate with Trench.\n\nNonce: ${nonce}\nWallet: ${walletAddress}`;

      const signature = await (
        walletClient?.getWalletInterface() as SolanaWallet
      ).signMessage(message);

      const verifyResponse = await verifyWallet(signature, walletAddress);

      if (!verifyResponse.turnkeyUserId) {
        throw new Error("Failed to verify wallet signature");
      }

      await walletClient.loginWithWallet({
        sessionType: "SESSION_TYPE_READ_WRITE",
        publicKey: clientPublicKey,
        expirationSeconds: TIME_CONSTANTS.MONTH.toString(),
      });

      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        walletAddress,
        error: null,
      }));

      localStorage.setItem(LOCAL_STORAGE_KEY.IS_LOGGED_IN, "true");

      router.push("/radar");

      toast.success("Phantom authentication successful!");
    } catch (error) {
      console.error("Phantom authentication error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to authenticate with Phantom wallet";

      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    } finally {
      try {
        if (provider && provider.isConnected) {
          await provider.disconnect();
        }
      } catch (disconnectError) {
        console.warn(
          "Failed to disconnect Phantom after auth:",
          disconnectError,
        );
      }
    }
  }, [getPhantomProvider, indexedDbClient, router]);

  return {
    ...state,
    authenticateWithPhantom,
    logout,
    clearError,
  };
};
