/**
 * Vercel Serverless Proxy — HoudiniSwap Exchange
 *
 * Creates a HoudiniSwap CEX exchange order.
 * API key/secret + compliance fields added server-side.
 *
 * Client calls:  POST /api/houdini/exchange { amount, addressTo }
 * Proxy calls:   POST https://api-partner.houdiniswap.com/exchange
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const apiKey = process.env.HOUDINI_API_KEY
    const apiSecret = process.env.HOUDINI_API_SECRET
    if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: 'HoudiniSwap credentials not configured' })
    }

    const { amount, addressTo } = req.body || {}
    if (!amount || !addressTo) {
        return res.status(400).json({ error: 'amount and addressTo are required' })
    }

    // Extract compliance fields from the request
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || '0.0.0.0'

    const userAgent = req.headers['user-agent'] || 'WHISPR Exchange'
    const timezone = req.body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    try {
        const response = await fetch('https://api-partner.houdiniswap.com/exchange', {
            method: 'POST',
            headers: {
                'Authorization': `${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Number(amount),
                from: 'SOL',
                to: 'SOL',
                anonymous: true,
                addressTo,
                ip,
                userAgent,
                timezone,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || data.error || 'Exchange creation failed',
            })
        }

        // Return only what the client needs — never expose full API response internals
        return res.status(200).json({
            houdiniId: data.houdiniId,
            senderAddress: data.senderAddress,
            inAmount: data.inAmount,
            outAmount: data.outAmount,
            status: data.status,
            eta: data.eta,
            expires: data.expires,
        })
    } catch (err) {
        console.error('HoudiniSwap exchange proxy error:', err)
        return res.status(502).json({ error: 'Failed to create exchange' })
    }
}
