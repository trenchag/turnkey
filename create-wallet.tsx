"use client";
import Icons from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { useSolWallets, useWalletStore } from "@/store/wallet";
import { MAX_WALLET_ACCOUNTS_LIMIT } from "@/utils/constants";
import { defaultSolanaAccountAtIndex } from "@turnkey/sdk-browser";
import { useTurnkey } from "@turnkey/sdk-react";
import toast from "react-hot-toast";

export default function CreateWalletButton() {
  const solWallets = useSolWallets();
  const { indexedDbClient } = useTurnkey();
  const { createWallet, isCreating } = useWalletStore();

  const handleCreateWallet = async () => {
    const createWalletPromise = async () => {
      if (solWallets.length >= MAX_WALLET_ACCOUNTS_LIMIT) {
        throw new Error("You have reached the maximum number of wallets");
      }

      const wallets = await indexedDbClient?.getWallets();
      const walletId = wallets?.wallets[0].walletId;

      if (!walletId) {
        throw new Error("No wallet found");
      }

      const walletCount = await indexedDbClient?.getWalletAccounts({
        walletId,
      });

      const accountIndex = walletCount?.accounts.length ?? 0;
      const accounts = await indexedDbClient?.createWalletAccounts({
        walletId,
        accounts: [defaultSolanaAccountAtIndex(accountIndex)],
      });
      const address = accounts?.addresses[0];

      if (!address) {
        throw new Error("No address found");
      }
      await createWallet(walletId, address);
    };

    toast.promise(createWalletPromise(), {
      loading: "Creating wallet...",
      success: "Wallet created successfully!",
      error: (err) =>
        err instanceof Error ? err.message : "Failed to create wallet",
    });
  };

  return (
    <Button
      variant="secondary"
      className="h-7 bg-background-surface-elevate-2 px-2 py-1 text-sm hover:bg-background-surface-elevate-3 sm:h-7 [&_svg]:size-3"
      onClick={handleCreateWallet}
      disabled={isCreating}
    >
      <Icons.Plus />
      {isCreating ? "Creating..." : "Create"}
    </Button>
  );
}
