I'll help you find all files using the `useturnkey` hook and create a summary in markdown format. Let me search for these files first.

Search files...

Ran tool
Great! I can see that the grep search found the exact files using `useTurnkey`. Let me now read the specific files to understand their purpose and create summaries. I can see there are 7 files in total:

1. `src/components/wallets/modals/export-wallet.tsx`
2. `src/components/wallets/create-wallet.tsx`
3. `src/hooks/use-session-refresh.ts`
4. `src/hooks/use-trading-module.tsx`
5. `src/hooks/use-phantom-auth.ts`
6. `src/hooks/use-auth.ts`
7. `src/components/auth/google-auth.tsx`

Let me read these files to understand their functionality:

Read file: src/components/wallets/modals/export-wallet.tsx

Read file: src/components/wallets/create-wallet.tsx

Read file: src/hooks/use-session-refresh.ts

Read file: src/hooks/use-trading-module.tsx

Read file: src/hooks/use-phantom-auth.ts

Read file: src/hooks/use-auth.ts

Read file: src/components/auth/google-auth.tsx
Now I have a good understanding of all the files using the `useTurnkey` hook. Let me create a comprehensive markdown summary of these files:

# Files Using `useTurnkey` Hook - Summary

## Overview
There are **7 files** in the codebase that utilize the `useTurnkey` hook from `@turnkey/sdk-react`. These files are primarily focused on wallet management, authentication, and trading functionality within the Trench application.

---

## 1. **`src/hooks/use-session-refresh.ts`**
**Purpose:** Session management and automatic refresh functionality

**Key Features:**
- Monitors Turnkey session token expiration
- Automatically refreshes sessions when they're close to expiring (less than 1 day)
- Logs out users if session is expired or refresh fails
- Runs background check every hour
- Uses JWT decoding to check session validity

**useTurnkey Usage:** 
- Extracts `indexedDbClient` to get public keys and refresh sessions
- Calls `indexedDbClient.refreshSession()` for session renewal

---

## 2. **`src/hooks/use-auth.ts`**
**Purpose:** Core authentication hook providing multiple auth methods

**Key Features:**
- Google OAuth authentication
- Email OTP (One-Time Password) authentication
- Authentication state management
- Automatic session handling and navigation

**useTurnkey Usage:**
- Uses `indexedDbClient` to get public keys for authentication
- Calls `indexedDbClient.loginWithSession()` to establish authenticated sessions
- Ensures auth readiness by checking public key availability

---

## 3. **`src/hooks/use-phantom-auth.ts`**
**Purpose:** Phantom wallet integration for Solana authentication

**Key Features:**
- Detects Phantom wallet availability
- Connects to Phantom wallet and requests wallet signature
- Verifies wallet signature with backend
- Manages authentication state and error handling

**useTurnkey Usage:**
- Uses `indexedDbClient` to get client public keys
- Integrates with Turnkey's wallet client for signature verification
- Handles wallet-based authentication flow

---

## 4. **`src/hooks/use-trading-module.tsx`**
**Purpose:** Core trading functionality for buy/sell operations

**Key Features:**
- Handles Jupiter and Pumpfun DEX integrations
- Supports both bonding curve and graduated token trading
- Transaction signing and confirmation
- Portfolio balance invalidation after trades

**useTurnkey Usage:**
- Uses `indexedDbClient` for transaction signing via `getSignedTransaction()`
- Integrates with Solana connection for transaction broadcasting
- Manages wallet interactions for trading operations

---

## 5. **`src/components/wallets/create-wallet.tsx`**
**Purpose:** Component for creating new Solana wallets

**Key Features:**
- Creates new wallet accounts within existing Turnkey wallets
- Enforces maximum wallet limit (MAX_WALLET_ACCOUNTS_LIMIT)
- Generates wallet addresses using Solana account indexing
- Toast notifications for creation status

**useTurnkey Usage:**
- Uses `indexedDbClient.getWallets()` to retrieve existing wallets
- Calls `indexedDbClient.createWalletAccounts()` to create new accounts
- Utilizes `defaultSolanaAccountAtIndex()` for proper account generation

---

## 6. **`src/components/wallets/modals/export-wallet.tsx`**
**Purpose:** Modal component for exporting wallet private keys

**Key Features:**
- Secure private key export functionality
- P256 key pair generation for encryption
- Private key decryption and display
- Security warnings and key visibility controls

**useTurnkey Usage:**
- Uses `indexedDbClient.exportWalletAccount()` to retrieve encrypted export bundle
- Handles secure key export with proper encryption/decryption
- Manages organization-specific wallet exports

---

## 7. **`src/components/auth/google-auth.tsx`**
**Purpose:** Google OAuth authentication component

**Key Features:**
- Google OAuth popup and redirect flows
- JWT token handling and validation
- State management for authentication flow
- Configurable authentication modes

**useTurnkey Usage:**
- Uses `indexedDbClient.getPublicKey()` for nonce generation
- Integrates with the auth hook for session establishment
- Handles OAuth token processing with Turnkey authentication
