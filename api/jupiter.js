/**
 * Vercel Serverless Proxy for Jupiter Swap API
 * 
 * Receives all requests rewritten from /api/jupiter/* via vercel.json.
 * Forwards to api.jup.ag with the API key injected server-side.
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()

    // Extract the sub-path: /api/jupiter/swap/v1/quote?... → swap/v1/quote?...
    const url = new URL(req.url, `https://${req.headers.host}`)
    const subPath = url.pathname.replace(/^\/api\/jupiter\/?/, '')
    if (!subPath) return res.status(400).json({ error: 'Missing Jupiter API path' })

    const targetUrl = `https://api.jup.ag/${subPath}${url.search}`

    const headers = { 'Content-Type': 'application/json' }
    if (process.env.JUPITER_API_KEY) {
        headers['x-api-key'] = process.env.JUPITER_API_KEY
    }

    try {
        const fetchOpts = { method: req.method, headers }
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
