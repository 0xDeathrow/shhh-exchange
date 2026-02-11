/**
 * Vercel Serverless Proxy for Solana RPC
 * 
 * Proxies JSON-RPC requests to the Solana RPC endpoint.
 * The RPC URL (with API key) is stored in environment variables
 * and NEVER reaches the browser.
 * 
 * Client calls:  POST /api/rpc  { method, params, ... }
 * Proxy calls:   POST <SOLANA_RPC_URL>  (same body)
 */
export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    const rpcUrl = process.env.SOLANA_RPC_URL
    if (!rpcUrl) {
        return res.status(500).json({ error: 'RPC endpoint not configured' })
    }

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        })

        const data = await response.json()
        return res.status(200).json(data)
    } catch (err) {
        console.error('RPC proxy error:', err)
        return res.status(502).json({ error: 'RPC request failed' })
    }
}
