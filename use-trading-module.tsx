import {
  createJupiterSwapBuyTransaction,
  createJupiterSwapSellTransaction,
} from "@/lib/api/protocol/jupiter";
import {
  createPumpfunBuyTransaction,
  createPumpfunSellTransaction,
} from "@/lib/api/protocol/pumpfun";
import { getSignedTransaction } from "@/lib/api/swap";
import { getSolanaConnection } from "@/lib/solana";
import { useSettingsStore } from "@/store/settings";
import { QUERY_KEY } from "@/utils/query-key";
import { playNotificationSound } from "@/utils/sound";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTurnkey } from "@turnkey/sdk-react";

interface UseBuyOrSellProps {
  walletAddress?: string;
  tokenAddress?: string;
  currentValue: number | string;
  setting?: {
    maxSlippagePercentage: number | string;
    priorityFeeValue: number | string;
    bribe: number | string;
  };
  type: "BUY" | "SELL";
  isOnBondingCurve: boolean;
  isGraduated: boolean;
  tokenDecimals: number;
  liquiditySol: number;
  liquidityToken: number;
}

export const useBuyOrSell = () => {
  const { indexedDbClient } = useTurnkey();

  const waitForConfirmation = (
    connection: ReturnType<typeof getSolanaConnection>,
    signature: string,
    timeout = 15000,
  ) => {
    return new Promise<string>((resolve, reject) => {
      let subscriptionId: number;
      const timeoutId = setTimeout(() => {
        connection.removeSignatureListener(subscriptionId);
        reject(new Error("Transaction Failed"));
      }, timeout);

      subscriptionId = connection.onSignature(
        signature,
        (notification) => {
          clearTimeout(timeoutId);
          connection.removeSignatureListener(subscriptionId);
          if (notification.err) {
            reject(new Error("Transaction Failed"));
          } else {
            resolve(signature);
          }
        },
        "confirmed",
      );
    });
  };

  const queryClient = useQueryClient();
  const { mutateAsync: handleBuyOrSell, isPending: isTransactionPending } =
    useMutation({
      mutationKey: [QUERY_KEY.BUY_TERMINAL],
      mutationFn: async ({
        walletAddress,
        tokenAddress,
        currentValue,
        setting,
        type,
        isOnBondingCurve,
        isGraduated,
        tokenDecimals,
        liquiditySol,
        liquidityToken,
      }: UseBuyOrSellProps) => {
        if (!walletAddress || !tokenAddress || !setting) {
          throw new Error("Missing required data.");
        }

        if (!currentValue) {
          throw new Error("Amount must be greater than 0.");
        }

        let txBase64: string = "";

        if (isOnBondingCurve) {
          if (isGraduated) {
            if (type === "BUY") {
              txBase64 = await createJupiterSwapBuyTransaction(
                new PublicKey(walletAddress),
                new PublicKey(tokenAddress),
                Number(currentValue),
                Number(setting.maxSlippagePercentage),
                Number(setting.priorityFeeValue),
                9,
              );
            } else if (type === "SELL") {
              txBase64 = await createJupiterSwapSellTransaction(
                new PublicKey(walletAddress),
                new PublicKey(tokenAddress),
                Number(currentValue),
                Number(setting.maxSlippagePercentage),
                Number(setting.priorityFeeValue),
                Number(tokenDecimals),
              );
            }
          } else {
            if (type === "BUY") {
              txBase64 = await createPumpfunBuyTransaction(
                new PublicKey(walletAddress),
                new PublicKey(tokenAddress),
                Number(currentValue),
                Number(setting.maxSlippagePercentage),
                Number(setting.priorityFeeValue),
                Number(setting.bribe) || 100,
                liquiditySol,
                liquidityToken,
              );
            } else if (type === "SELL") {
              txBase64 = await createPumpfunSellTransaction(
                new PublicKey(walletAddress),
                new PublicKey(tokenAddress),
                Number(currentValue),
                Number(setting.maxSlippagePercentage),
                Number(setting.priorityFeeValue),
                Number(setting.bribe) || 100,
                liquiditySol,
                liquidityToken,
              );
            }
          }
        } else {
          if (type === "BUY") {
            txBase64 = await createJupiterSwapBuyTransaction(
              new PublicKey(walletAddress),
              new PublicKey(tokenAddress),
              Number(currentValue),
              Number(setting.maxSlippagePercentage),
              Number(setting.priorityFeeValue),
              9,
            );
          } else if (type === "SELL") {
            txBase64 = await createJupiterSwapSellTransaction(
              new PublicKey(walletAddress),
              new PublicKey(tokenAddress),
              Number(currentValue),
              Number(setting.maxSlippagePercentage),
              Number(setting.priorityFeeValue),
              Number(tokenDecimals),
            );
          }
        }

        const connection = getSolanaConnection();
        const txHash = await getSignedTransaction(
          txBase64,
          walletAddress,
          connection,
          indexedDbClient,
        );

        await waitForConfirmation(connection, txHash, 15000);

        const notificationSettings =
          useSettingsStore.getState().settings.notification;
        if (notificationSettings.transactionSoundsEnabled) {
          const sound =
            type === "BUY"
              ? notificationSettings.buySound
              : notificationSettings.sellSound;
          playNotificationSound(
            notificationSettings.notificationVolume / 100,
            sound,
          );
        }

        return { walletAddress };
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY.USER_WALLET_BALANCE, data.walletAddress],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY.USER_WALLET_HOLDINGS, data.walletAddress],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY.ACTIVE_POSITION, data.walletAddress],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY.PORTFOLIO_DATA, data.walletAddress],
        });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.TOKEN_POSITION] });
      },
      onError: (err) => {
        console.error(err);
      },
    });

  return { handleBuyOrSell, isTransactionPending };
};
