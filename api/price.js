/**
 * Vercel Serverless Proxy — SOL Price
 *
 * Proxies CoinGecko price requests to avoid CORS issues.
 * Caches for 30s to avoid rate limits.
 *
 * Client calls:  GET /api/price
 * Proxy calls:   GET https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd
 */

let cached = { price: null, ts: 0 }
const CACHE_TTL = 30_000 // 30s

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    // Return cached value if fresh
    if (cached.price && Date.now() - cached.ts < CACHE_TTL) {
        return res.status(200).json({ solana: { usd: cached.price } })
    }

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { headers: { 'Accept': 'application/json' } }
        )

        if (!response.ok) {
            // If rate limited, return stale cache if available
            if (response.status === 429 && cached.price) {
                return res.status(200).json({ solana: { usd: cached.price } })
            }
            return res.status(response.status).json({ error: 'Price fetch failed' })
        }

        const data = await response.json()
        if (data?.solana?.usd) {
            cached = { price: data.solana.usd, ts: Date.now() }
        }

        return res.status(200).json(data)
    } catch (err) {
        // Return stale cache on error
        if (cached.price) {
            return res.status(200).json({ solana: { usd: cached.price } })
        }
        console.error('Price proxy error:', err.message)
        return res.status(502).json({ error: 'Failed to fetch price' })
    }
}
