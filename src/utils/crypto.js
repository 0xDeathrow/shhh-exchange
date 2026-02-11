import { generateMnemonic } from 'bip39'

// Fixed app salt — acceptable because BIP39 passphrases have 128-bit entropy
const APP_SALT = 'WHISPR_EXCHANGE_SALT_v1'

/**
 * Generate a 12-word BIP39 mnemonic passphrase
 */
export function generatePassphrase() {
    return generateMnemonic()
}

/**
 * Hash passphrase to create a localStorage key
 */
export async function hashPassphrase(passphrase) {
    const enc = new TextEncoder()
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(passphrase))
    const hashArray = Array.from(new Uint8Array(digest))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase using PBKDF2
 */
export async function deriveKey(passphrase) {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode(APP_SALT),
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Encrypt data with AES-GCM
 * @returns {{ iv: string, data: string }} base64 encoded
 */
export async function encrypt(passphrase, plaintext) {
    const key = await deriveKey(passphrase)
    const enc = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(JSON.stringify(plaintext))
    )
    return {
        iv: btoa(String.fromCharCode(...iv)),
        data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    }
}

/**
 * Decrypt data with AES-GCM
 * @returns {object} parsed JSON
 */
export async function decrypt(passphrase, { iv, data }) {
    const key = await deriveKey(passphrase)
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(data), c => c.charCodeAt(0))
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        ciphertext
    )
    return JSON.parse(new TextDecoder().decode(plaintext))
}

/**
 * Create a new account — encrypt profile and store in localStorage
 */
export async function createAccount(passphrase, username = 'Anon') {
    const hash = await hashPassphrase(passphrase)
    const profile = { username, createdAt: Date.now(), settings: {} }
    const encrypted = await encrypt(passphrase, profile)
    localStorage.setItem(`whispr_${hash}`, JSON.stringify(encrypted))
    return profile
}

/**
 * Access an existing account — decrypt from localStorage
 * Returns null if no account found or passphrase is wrong
 */
export async function accessAccount(passphrase) {
    const hash = await hashPassphrase(passphrase)
    const stored = localStorage.getItem(`whispr_${hash}`)
    if (!stored) return null
    try {
        const encrypted = JSON.parse(stored)
        return await decrypt(passphrase, encrypted)
    } catch {
        return null
    }
}
