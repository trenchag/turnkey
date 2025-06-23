"use client";
import Icons from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/modal";
import { useAuth } from "@/store/auth";
import { copyToClipboard, formatAddress } from "@/utils/helpers";
import { LOCAL_STORAGE_KEY } from "@/utils/local-storage-key";
import { merge } from "@/utils/ui";
import { decryptExportBundle, generateP256KeyPair } from "@turnkey/crypto";
import { useTurnkey } from "@turnkey/sdk-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ExportModal({ address }: { address: string }) {
  const { indexedDbClient } = useTurnkey();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsExported(false);
    setIsPrivateKeyVisible(false);
    setPrivateKey("");
    setIsExporting(false);
  };

  const handleExportWallet = async () => {
    setIsExporting(true);

    try {
      const keyPair = generateP256KeyPair();
      const embeddedPrivateKey = keyPair.privateKey;
      const embeddedPublicKey = keyPair.publicKeyUncompressed;

      localStorage.setItem(
        LOCAL_STORAGE_KEY.TURNKEY_EMBEDDED_PRIVATE_KEY,
        embeddedPrivateKey,
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEY.TURNKEY_EMBEDDED_PUBLIC_KEY,
        embeddedPublicKey,
      );

      const exportResult = await indexedDbClient?.exportWalletAccount({
        organizationId: user?.subOrgId,
        address,
        targetPublicKey: embeddedPublicKey,
      });

      if (!exportResult?.exportBundle) {
        throw new Error("Failed to retrieve export bundle");
      }

      const decryptedBundle = await decryptExportBundle({
        exportBundle: exportResult.exportBundle,
        embeddedKey: embeddedPrivateKey,
        organizationId: user?.subOrgId!,
        returnMnemonic: false,
        keyFormat: "SOLANA",
      });

      localStorage.removeItem(LOCAL_STORAGE_KEY.TURNKEY_EMBEDDED_PRIVATE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_KEY.TURNKEY_EMBEDDED_PUBLIC_KEY);

      setPrivateKey(decryptedBundle);

      setIsExported(true);
    } catch (error) {
      console.error("Error during wallet export:", error);
      toast.error("Failed to export wallet. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    return () => {
      handleCloseModal();
    };
  }, []);

  return (
    <ModalBase
      title={isExported ? "Wallet Details" : "Export Wallet"}
      showCloseButton={false}
      trigger={
        <button>
          <Icons.Key />
        </button>
      }
      className="max-w-xs"
      isOpen={isModalOpen}
      setIsOpen={setIsModalOpen}
    >
      <div className="space-y-6 p-6">
        {!isExported ? (
          <>
            <div className="space-y-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleExportWallet}
                disabled={isExporting}
              >
                {isExporting ? "Exporting..." : "Export Wallet"}
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded bg-background-surface-elevate-2 px-2.5 py-3">
              <Icons.WarningSign className="min-w-5" />
              <span className="text-sm text-[#747474]">
                Showing your private keys. DO NOT verify if you are not
                exporting your private keys.
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#747474]">
                Wallet Address
              </label>
              <div className="relative flex h-9 w-full items-center rounded border border-border bg-background-surface-elevate-2 px-3 py-2 text-base text-[#C4C4C4] shadow-sm transition-colors md:text-sm">
                <span className="peer pe-8">
                  {formatAddress(address, { split: 10 })}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(address, "Wallet address copied!")
                  }
                  className="absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-[#747474] peer-disabled:opacity-50"
                >
                  <Icons.Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#747474]">
                Private Key
              </label>

              {privateKey && (
                <div
                  className={merge(
                    "relative flex h-fit w-full items-center break-all rounded border border-border bg-background-surface-elevate-2 px-3 py-2 text-base text-[#C4C4C4] shadow-sm transition-colors md:text-sm",
                    !isPrivateKeyVisible && "blur-md",
                  )}
                >
                  <span className="peer pe-8">
                    {isPrivateKeyVisible
                      ? privateKey
                      : Array.from({ length: 88 })
                          .map((e) => "*")
                          .join("")}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(privateKey, "Private key copied!")
                    }
                    className="absolute inset-y-0 end-0 flex justify-center pe-3 pt-2 text-sm text-[#747474] peer-disabled:opacity-50"
                  >
                    <Icons.Copy className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!isPrivateKeyVisible && (
                <Button
                  onClick={() => setIsPrivateKeyVisible(true)}
                  className="w-full justify-center gap-3 bg-[#1C1C1C] px-3 py-3 text-[#747474] hover:bg-[#2C2C2C]"
                >
                  <span className="text-[#4FFFAB]">
                    <Icons.EyeOpen />
                  </span>
                  <span>Reveal Private Key</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {isExported && (
        <DialogFooter className="flex items-center justify-between border-t border-border bg-[#141414] px-6 py-3">
          <Button
            onClick={handleCloseModal}
            className="w-full bg-[#1C1C1C] font-semibold text-[#747474] hover:bg-[#2C2C2C]"
          >
            Close
          </Button>
        </DialogFooter>
      )}
    </ModalBase>
  );
}
