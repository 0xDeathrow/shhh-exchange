/**
 * Vercel Serverless Proxy — HoudiniSwap Status
 *
 * Polls the status of a HoudiniSwap exchange order.
 *
 * Client calls:  GET /api/houdini/status?id=houdiniId
 * Proxy calls:   GET https://api-partner.houdiniswap.com/status?id=houdiniId
 */

const STATUS_LABELS = {
    '-1': 'Created',
    '0': 'Awaiting Deposit',
    '1': 'Confirming',
    '2': 'Processing',
    '3': 'Anonymizing',
    '4': 'Complete',
    '5': 'Expired',
    '6': 'Failed',
    '7': 'Refunded',
    '8': 'Deleted',
}

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

    const { id } = req.query
    if (!id) {
        return res.status(400).json({ error: 'id parameter is required' })
    }

    try {
        const response = await fetch(
            `https://api-partner.houdiniswap.com/status?id=${encodeURIComponent(id)}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `${apiKey}:${apiSecret}`,
                    'Content-Type': 'application/json',
                },
            }
        )

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || 'Status request failed',
            })
        }

        return res.status(200).json({
            ...data,
            statusLabel: STATUS_LABELS[String(data.status)] || 'Unknown',
        })
    } catch (err) {
        console.error('HoudiniSwap status proxy error:', err)
        return res.status(502).json({ error: 'Failed to fetch status' })
    }
}
