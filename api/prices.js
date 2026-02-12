/**
 * Vercel Serverless Proxy — Multi-Token Prices
 *
 * Proxies CoinGecko price requests to avoid CORS issues.
 * Returns USD prices for SOL and all supported swap tokens.
 * Caches for 30s to avoid rate limits.
 *
 * Client calls:  GET /api/prices
 * Returns: { solana: { usd: N }, "usd-coin": { usd: N }, tether: { usd: N }, zcash: { usd: N }, ore: { usd: N }, "store-protocol": { usd: N } }
 */

let cached = { data: null, ts: 0 }
const CACHE_TTL = 30_000 // 30s

const COINGECKO_IDS = 'solana,usd-coin,tether,zcash,ore,store-protocol'

// Mapping from our token names to CoinGecko IDs
// Used by the client to look up prices
// sol -> solana, usdc -> usd-coin, usdt -> tether, zec -> zcash, ore -> ore, store -> store-protocol

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    // Return cached value if fresh
    if (cached.data && Date.now() - cached.ts < CACHE_TTL) {
        return res.status(200).json(cached.data)
    }

    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd`,
            { headers: { 'Accept': 'application/json' } }
        )

        if (!response.ok) {
            // If rate limited, return stale cache if available
            if (response.status === 429 && cached.data) {
                return res.status(200).json(cached.data)
            }
            return res.status(response.status).json({ error: 'Price fetch failed' })
        }

        const data = await response.json()
        cached = { data, ts: Date.now() }

        return res.status(200).json(data)
    } catch (err) {
        // Return stale cache on error
        if (cached.data) {
            return res.status(200).json(cached.data)
        }
        console.error('Prices proxy error:', err.message)
        return res.status(502).json({ error: 'Failed to fetch prices' })
    }
}
