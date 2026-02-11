/* ────────────────────────────────────────
   Privacy Cash Service — Browser wrapper
   
   Replaces houdiniService.js.
   Calls the Privacy Cash SDK's lower-level functions directly,
   bypassing the PrivacyCash class (which has Node-only imports).
   ──────────────────────────────────────── */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
    deposit,
    withdraw,
    getUtxos,
    getBalanceFromUtxos,
    EncryptionService,
} from 'privacycash/utils'
import { WasmFactory } from '@lightprotocol/hasher.rs'

/* ── Constants ── */

// Circuit files served as static assets from /public/circuits/
const CIRCUIT_BASE_PATH = '/circuits/transaction2'

// Privacy operation status constants
export const PRIVACY_STATUS = {
    IDLE: 'idle',
    SHIELDING: 'shielding',
    GENERATING_PROOF: 'generating_proof',
    SUBMITTING: 'submitting',
    CONFIRMING: 'confirming',
    COMPLETE: 'complete',
    ERROR: 'error',

    UNSHIELDING: 'unshielding',
}

/* ── Browser-compatible localStorage adapter ──
   The SDK expects a storage object with getItem/setItem/removeItem.
   Browser localStorage satisfies this interface directly. */
const browserStorage = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
}

/* ── Create SDK primitives from a wallet's secret key ── */

/**
 * Initialize Privacy Cash primitives for a given wallet.
 * @param {string} rpcUrl — Solana RPC endpoint
 * @param {number[]} secretKeyBytes — wallet's secretKey array (from walletService)
 * @returns {{ connection, keypair, encryptionService, publicKey }}
 */
export function initPrivacyCash(rpcUrl, secretKeyBytes) {
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyBytes))
    const connection = new Connection(rpcUrl, 'confirmed')
    const encryptionService = new EncryptionService()
    encryptionService.deriveEncryptionKeyFromWallet(keypair)

    return {
        connection,
        keypair,
        encryptionService,
        publicKey: keypair.publicKey,
    }
}

/* ── Shield (Deposit) SOL into the privacy pool ── */

/**
 * Shield SOL into the Privacy Cash pool.
 * @param {object} client — from initPrivacyCash()
 * @param {number} amountSOL — amount in SOL
 * @param {function} onStatus — callback for status updates
 * @returns {{ tx: string }} — transaction signature
 */
export async function shieldSol(client, amountSOL, onStatus) {
    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL)

    onStatus?.(PRIVACY_STATUS.SHIELDING)

    try {
        onStatus?.(PRIVACY_STATUS.GENERATING_PROOF)

        const lightWasm = await WasmFactory.getInstance()

        onStatus?.(PRIVACY_STATUS.SUBMITTING)

        const result = await deposit({
            lightWasm,
            amount_in_lamports: lamports,
            connection: client.connection,
            encryptionService: client.encryptionService,
            publicKey: client.publicKey,
            transactionSigner: async (tx) => {
                tx.sign([client.keypair])
                return tx
            },
            keyBasePath: CIRCUIT_BASE_PATH,
            storage: browserStorage,
        })

        onStatus?.(PRIVACY_STATUS.COMPLETE)
        return result // { tx: string }
    } catch (err) {
        onStatus?.(PRIVACY_STATUS.ERROR)
        throw err
    }
}

/* ── Unshield (Withdraw) SOL from the privacy pool ── */

/**
 * Unshield SOL from the Privacy Cash pool to any address.
 * @param {object} client — from initPrivacyCash()
 * @param {number} amountSOL — amount in SOL
 * @param {string} recipientAddress — destination Solana address
 * @param {function} onStatus — callback for status updates
 * @returns {{ tx, recipient, amount_in_lamports, fee_in_lamports, isPartial }}
 */
export async function unshieldSol(client, amountSOL, recipientAddress, onStatus) {
    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL)

    onStatus?.(PRIVACY_STATUS.UNSHIELDING)

    try {
        onStatus?.(PRIVACY_STATUS.GENERATING_PROOF)

        const lightWasm = await WasmFactory.getInstance()

        onStatus?.(PRIVACY_STATUS.SUBMITTING)

        const result = await withdraw({
            lightWasm,
            amount_in_lamports: lamports,
            connection: client.connection,
            encryptionService: client.encryptionService,
            publicKey: client.publicKey,
            recipient: recipientAddress,
            keyBasePath: CIRCUIT_BASE_PATH,
            storage: browserStorage,
        })

        onStatus?.(PRIVACY_STATUS.COMPLETE)
        return result // { tx, recipient, amount_in_lamports, fee_in_lamports, isPartial }
    } catch (err) {
        onStatus?.(PRIVACY_STATUS.ERROR)
        throw err
    }
}

/* ── Get Private (Shielded) Balance ── */

/**
 * Get the shielded SOL balance in the Privacy Cash pool.
 * @param {object} client — from initPrivacyCash()
 * @returns {{ lamports: number }} — balance in lamports
 */
export async function getPrivateBalance(client) {
    const utxos = await getUtxos({
        publicKey: client.publicKey,
        connection: client.connection,
        encryptionService: client.encryptionService,
        storage: browserStorage,
    })

    return getBalanceFromUtxos(utxos) // { lamports: number }
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
    return lamports / LAMPORTS_PER_SOL
}
