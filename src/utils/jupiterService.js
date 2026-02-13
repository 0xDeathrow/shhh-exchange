/* ────────────────────────────────────────
   Jupiter DEX Service — Swap via Metis API
   
   Wraps the Jupiter Metis Swap v1 API to perform
   token swaps on Solana after the privacy unshield step.
   
   Flow:  getSwapQuote() → executeSwap()
   ──────────────────────────────────────── */

import { VersionedTransaction, Connection } from '@solana/web3.js'

/* ── Token Mint Addresses (Solana mainnet) ── */
export const JUPITER_TOKEN_MINTS = {
    sol: 'So11111111111111111111111111111111111111112',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    zec: 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
    ore: 'oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp',
    store: 'sTorERYB6xAZ1SSbwpK3zoK2EEwbBrc7TZAzg1uCGiH',
}

/* ── Decimals per token (for display conversions) ── */
export const TOKEN_DECIMALS = {
    sol: 9,
    usdc: 6,
    usdt: 6,
    zec: 8,
    ore: 11,
    store: 11,
}

/* ── API base URL ──
   In dev we call the Jupiter API directly (Vite proxy handles CORS).
   In prod we call our Vercel serverless proxy at /api/jupiter. */
function getApiBase() {
    if (import.meta.env.DEV) {
        return '/jupiter-api'   // Vite dev proxy → https://api.jup.ag
    }
    return '/api/jupiter'       // Vercel serverless proxy
}

/* ── Build common headers ── */
function getHeaders() {
    return { 'Content-Type': 'application/json' }
}

/* ────────────────────────────────────────
   Get a swap quote from Jupiter
   
   @param {string} inputMint  — input token mint address
   @param {string} outputMint — output token mint address
   @param {number} amount     — raw amount in smallest units (lamports for SOL)
   @param {number} slippageBps — slippage tolerance in basis points (default: 100 = 1%)
   @returns {object} — Jupiter quote response
   ──────────────────────────────────────── */
export async function getSwapQuote(inputMint, outputMint, amount, slippageBps = 100) {
    const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(Math.floor(amount)),
        slippageBps: String(slippageBps),
        restrictIntermediateTokens: 'true',
    })

    const url = `${getApiBase()}/swap/v1/quote?${params}`
    const res = await fetch(url, { headers: getHeaders() })

    if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        throw new Error(`Jupiter quote failed (${res.status}): ${errText}`)
    }

    const quote = await res.json()
    if (quote.error) throw new Error(`Jupiter quote error: ${quote.error}`)
    return quote
}

/* ────────────────────────────────────────
   Build a swap transaction from a quote
   
   @param {object} quoteResponse — from getSwapQuote()
   @param {string} userPublicKey — base58 public key of the signer
   @returns {object} — { swapTransaction (base64), lastValidBlockHeight }
   ──────────────────────────────────────── */
export async function buildSwapTransaction(quoteResponse, userPublicKey) {
    const url = `${getApiBase()}/swap/v1/swap`
    const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            quoteResponse,
            userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicSlippage: { maxBps: 300 },
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
        }),
    })

    if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        throw new Error(`Jupiter swap TX build failed (${res.status}): ${errText}`)
    }

    const data = await res.json()
    if (data.error) throw new Error(`Jupiter swap error: ${data.error}`)
    return data
}

/* ────────────────────────────────────────
   Execute a full Jupiter swap
   
   1. Gets a quote for the swap
   2. Builds a swap transaction
   3. Signs with the wallet keypair
   4. Sends via RPC and confirms
   
   @param {object} opts
   @param {object} opts.keypair    — Solana Keypair of the destination wallet
   @param {object} opts.connection — Solana Connection
   @param {string} opts.inputMint  — input token mint
   @param {string} opts.outputMint — output token mint
   @param {number} opts.amount     — raw amount in input token's smallest unit
   @param {number} opts.slippageBps — slippage (default 100 = 1%)
   @param {function} opts.onStatus — optional status callback
   @returns {{ txSignature, inputAmount, outputAmount, quote }}
   ──────────────────────────────────────── */
export async function executeSwap({
    keypair,
    connection,
    inputMint,
    outputMint,
    amount,
    slippageBps = 100,
    onStatus,
}) {
    // 1. Get quote
    onStatus?.('Getting Jupiter quote...')
    const quote = await getSwapQuote(inputMint, outputMint, amount, slippageBps)

    // 2. Build transaction
    onStatus?.('Building swap transaction...')
    const { swapTransaction, lastValidBlockHeight } = await buildSwapTransaction(
        quote,
        keypair.publicKey.toBase58(),
    )

    // 3. Deserialize and sign
    onStatus?.('Signing swap transaction...')
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0))
    const transaction = VersionedTransaction.deserialize(txBuf)
    transaction.sign([keypair])

    // 4. Send transaction (with retries)
    onStatus?.('Submitting swap to Solana...')
    const rawTx = transaction.serialize()
    const txSignature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: true,
        maxRetries: 5,
    })

    // 5. Poll for confirmation using HTTP (no WebSocket needed)
    //    confirmTransaction() uses WebSocket internally, which fails through
    //    Vercel's serverless proxy. Instead we poll with getSignatureStatuses.
    onStatus?.('Confirming swap transaction...')
    const maxPolls = 60          // ~60 seconds max
    const pollIntervalMs = 1000
    let confirmed = false

    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, pollIntervalMs))

        try {
            const { value } = await connection.getSignatureStatuses([txSignature])
            const status = value?.[0]

            if (status) {
                if (status.err) {
                    throw new Error(`Swap transaction failed on-chain: ${JSON.stringify(status.err)}`)
                }
                if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                    confirmed = true
                    break
                }
            }

            // Also check if blockhash has expired
            if (lastValidBlockHeight) {
                const currentHeight = await connection.getBlockHeight('confirmed')
                if (currentHeight > lastValidBlockHeight) {
                    throw new Error('Swap transaction expired (block height exceeded). Please try again.')
                }
            }
        } catch (pollErr) {
            // If it's our own error (not a network glitch), re-throw
            if (pollErr.message.includes('failed on-chain') || pollErr.message.includes('expired')) {
                throw pollErr
            }
            // Otherwise keep polling (transient RPC error)
            console.warn('Confirmation poll error (retrying):', pollErr.message)
        }

        if (i % 5 === 4) {
            onStatus?.(`Still confirming... (${i + 1}s)`)
            // Re-send the transaction in case it was dropped
            try {
                await connection.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 2 })
            } catch (_) { /* ignore re-send errors */ }
        }
    }

    if (!confirmed) {
        throw new Error('Swap transaction confirmation timed out. Check Solscan for tx: ' + txSignature)
    }

    onStatus?.('Swap complete!')
    return {
        txSignature,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        quote,
    }
}

/* ────────────────────────────────────────
   Helper: convert token amount to human-readable
   ──────────────────────────────────────── */
export function toHumanAmount(rawAmount, tokenSymbol) {
    const decimals = TOKEN_DECIMALS[tokenSymbol?.toLowerCase()] || 9
    return Number(rawAmount) / Math.pow(10, decimals)
}

export function toRawAmount(humanAmount, tokenSymbol) {
    const decimals = TOKEN_DECIMALS[tokenSymbol?.toLowerCase()] || 9
    return Math.floor(humanAmount * Math.pow(10, decimals))
}
