/* ────────────────────────────────────────
   HoudiniSwap Client Service
   
   Client-side wrappers for /api/houdini/* serverless endpoints.
   All API keys are kept server-side — these functions only
   communicate with our own proxy.
   ──────────────────────────────────────── */

const DEV_PREFIX = import.meta.env.DEV ? '' : ''

/**
 * Get a quote for a SOL → SOL private swap
 * @param {number} amount — SOL amount to swap
 * @returns {{ amountIn, amountOut, min, max, duration }}
 */
export async function getQuote(amount) {
    const params = new URLSearchParams({ amount: String(amount), anonymous: 'true' })
    const res = await fetch(`${DEV_PREFIX}/api/houdini/quote?${params}`)

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Quote failed: ${res.status}`)
    }

    return res.json()
}

/**
 * Create a HoudiniSwap exchange order
 * @param {number} amount — SOL amount to send
 * @param {string} addressTo — destination Solana address
 * @returns {{ houdiniId, senderAddress, inAmount, outAmount, status, eta, expires }}
 */
export async function createExchange(amount, addressTo) {
    const res = await fetch(`${DEV_PREFIX}/api/houdini/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount,
            addressTo,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Exchange failed: ${res.status}`)
    }

    return res.json()
}

/**
 * Poll the status of a HoudiniSwap order
 * @param {string} houdiniId — the order ID
 * @returns {{ status, statusLabel, houdiniId, inAmount, outAmount, ... }}
 */
export async function getSwapStatus(houdiniId) {
    const res = await fetch(`${DEV_PREFIX}/api/houdini/status?id=${encodeURIComponent(houdiniId)}`)

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Status check failed: ${res.status}`)
    }

    return res.json()
}

/**
 * Status code constants for UI logic
 */
export const SWAP_STATUS = {
    NEW: -1,
    WAITING: 0,
    CONFIRMING: 1,
    EXCHANGING: 2,
    ANONYMIZING: 3,
    FINISHED: 4,
    EXPIRED: 5,
    FAILED: 6,
    REFUNDED: 7,
    DELETED: 8,
}

/**
 * Check if a status code represents a terminal state (no more polling needed)
 */
export function isTerminalStatus(status) {
    return [
        SWAP_STATUS.FINISHED,
        SWAP_STATUS.EXPIRED,
        SWAP_STATUS.FAILED,
        SWAP_STATUS.REFUNDED,
        SWAP_STATUS.DELETED,
    ].includes(status)
}
