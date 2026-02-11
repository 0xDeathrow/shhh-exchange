import { Keypair, Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'
import { encrypt, decrypt, hashPassphrase } from './crypto.js'

/* ────────────────────────────────────────
   RPC endpoint — proxied through Vercel serverless
   In dev:  falls back to .env.local VITE_ var for local testing
   In prod: /api/rpc hides the real RPC key entirely
   ──────────────────────────────────────── */
const RPC_PROXY = '/api/rpc'
const DEV_RPC = import.meta.env.VITE_SOLANA_RPC_URL || null

/**
 * Make a JSON-RPC call, using the proxy in production
 * and falling back to direct RPC in development
 */
async function rpcCall(method, params = []) {
    const body = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
    }

    // In dev with Vite, /api/rpc won't exist — use direct RPC
    const url = import.meta.env.DEV && DEV_RPC ? DEV_RPC : RPC_PROXY

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`RPC request failed: ${res.status}`)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message || 'RPC error')
    return json.result
}

/* ────────────────────────────────────────
   Wallet storage key — scoped to user's passphrase hash
   ──────────────────────────────────────── */
const STORAGE_PREFIX = 'whispr_wallets_'

async function getStorageKey(passphrase) {
    const hash = await hashPassphrase(passphrase)
    return `${STORAGE_PREFIX}${hash}`
}

/* ────────────────────────────────────────
   Keypair Operations
   ──────────────────────────────────────── */

/**
 * Create a new Solana wallet
 * @returns {{ id, name, address, secretKey: number[] }}
 */
export function createWallet(name = 'Wallet') {
    const keypair = Keypair.generate()
    return {
        id: crypto.randomUUID(),
        name,
        address: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey), // Uint8Array → plain array for JSON
        balance: 0,
        holdings: 0,
        archived: false,
    }
}

/**
 * Import a wallet from a base58- or byte-array-encoded private key
 * @param {string} name 
 * @param {string} privateKeyB58 — base58-encoded secret key
 * @returns {{ id, name, address, secretKey: number[] }}
 */
export function importWallet(name, privateKeyB58) {
    let secretKeyBytes
    try {
        secretKeyBytes = bs58.decode(privateKeyB58)
    } catch {
        throw new Error('Invalid private key format. Expected base58-encoded key.')
    }

    if (secretKeyBytes.length !== 64) {
        throw new Error(`Invalid key length: expected 64 bytes, got ${secretKeyBytes.length}`)
    }

    const keypair = Keypair.fromSecretKey(secretKeyBytes)
    return {
        id: crypto.randomUUID(),
        name: name || 'Imported',
        address: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        balance: 0,
        holdings: 0,
        archived: false,
    }
}

/* ────────────────────────────────────────
   Encrypted Storage
   ──────────────────────────────────────── */

/**
 * Encrypt the full wallet array (including secret keys) and store in localStorage
 */
export async function encryptAndStore(passphrase, wallets) {
    const key = await getStorageKey(passphrase)
    const encrypted = await encrypt(passphrase, wallets)
    localStorage.setItem(key, JSON.stringify(encrypted))
}

/**
 * Load and decrypt wallets from localStorage
 * Returns empty array if nothing stored or passphrase wrong
 */
export async function loadAndDecrypt(passphrase) {
    const key = await getStorageKey(passphrase)
    const stored = localStorage.getItem(key)
    if (!stored) return []
    try {
        const encrypted = JSON.parse(stored)
        return await decrypt(passphrase, encrypted)
    } catch {
        console.warn('Failed to decrypt wallets — wrong passphrase or corrupted data')
        return []
    }
}

/**
 * Strip secret keys from wallet array → safe for React state
 * @returns wallets without secretKey field
 */
export function getPublicData(wallets) {
    return wallets.map(({ secretKey, ...rest }) => rest)
}

/**
 * Get the base58-encoded private key for a specific wallet
 * @returns {string|null} base58 private key or null if wallet not found
 */
export function getPrivateKeyB58(wallets, walletId) {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet?.secretKey) return null
    return bs58.encode(new Uint8Array(wallet.secretKey))
}

/* ────────────────────────────────────────
   Balance Fetching via RPC
   ──────────────────────────────────────── */

/**
 * Fetch SOL balances for a list of addresses
 * @param {string[]} addresses — base58 public keys
 * @returns {Object} { address: balanceInSOL }
 */
export async function fetchBalances(addresses) {
    const results = {}

    // Batch sequentially to avoid rate limits
    for (const addr of addresses) {
        try {
            const result = await rpcCall('getBalance', [addr])
            results[addr] = (result?.value ?? 0) / 1e9 // lamports → SOL
        } catch (err) {
            console.warn(`Failed to fetch balance for ${addr}:`, err.message)
            results[addr] = 0
        }
    }

    return results
}

/**
 * Fetch SPL token account count for an address
 * @param {string} address — base58 public key
 * @returns {number} number of token accounts
 */
export async function fetchTokenHoldings(address) {
    try {
        const result = await rpcCall('getTokenAccountsByOwner', [
            address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
        ])
        return result?.value?.length ?? 0
    } catch (err) {
        console.warn(`Failed to fetch token holdings for ${address}:`, err.message)
        return 0
    }
}

/**
 * Fetch balances and token counts for all wallets, return updated array
 * @param {Array} wallets — public wallet data
 * @returns {Array} wallets with updated balance and holdings
 */
export async function refreshWalletData(wallets) {
    if (wallets.length === 0) return wallets

    const activeWallets = wallets.filter(w => !w.archived)
    const addresses = activeWallets.map(w => w.address)

    // Fetch balances
    const balances = await fetchBalances(addresses)

    // Fetch token holdings for each
    const holdingsMap = {}
    for (const addr of addresses) {
        holdingsMap[addr] = await fetchTokenHoldings(addr)
    }

    return wallets.map(w => ({
        ...w,
        balance: balances[w.address] ?? w.balance,
        holdings: holdingsMap[w.address] ?? w.holdings,
    }))
}

/* ────────────────────────────────────────
   SOL Transfer — Browser-side signing
   ──────────────────────────────────────── */

/**
 * Send SOL from one wallet to an address, signed entirely in the browser.
 * The secret key never leaves the user's device.
 * @param {number[]} secretKeyBytes — the wallet's secretKey array
 * @param {string} toAddress — recipient Solana address (base58)
 * @param {number} amountSOL — amount in SOL
 * @returns {{ signature: string }} — the transaction signature
 */
export async function sendSol(secretKeyBytes, toAddress, amountSOL) {
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyBytes))

    // Use the same RPC logic as the rest of the app
    const rpcUrl = import.meta.env.DEV && DEV_RPC ? DEV_RPC : RPC_PROXY

    // For signing we need a proper Connection object
    const connection = new Connection(rpcUrl, 'confirmed')

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
        })
    )

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = keypair.publicKey

    // Sign the transaction
    transaction.sign(keypair)

    // Send the signed transaction
    const rawTx = transaction.serialize()
    const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
    })

    // Wait for confirmation
    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed')

    return { signature }
}

/* ────────────────────────────────────────
   Encrypted Backup — Export / Import
   ──────────────────────────────────────── */

/**
 * Export an encrypted backup file (.whispr)
 * Contains: encrypted profile + encrypted wallets — no plaintext keys
 * @param {string} passphrase
 */
export async function exportBackup(passphrase) {
    const hash = await hashPassphrase(passphrase)
    const profileKey = `whispr_${hash}`
    const walletsKey = `${STORAGE_PREFIX}${hash}`

    const backup = {
        version: 1,
        format: 'whispr-backup',
        exportedAt: new Date().toISOString(),
        profile: localStorage.getItem(profileKey) || null,
        wallets: localStorage.getItem(walletsKey) || null,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whispr-backup-${new Date().toISOString().slice(0, 10)}.whispr`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Import an encrypted backup file (.whispr)
 * Restores profile + wallets to localStorage, then decrypts wallets
 * @param {File} file — the .whispr file
 * @param {string} passphrase — must match the passphrase used to create the backup
 * @returns {{ profile: object, wallets: Array }} decrypted data
 */
export async function importBackup(file, passphrase) {
    const text = await file.text()
    let backup

    try {
        backup = JSON.parse(text)
    } catch {
        throw new Error('Invalid backup file format.')
    }

    if (backup.format !== 'whispr-backup') {
        throw new Error('Not a valid WHISPR backup file.')
    }

    const hash = await hashPassphrase(passphrase)
    const profileKey = `whispr_${hash}`
    const walletsKey = `${STORAGE_PREFIX}${hash}`

    // Store encrypted blobs in localStorage
    if (backup.profile) {
        localStorage.setItem(profileKey, backup.profile)
    }
    if (backup.wallets) {
        localStorage.setItem(walletsKey, backup.wallets)
    }

    // Decrypt and return
    let profile = null
    if (backup.profile) {
        try {
            const encProfile = JSON.parse(backup.profile)
            profile = await decrypt(passphrase, encProfile)
        } catch {
            throw new Error('Wrong passphrase — cannot decrypt this backup.')
        }
    }

    const wallets = await loadAndDecrypt(passphrase)
    return { profile, wallets }
}
