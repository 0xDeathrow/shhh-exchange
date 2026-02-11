/* ────────────────────────────────────────
   Swap History — Encrypted localStorage persistence
   
   Stores swap records encrypted with the user's passphrase
   (same AES-GCM pattern as wallet storage).
   ──────────────────────────────────────── */

import { encrypt, decrypt, hashPassphrase } from './crypto.js'

const HISTORY_PREFIX = 'whispr_swaps_'

async function getHistoryKey(passphrase) {
    const hash = await hashPassphrase(passphrase)
    return `${HISTORY_PREFIX}${hash}`
}

/**
 * Load swap history from encrypted localStorage
 * @param {string} passphrase
 * @returns {Array} swap records, newest first
 */
export async function getSwapHistory(passphrase) {
    const key = await getHistoryKey(passphrase)
    const stored = localStorage.getItem(key)
    if (!stored) return []

    try {
        const encrypted = JSON.parse(stored)
        const records = await decrypt(passphrase, encrypted)
        return records.sort((a, b) => b.createdAt - a.createdAt)
    } catch {
        console.warn('Failed to decrypt swap history')
        return []
    }
}

/**
 * Save a new swap record to encrypted history
 * @param {string} passphrase
 * @param {object} swap — swap record
 */
export async function saveSwap(passphrase, swap) {
    const existing = await getSwapHistory(passphrase)
    const record = {
        id: crypto.randomUUID(),
        ...swap,
        createdAt: swap.createdAt || Date.now(),
    }

    existing.unshift(record) // add to front (newest first)

    const key = await getHistoryKey(passphrase)
    const encrypted = await encrypt(passphrase, existing)
    localStorage.setItem(key, JSON.stringify(encrypted))

    return record
}

/**
 * Update a swap record by houdiniId
 * @param {string} passphrase
 * @param {string} houdiniId
 * @param {object} updates — fields to merge
 */
export async function updateSwap(passphrase, houdiniId, updates) {
    const existing = await getSwapHistory(passphrase)
    const idx = existing.findIndex(s => s.houdiniId === houdiniId)
    if (idx === -1) return null

    existing[idx] = { ...existing[idx], ...updates }

    const key = await getHistoryKey(passphrase)
    const encrypted = await encrypt(passphrase, existing)
    localStorage.setItem(key, JSON.stringify(encrypted))

    return existing[idx]
}

/**
 * Export swap history as a CSV file download
 * @param {string} passphrase
 */
export async function exportSwapHistory(passphrase) {
    const records = await getSwapHistory(passphrase)
    if (records.length === 0) return

    const headers = ['Date', 'Houdini ID', 'TX Signature', 'Source Wallet', 'Source Address',
        'Destination', 'Amount Sent (SOL)', 'Amount Received (SOL)', 'Status']

    const rows = records.map(r => [
        new Date(r.createdAt).toISOString(),
        r.houdiniId || '',
        r.txSignature || '',
        r.sourceWallet?.name || '',
        r.sourceWallet?.address || '',
        r.destAddress || '',
        r.amountIn ?? '',
        r.amountOut ?? '',
        r.statusLabel || '',
    ])

    const csv = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whispr-swaps-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
