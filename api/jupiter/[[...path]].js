/**
 * Vercel Serverless Proxy for Jupiter Swap API
 * 
 * Proxies requests to the Jupiter API at api.jup.ag.
 * The API key is stored in JUPITER_API_KEY env var
 * and injected server-side (never exposed to browser).
 *
 * Routes:
 *   GET  /api/jupiter/swap/v1/quote?...  → GET  https://api.jup.ag/swap/v1/quote?...
 *   POST /api/jupiter/swap/v1/swap       → POST https://api.jup.ag/swap/v1/swap
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    // Extract the path after /api/jupiter/
    // req.url comes in as /api/jupiter/swap/v1/quote?inputMint=...
    const fullPath = req.url.replace(/^\/api\/jupiter\/?/, '')
    if (!fullPath) {
        return res.status(400).json({ error: 'Missing Jupiter API path' })
    }

    const targetUrl = `https://api.jup.ag/${fullPath}`

    // Build headers — inject API key if available
    const headers = { 'Content-Type': 'application/json' }
    const apiKey = process.env.JUPITER_API_KEY
    if (apiKey) {
        headers['x-api-key'] = apiKey
    }

    try {
        const fetchOpts = {
            method: req.method,
            headers,
        }

        // Forward body for POST requests
        if (req.method === 'POST' && req.body) {
            fetchOpts.body = JSON.stringify(req.body)
        }

        const response = await fetch(targetUrl, fetchOpts)
        const data = await response.json()
        return res.status(response.status).json(data)
    } catch (err) {
        console.error('Jupiter proxy error:', err)
        return res.status(502).json({ error: 'Jupiter API request failed' })
    }
}
