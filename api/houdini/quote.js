/**
 * Vercel Serverless Proxy — HoudiniSwap Quote
 *
 * Proxies GET /quote requests to HoudiniSwap.
 * API key/secret stored server-side only.
 *
 * Client calls:  GET /api/houdini/quote?amount=0.5
 * Proxy calls:   GET https://api-partner.houdiniswap.com/quote?amount=0.5&from=SOL&to=SOL&anonymous=true
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const apiKey = (process.env.HOUDINI_API_KEY || '').trim()
    const apiSecret = (process.env.HOUDINI_API_SECRET || '').trim()
    if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: 'HoudiniSwap credentials not configured' })
    }

    const { amount, anonymous = 'true' } = req.query
    if (!amount) {
        return res.status(400).json({ error: 'amount parameter is required' })
    }

    try {
        const params = new URLSearchParams({
            amount,
            from: 'SOL',
            to: 'SOL',
            anonymous: anonymous === 'true' ? 'true' : 'false',
        })

        const url = `https://api-partner.houdiniswap.com/quote?${params}`
        console.log('Fetching quote from:', url)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json',
            },
        })

        const text = await response.text()
        console.log('HoudiniSwap response status:', response.status, 'body:', text)

        let data
        try { data = JSON.parse(text) } catch { data = { raw: text } }

        if (!response.ok) {
            return res.status(response.status).json({ error: data.message || data.error || text || 'Quote request failed' })
        }

        return res.status(200).json(data)
    } catch (err) {
        console.error('HoudiniSwap quote proxy error:', err.message, err.stack)
        return res.status(502).json({ error: `Failed to fetch quote: ${err.message}` })
    }
}
