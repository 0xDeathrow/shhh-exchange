import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
    createWallet as createSolanaWallet,
    importWallet as importSolanaWallet,
    encryptAndStore,
    loadAndDecrypt,
    getPublicData,
    getPrivateKeyB58,
    refreshWalletData,
    exportBackup,
    importBackup,
    sendSol,
} from '../utils/walletService.js'
import { initPrivacyCash, shieldSol, unshieldSol, shieldSPL, unshieldSPL, getPrivateBalance, lamportsToSol, PRIVACY_STATUS, SUPPORTED_TOKENS } from '../utils/privacyService.js'
import { saveSwap, updateSwap, getSwapHistory, exportSwapHistory } from '../utils/swapHistory.js'
import {
    Wallet,
    Settings,
    LogOut,
    Moon,
    Sun,
    Plus,
    Download,
    Search,
    Archive,
    Trash2,
    GripVertical,
    ArrowDownUp,
    ArrowLeftRight,
    DollarSign,
    X,
    Eye,
    EyeOff,
    Copy,
    Upload,
    HardDrive,
    RefreshCw,
    ChevronRight,
    ChevronLeft,
    MoreHorizontal,
    Info,
    Check,
    AlertTriangle,
    Loader2,
    Clock,
} from 'lucide-react'

/* ────────────────────────────────────────
   Sidebar nav items (icon-only sidebar)
   ──────────────────────────────────────── */
const NAV_ITEMS = [
    { icon: Wallet, label: 'Wallet Management' },
    { icon: ArrowDownUp, label: 'Private Swap' },
    { icon: ArrowLeftRight, label: 'Bridge' },
    { icon: DollarSign, label: 'Earn' },
]

/* ── Token image URLs (self-hosted in /public/tokens/) ── */
const TOKEN_IMAGES = {
    sol: '/tokens/sol.png',
    usdc: '/tokens/usdc.png',
    usdt: '/tokens/usdt.webp',
    zec: '/tokens/zec.svg',
    ore: '/tokens/ore.webp',
    store: '/tokens/store.svg',
}


/* ── CoinGecko ID mapping for price lookups ── */
const COINGECKO_TOKEN_MAP = {
    sol: 'solana',
    usdc: 'usd-coin',
    usdt: 'tether',
    zec: 'zcash',
    ore: 'ore',
    store: 'store-protocol',
}

/* ────────────────────────────────────────
   Theme tokens — grey brand palette
   ──────────────────────────────────────── */
const themes = {
    default: {
        bg: '#1a1d23',
        bgGradient: 'radial-gradient(ellipse at 10% 0%, rgba(220,53,69,0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(100,120,180,0.04) 0%, transparent 50%), #1a1d23',
        sidebarBg: 'rgba(22, 25, 30, 0.98)',
        sidebarShadow: '2px 0 20px rgba(0,0,0,0.3)',
        headerBg: 'rgba(26, 29, 35, 0.85)',
        cardBg: 'rgba(30, 34, 40, 0.6)',
        cardBorder: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.05)',
        text: '#f0f1f3',
        textSec: '#b0b5be',
        textMuted: '#6c727d',
        textDim: '#4a4f58',
        accent: '#DC3545',
        accentBg: 'rgba(220, 53, 69, 0.12)',
        accentBorder: 'rgba(220, 53, 69, 0.30)',
        accentGlow: '0 0 20px rgba(220, 53, 69, 0.15)',
        green: '#6BCB77',
        inputBg: 'rgba(15, 17, 21, 0.5)',
        dropHighlight: 'rgba(220, 53, 69, 0.08)',
        rowHover: 'rgba(255, 255, 255, 0.025)',
        rowBorder: 'rgba(255, 255, 255, 0.04)',
        statsBg: 'rgba(26, 29, 35, 0.7)',
        statsGradient: 'linear-gradient(135deg, rgba(220,53,69,0.08) 0%, rgba(30,34,40,0.6) 100%)',
        panelShadow: '0 4px 30px rgba(0,0,0,0.2)',
        glowSubtle: '0 0 40px rgba(220,53,69,0.05)',
    },
    dim: {
        bg: '#0e1015',
        bgGradient: 'radial-gradient(ellipse at 10% 0%, rgba(176,42,55,0.05) 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(60,80,140,0.03) 0%, transparent 50%), #0e1015',
        sidebarBg: 'rgba(12, 14, 18, 0.98)',
        sidebarShadow: '2px 0 20px rgba(0,0,0,0.5)',
        headerBg: 'rgba(14, 16, 21, 0.85)',
        cardBg: 'rgba(20, 23, 28, 0.5)',
        cardBorder: 'rgba(255, 255, 255, 0.04)',
        border: 'rgba(255, 255, 255, 0.03)',
        text: '#d0d3d8',
        textSec: '#888e98',
        textMuted: '#50555e',
        textDim: '#3a3f48',
        accent: '#B02A37',
        accentBg: 'rgba(176, 42, 55, 0.10)',
        accentBorder: 'rgba(176, 42, 55, 0.22)',
        accentGlow: '0 0 20px rgba(176, 42, 55, 0.12)',
        green: '#4BA35A',
        inputBg: 'rgba(8, 10, 14, 0.5)',
        dropHighlight: 'rgba(176, 42, 55, 0.06)',
        rowHover: 'rgba(255, 255, 255, 0.018)',
        rowBorder: 'rgba(255, 255, 255, 0.03)',
        statsBg: 'rgba(14, 16, 21, 0.5)',
        statsGradient: 'linear-gradient(135deg, rgba(176,42,55,0.06) 0%, rgba(20,23,28,0.5) 100%)',
        panelShadow: '0 4px 30px rgba(0,0,0,0.3)',
        glowSubtle: '0 0 40px rgba(176,42,55,0.04)',
    },
}

/* ──── Helper: truncate address ──── */
function shortAddr(addr) {
    return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : ''
}

export default function DashboardPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const profile = location.state?.profile
    const username = profile?.username || 'Anon'
    const initial = username.charAt(0).toUpperCase()

    const passphrase = location.state?.passphrase

    const [activeNav, setActiveNav] = useState('Wallet Management')
    const [isDim, setIsDim] = useState(false)
    const t = isDim ? themes.dim : themes.default

    // ── Wallet state (public data only — no secret keys in React state) ──
    const [wallets, setWallets] = useState([])
    const [showArchived, setShowArchived] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [newWalletName, setNewWalletName] = useState('')
    const [importName, setImportName] = useState('')
    const [importPrivateKey, setImportPrivateKey] = useState('')
    const [importError, setImportError] = useState('')
    const [loading, setLoading] = useState(false)
    const [balanceLoading, setBalanceLoading] = useState(false)
    const [revealedKey, setRevealedKey] = useState(null)
    const revealTimer = useRef(null)
    const [hoveredRow, setHoveredRow] = useState(null)
    const [hoveredNav, setHoveredNav] = useState(null)
    const [sidebarExpanded, setSidebarExpanded] = useState(false)
    const sidebarWidth = sidebarExpanded ? 200 : 64
    const [hoveredBottomBtn, setHoveredBottomBtn] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)
    const [detailWalletId, setDetailWalletId] = useState(null)
    const [copiedField, setCopiedField] = useState(null) // e.g. 'addr-<id>' or 'pk-<id>'
    const [privateKeyModal, setPrivateKeyModal] = useState(null) // { id, key, name }

    // Close context menu on outside click
    useEffect(() => {
        if (!openMenuId) return
        const close = () => setOpenMenuId(null)
        document.addEventListener('click', close)
        return () => document.removeEventListener('click', close)
    }, [openMenuId])

    // ── Full encrypted wallet data ref ──
    const fullWalletsRef = useRef([])

    // ── Transfer state ──
    const [sourceWallets, setSourceWallets] = useState([])
    const [destWallets, setDestWallets] = useState([])
    const [dragOverZone, setDragOverZone] = useState(null)
    const [dragReorderTarget, setDragReorderTarget] = useState(null)

    // ── Swap flow state ──
    const [swapAmount, setSwapAmount] = useState('')
    const [manualDestAddr, setManualDestAddr] = useState('')
    const [quoteData, setQuoteData] = useState(null)      // { amountIn, estimatedFee }
    const [quoteLoading, setQuoteLoading] = useState(false)
    const [quoteError, setQuoteError] = useState('')
    const [activeSwap, setActiveSwap] = useState(null)     // { txId, statusLabel, amountSOL, feeSOL, ... }
    const [swapStep, setSwapStep] = useState('idle')       // idle | confirming | shielding | unshielding | done | error
    const [swapError, setSwapError] = useState('')
    const [privacyStatus, setPrivacyStatus] = useState(PRIVACY_STATUS.IDLE)  // detailed sub-step
    const swapPollRef = useRef(null)
    const [multiTransferProgress, setMultiTransferProgress] = useState({ shieldIndex: -1, unshieldIndex: -1, shieldTotal: 0, unshieldTotal: 0, completedUnshields: [] })
    const [selectedToken, setSelectedToken] = useState('sol')  // sol | usdc | usdt | zec | ore | store
    const tokenInfo = SUPPORTED_TOKENS.find(t => t.name === selectedToken) || SUPPORTED_TOKENS[0]
    const tokenSymbol = selectedToken.toUpperCase()
    const isSPL = selectedToken !== 'sol'

    // ── SOL price state ──
    const [solPrice, setSolPrice] = useState(null)
    // ── All token prices (for swap conversion) ──
    const [tokenPrices, setTokenPrices] = useState(null)  // { solana: { usd: N }, ... }

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                // Fetch all token prices in one call
                const res = await fetch('/api/prices')
                const data = await res.json()
                if (data?.solana?.usd) {
                    setSolPrice(data.solana.usd)
                    setTokenPrices(data)
                }
            } catch (err) {
                console.warn('Price fetch failed:', err.message)
                // Fallback: try individual SOL price endpoint
                try {
                    const res = await fetch('/api/price')
                    const data = await res.json()
                    if (data?.solana?.usd) setSolPrice(data.solana.usd)
                } catch (e) {
                    console.warn('SOL price fallback also failed:', e.message)
                }
            }
        }
        fetchPrices()
        const interval = setInterval(fetchPrices, 60000) // refresh every 60s
        return () => clearInterval(interval)
    }, [])

    // ── Load encrypted wallets on mount ──
    useEffect(() => {
        if (!passphrase) return
            ; (async () => {
                setLoading(true)
                try {
                    const decrypted = await loadAndDecrypt(passphrase)
                    fullWalletsRef.current = decrypted
                    setWallets(getPublicData(decrypted))
                    fetchLiveBalances(decrypted)
                } catch (err) {
                    console.error('Failed to load wallets:', err)
                }
                setLoading(false)
            })()
    }, [passphrase])

    // ── Fetch live balances ──
    const fetchLiveBalances = async (walletsData) => {
        const data = walletsData || fullWalletsRef.current
        if (data.length === 0) return
        setBalanceLoading(true)
        try {
            const updated = await refreshWalletData(getPublicData(data))
            fullWalletsRef.current = fullWalletsRef.current.map(fw => {
                const u = updated.find(uw => uw.id === fw.id)
                return u ? { ...fw, balance: u.balance, holdings: u.holdings } : fw
            })
            setWallets(getPublicData(fullWalletsRef.current))
            await encryptAndStore(passphrase, fullWalletsRef.current)
        } catch (err) {
            console.warn('Balance fetch failed:', err.message)
        }
        setBalanceLoading(false)
    }

    // ── Auto-poll balances every 15 seconds ──
    useEffect(() => {
        if (!passphrase) return
        const interval = setInterval(() => {
            fetchLiveBalances()
        }, 15000)
        return () => clearInterval(interval)
    }, [passphrase])

    // ── Persist helper ──
    const persistWallets = useCallback(async (updatedFull) => {
        fullWalletsRef.current = updatedFull
        setWallets(getPublicData(updatedFull))
        await encryptAndStore(passphrase, updatedFull)
    }, [passphrase])

    // ── Create wallet ──
    const handleCreate = async () => {
        const name = newWalletName.trim() || `Wallet ${wallets.length + 1}`
        const w = createSolanaWallet(name)
        const updatedFull = [...fullWalletsRef.current, w]
        await persistWallets(updatedFull)
        setNewWalletName('')
        setShowCreate(false)
        fetchLiveBalances(updatedFull)
    }

    // ── Import wallet ──
    const handleImport = async () => {
        if (!importPrivateKey.trim()) return
        setImportError('')
        try {
            const w = importSolanaWallet(importName.trim() || 'Imported', importPrivateKey.trim())
            if (fullWalletsRef.current.some(fw => fw.address === w.address)) {
                setImportError('This wallet has already been imported.')
                return
            }
            const updatedFull = [...fullWalletsRef.current, w]
            await persistWallets(updatedFull)
            setImportName('')
            setImportPrivateKey('')
            setShowImport(false)
            fetchLiveBalances(updatedFull)
        } catch (err) {
            setImportError(err.message)
        }
    }

    // ── Copy with tick confirmation ──
    const handleCopy = (text, fieldKey) => {
        navigator.clipboard.writeText(text)
        setCopiedField(fieldKey)
        setTimeout(() => setCopiedField(prev => prev === fieldKey ? null : prev), 2000)
    }

    // ── Reveal private key (opens modal) ──
    const handleRevealKey = async (walletId) => {
        const key = getPrivateKeyB58(fullWalletsRef.current, walletId)
        const wallet = wallets.find(w => w.id === walletId)
        if (key) {
            setPrivateKeyModal({ id: walletId, key, name: wallet?.name || 'Wallet' })
        }
    }

    // ── Archive / Delete ──
    const handleArchive = async (id) => {
        const updatedFull = fullWalletsRef.current.map(w =>
            w.id === id ? { ...w, archived: !w.archived } : w
        )
        await persistWallets(updatedFull)
    }
    const handleDelete = async (id) => {
        const updatedFull = fullWalletsRef.current.filter(w => w.id !== id)
        await persistWallets(updatedFull)
        setSourceWallets(prev => prev.filter(w => w.id !== id))
        setDestWallets(prev => prev.filter(w => w.id !== id))
        if (revealedKey?.id === id) setRevealedKey(null)
    }

    // ── Drag-and-drop ──
    const handleDragStart = (e, wallet) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(wallet))
        e.dataTransfer.setData('application/x-wallet-reorder', wallet.id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDrop = (e, zone) => {
        e.preventDefault()
        setDragOverZone(null)
        setDragReorderTarget(null)
        try {
            const wallet = JSON.parse(e.dataTransfer.getData('text/plain'))
            if (zone === 'source') {
                setSourceWallets(prev =>
                    prev.some(w => w.id === wallet.id) ? prev : [...prev, wallet]
                )
            } else {
                setDestWallets(prev =>
                    prev.some(w => w.id === wallet.id) ? prev : [...prev, wallet]
                )
            }
        } catch { }
    }

    const handleDragOver = (e, zone) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverZone(zone)
    }

    const handleRowDragOver = (e, targetId) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        if (dragReorderTarget !== targetId) setDragReorderTarget(targetId)
    }

    const handleRowDrop = (e, targetId) => {
        e.preventDefault()
        e.stopPropagation()
        setDragReorderTarget(null)
        const draggedId = e.dataTransfer.getData('application/x-wallet-reorder')
        if (!draggedId || draggedId === targetId) return

        // Reorder wallets
        const reorder = (arr) => {
            const fromIdx = arr.findIndex(w => w.id === draggedId)
            const toIdx = arr.findIndex(w => w.id === targetId)
            if (fromIdx === -1 || toIdx === -1) return arr
            const updated = [...arr]
            const [moved] = updated.splice(fromIdx, 1)
            updated.splice(toIdx, 0, moved)
            return updated
        }

        fullWalletsRef.current = reorder(fullWalletsRef.current)
        setWallets(prev => reorder(prev))

        // Persist new order
        try {
            const profile = JSON.parse(localStorage.getItem('shh_profile'))
            if (profile?.passphrase) {
                const encrypted = walletService.encryptWallets(fullWalletsRef.current, profile.passphrase)
                localStorage.setItem('shh_wallets', JSON.stringify(encrypted))
            }
        } catch (err) {
            console.warn('Failed to persist wallet order:', err.message)
        }
    }

    const removeFromZone = (id, zone) => {
        if (zone === 'source') setSourceWallets(prev => prev.filter(w => w.id !== id))
        else setDestWallets(prev => prev.filter(w => w.id !== id))
    }

    // ── Filter wallets ──
    const filteredWallets = wallets.filter(w => {
        if (!showArchived && w.archived) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return w.name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q)
        }
        return true
    })

    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)
    const activeWalletCount = wallets.filter(w => !w.archived).length
    const totalHoldings = wallets.reduce((sum, w) => sum + (w.holdings || 0), 0)

    // ── Export backup ──
    const handleExportBackup = async () => {
        try {
            await exportBackup(passphrase)
        } catch (err) {
            console.error('Export failed:', err)
        }
    }

    // ── Import backup ──
    const handleImportBackup = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const { wallets: imported } = await importBackup(file, passphrase)
            fullWalletsRef.current = imported
            setWallets(getPublicData(imported))
            fetchLiveBalances(imported)
        } catch (err) {
            alert(err.message)
        }
        e.target.value = ''
    }

    // ── Redirect if no profile ──
    if (!profile) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--grey-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--grey-400)', fontSize: '14px', marginBottom: '16px' }}>
                        Session expired. Please sign in again.
                    </p>
                    <Link
                        to="/exchange"
                        style={{
                            color: '#DC3545',
                            fontSize: '13px',
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Go to Sign In →
                    </Link>
                </div>
            </div>
        )
    }

    const handleLogout = () => navigate('/exchange')

    /* ────────────────────────────────────────
       Shared sub-styles
       ──────────────────────────────────────── */
    const tableHeaderStyle = {
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.textDim,
        padding: '10px 16px',
        whiteSpace: 'nowrap',
        textAlign: 'left',
    }

    const tableCellStyle = {
        fontSize: '13px',
        padding: '14px 16px',
        color: t.textSec,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
    }

    const iconBtnStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '6px',
        color: t.textMuted,
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
    }

    const smallBtnStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        border: `1px solid ${t.cardBorder}`,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: '0.01em',
    }

    const inputBaseStyle = {
        padding: '10px 14px',
        background: t.inputBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: '8px',
        color: t.text,
        fontSize: '13px',
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
    }

    /* ────────────────────────────────────────
       Solana logo SVG component
       ──────────────────────────────────────── */
    const SolLogo = ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 397.7 311.7" style={{ flexShrink: 0 }}>
            <linearGradient id="solGrad1" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -5)">
                <stop offset="0" stopColor="#00FFA3" />
                <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
            <path fill="url(#solGrad1)" d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
            <path fill="url(#solGrad1)" d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />
            <path fill="url(#solGrad1)" d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />
        </svg>
    )

    /* ────────────────────────────────────────
       Wallet table row component
       ──────────────────────────────────────── */
    const WalletRow = ({ wallet, index = 0, showActions = true, zone = null }) => (
        <>
            <tr
                draggable={!zone}
                onDragStart={!zone ? (e) => handleDragStart(e, wallet) : undefined}
                onDragOver={!zone ? (e) => handleRowDragOver(e, wallet.id) : undefined}
                onDrop={!zone ? (e) => handleRowDrop(e, wallet.id) : undefined}
                onDragEnd={() => setDragReorderTarget(null)}
                onMouseEnter={() => !zone && setHoveredRow(wallet.id)}
                onMouseLeave={() => !zone && setHoveredRow(null)}
                style={{
                    cursor: !zone ? 'grab' : 'default',
                    background: hoveredRow === wallet.id && !zone ? t.rowHover : 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s ease',
                    borderRadius: '10px',
                    border: dragReorderTarget === wallet.id && !zone
                        ? '1px solid rgba(59,130,246,0.6)'
                        : hoveredRow === wallet.id && !zone
                            ? `1px solid ${t.accentBorder}`
                            : `1px solid ${t.rowBorder}`,
                    boxShadow: dragReorderTarget === wallet.id && !zone
                        ? '0 0 12px rgba(59,130,246,0.15)'
                        : hoveredRow === wallet.id && !zone
                            ? t.accentGlow
                            : 'none',
                }}
            >
                <td style={{ ...tableCellStyle, padding: zone ? '8px 6px' : tableCellStyle.padding }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: zone ? '6px' : '12px', overflow: 'hidden' }}>
                        {!zone && <GripVertical size={14} style={{ color: t.textDim, flexShrink: 0, opacity: hoveredRow === wallet.id ? 0.8 : 0.3 }} />}
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: wallet.archived ? t.textDim : t.accent,
                            fontFamily: "'JetBrains Mono', monospace",
                            flexShrink: 0,
                            minWidth: '24px',
                        }}>
                            #{index + 1}
                        </span>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: wallet.archived ? t.textMuted : t.text, fontSize: zone ? '12px' : '13px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {wallet.name}
                            </div>
                            {!zone && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    color: t.textDim,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    marginTop: '2px',
                                }}>
                                    {shortAddr(wallet.address)}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCopy(wallet.address, `addr-${wallet.id}`) }}
                                        title="Copy address"
                                        style={{ ...iconBtnStyle, padding: '1px', flexShrink: 0 }}
                                    >
                                        {copiedField === `addr-${wallet.id}` ? <Check size={10} style={{ color: '#22c55e' }} /> : <Copy size={10} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </td>
                <td style={{ ...tableCellStyle, padding: zone ? '8px 6px' : tableCellStyle.padding }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <SolLogo size={12} />
                        <span style={{ fontWeight: 500, fontSize: zone ? '11px' : '13px', whiteSpace: 'nowrap' }}>
                            {wallet.balance.toFixed(wallet.balance >= 1 ? 4 : 6)}
                        </span>
                        {!zone && solPrice && (
                            <span style={{ fontSize: '11px', color: t.textDim, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
                                ${(wallet.balance * solPrice).toFixed(2)}
                            </span>
                        )}
                    </div>
                </td>
                {!zone && (
                    <td style={tableCellStyle}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: t.inputBg,
                            fontSize: '12px',
                            color: t.textMuted,
                        }}>
                            🪙 {wallet.holdings}
                        </div>
                    </td>
                )}
                <td style={{ ...tableCellStyle, position: 'relative', ...(zone ? { paddingRight: '12px' } : {}) }}>
                    {showActions && !zone && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === wallet.id ? null : wallet.id) }}
                                style={{
                                    ...iconBtnStyle,
                                    opacity: hoveredRow === wallet.id || openMenuId === wallet.id ? 1 : 0.4,
                                    transition: 'opacity 0.15s ease',
                                }}
                            >
                                <MoreHorizontal size={16} />
                            </button>
                            {openMenuId === wallet.id && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        right: '0',
                                        top: '100%',
                                        marginTop: '4px',
                                        background: t.sidebarBg,
                                        border: `1px solid ${t.border}`,
                                        borderRadius: '10px',
                                        padding: '6px',
                                        minWidth: '180px',
                                        zIndex: 300,
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                        backdropFilter: 'blur(16px)',
                                    }}
                                >
                                    <button
                                        onClick={() => { handleArchive(wallet.id); setOpenMenuId(null) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: '8px 12px', border: 'none', borderRadius: '6px',
                                            background: 'transparent', color: t.textSec, fontSize: '13px',
                                            cursor: 'pointer', transition: 'background 0.15s ease',
                                            fontFamily: "'Inter', sans-serif",
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = t.rowHover}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Archive size={14} />
                                        {wallet.archived ? 'Unarchive' : 'Archive'}
                                    </button>
                                    <button
                                        onClick={() => { setDetailWalletId(detailWalletId === wallet.id ? null : wallet.id); setOpenMenuId(null) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: '8px 12px', border: 'none', borderRadius: '6px',
                                            background: 'transparent', color: t.textSec, fontSize: '13px',
                                            cursor: 'pointer', transition: 'background 0.15s ease',
                                            fontFamily: "'Inter', sans-serif",
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = t.rowHover}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Info size={14} />
                                        Show Details
                                    </button>
                                    <button
                                        onClick={() => { handleRevealKey(wallet.id); setOpenMenuId(null) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: '8px 12px', border: 'none', borderRadius: '6px',
                                            background: 'transparent', color: t.textSec, fontSize: '13px',
                                            cursor: 'pointer', transition: 'background 0.15s ease',
                                            fontFamily: "'Inter', sans-serif",
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = t.rowHover}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Eye size={14} />
                                        Reveal Private Key
                                    </button>
                                    {wallet.archived && (
                                        <button
                                            onClick={() => { handleDelete(wallet.id); setOpenMenuId(null) }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                padding: '8px 12px', border: 'none', borderRadius: '6px',
                                                background: 'transparent', color: '#DC3545', fontSize: '13px',
                                                cursor: 'pointer', transition: 'background 0.15s ease',
                                                fontFamily: "'Inter', sans-serif",
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,53,69,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Trash2 size={14} />
                                            Delete Wallet
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    {zone && (
                        <button onClick={() => removeFromZone(wallet.id, zone)} title="Remove" style={iconBtnStyle}>
                            <X size={14} />
                        </button>
                    )}
                </td>
            </tr>
            {
                detailWalletId === wallet.id && (
                    <tr>
                        <td colSpan={4} style={{ padding: '0 16px 12px 16px', border: 'none' }}>
                            <div style={{
                                background: t.inputBg,
                                border: `1px solid ${t.border}`,
                                borderRadius: '10px',
                                padding: '14px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                            }}>
                                {/* Address */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Address</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '12px', color: t.textSec, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {wallet.address}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(wallet.address, `detail-addr-${wallet.id}`)}
                                            style={{ ...iconBtnStyle, padding: '2px' }}
                                            title="Copy address"
                                        >
                                            {copiedField === `detail-addr-${wallet.id}` ? <Check size={10} style={{ color: '#22c55e' }} /> : <Copy size={10} />}
                                        </button>
                                    </div>
                                </div>
                                {/* Value */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Value</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <SolLogo size={12} />
                                        <span style={{ fontSize: '13px', color: t.text, fontWeight: 600 }}>
                                            {wallet.balance.toFixed(4)}
                                        </span>
                                        {solPrice && (
                                            <span style={{ fontSize: '11px', color: t.textDim, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
                                                ${(wallet.balance * solPrice).toFixed(2)} USD
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Token Holdings */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Token Holdings</span>
                                    <span style={{ fontSize: '13px', color: t.textSec }}>
                                        {wallet.holdings > 0 ? `${wallet.holdings} token${wallet.holdings !== 1 ? 's' : ''}` : 'No tokens'}
                                    </span>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
        </>
    )
    /* ────────────────────────────────────────
       Swap flow handlers
       ──────────────────────────────────────── */
    const getDestinationAddresses = () => {
        const addrs = []
        if (manualDestAddr.trim()) addrs.push({ address: manualDestAddr.trim(), name: 'Manual Address' })
        destWallets.forEach(w => addrs.push({ address: w.address, name: w.name }))
        return addrs
    }

    const handleGetQuote = async () => {
        const amt = parseFloat(swapAmount)
        if (!amt || amt <= 0) { setQuoteError('Enter a valid amount'); return }

        const destinations = getDestinationAddresses()
        if (destinations.length === 0) { setQuoteError('Set a destination address or drag a wallet'); return }

        // Quick Private Transfer (Wallet Management) is always SOL-only
        const isQuickTransfer = activeNav === 'Wallet Management'
        const effectiveToken = isQuickTransfer ? 'sol' : selectedToken
        const effectiveSymbol = isQuickTransfer ? 'SOL' : tokenSymbol
        const effectiveIsSPL = isQuickTransfer ? false : isSPL

        // Check that the source wallets have enough balance
        if (effectiveIsSPL) {
            // For SPL tokens, we check SOL balance for gas only
            const sourceSOL = sourceWallets.reduce((s, w) => s + (w.balance || 0), 0)
            if (sourceSOL < 0.005 * sourceWallets.length) {
                setQuoteError(`Need at least ${(0.005 * sourceWallets.length).toFixed(3)} SOL for gas fees`)
                return
            }
        } else {
            const sourceBalance = sourceWallets.reduce((s, w) => s + (w.balance || 0), 0)
            const feeReserve = 0.01 * sourceWallets.length
            if (amt > sourceBalance - feeReserve) {
                setQuoteError(`Insufficient balance. You have ${sourceBalance.toFixed(6)} SOL — need ~${feeReserve.toFixed(3)} SOL for tx fees. Max: ${Math.max(0, sourceBalance - feeReserve).toFixed(6)} SOL`)
                return
            }
        }

        setQuoteLoading(true)
        setQuoteError('')
        setQuoteData(null)

        try {
            // Estimate fees: each unshield has its own relayer fee
            const feePerUnshield = amt / destinations.length * 0.02 + 0.0035
            const totalFee = feePerUnshield * destinations.length
            const solAfterFees = amt - totalFee
            if (solAfterFees <= 0) {
                setQuoteError('Amount too small to cover relayer fees')
                return
            }

            // Calculate output amount with real price conversion
            let amountOut = solAfterFees
            if (effectiveToken !== 'sol' && tokenPrices) {
                const solCGId = COINGECKO_TOKEN_MAP.sol
                const targetCGId = COINGECKO_TOKEN_MAP[effectiveToken]
                const solUSD = tokenPrices[solCGId]?.usd
                const targetUSD = tokenPrices[targetCGId]?.usd
                if (solUSD && targetUSD && targetUSD > 0) {
                    amountOut = (solAfterFees * solUSD) / targetUSD
                }
            }

            const perRecipient = parseFloat((amountOut / destinations.length).toFixed(6))
            setQuoteData({
                amountIn: amt,
                amountOut: parseFloat(amountOut.toFixed(6)),
                estimatedFee: parseFloat(totalFee.toFixed(6)),
                recipients: destinations.length,
                sources: sourceWallets.length,
                perRecipientAmount: perRecipient,
                token: effectiveToken,
                tokenSymbol: effectiveSymbol,
            })
            setSwapStep('confirming')
        } catch (err) {
            setQuoteError(err.message || 'Failed to estimate fees')
        } finally {
            setQuoteLoading(false)
        }
    }

    const handleExecuteSwap = async () => {
        const amt = parseFloat(swapAmount)
        const destinations = getDestinationAddresses()
        if (!amt || destinations.length === 0 || !quoteData) return

        // Quick Private Transfer (Wallet Management) is always SOL-only
        const isQuickTransfer = activeNav === 'Wallet Management'
        const effectiveIsSPL = isQuickTransfer ? false : isSPL
        const effectiveSymbol = isQuickTransfer ? 'SOL' : tokenSymbol

        setSwapStep('shielding')
        setSwapError('')

        const rpcUrl = import.meta.env.DEV
            ? (import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
            : `${window.location.origin}/api/rpc`

        // Determine how much each source wallet should shield
        const sourceCount = sourceWallets.length
        const perSourceAmount = parseFloat((amt / sourceCount).toFixed(6))

        setMultiTransferProgress({ shieldIndex: 0, unshieldIndex: -1, shieldTotal: sourceCount, unshieldTotal: destinations.length, completedUnshields: [] })
        setActiveSwap({ statusLabel: `Shielding ${effectiveSymbol} from wallet 1/${sourceCount}...`, amountSOL: amt, tokenSymbol: effectiveSymbol })

        try {
            // ── SHIELD PHASE: deposit from each source wallet ──
            for (let i = 0; i < sourceCount; i++) {
                const srcWallet = fullWalletsRef.current.find(w => w.id === sourceWallets[i]?.id)
                if (!srcWallet?.secretKey) throw new Error(`Source wallet "${sourceWallets[i]?.name}" key not found`)

                const client = initPrivacyCash(rpcUrl, srcWallet.secretKey)
                let shieldAmt = i === sourceCount - 1
                    ? parseFloat((amt - perSourceAmount * (sourceCount - 1)).toFixed(6))  // last wallet gets remainder to avoid rounding errors
                    : perSourceAmount

                // Cap to wallet balance minus gas reserve for the shield TX itself
                const walletBalance = srcWallet.balance || sourceWallets[i]?.balance || 0
                const maxShieldable = Math.max(0, walletBalance - 0.005)
                if (shieldAmt > maxShieldable) {
                    shieldAmt = parseFloat(maxShieldable.toFixed(6))
                }

                setMultiTransferProgress(prev => ({ ...prev, shieldIndex: i }))
                setActiveSwap(prev => ({ ...prev, statusLabel: `Shielding ${effectiveSymbol} from ${srcWallet.name} (${i + 1}/${sourceCount})...` }))

                if (effectiveIsSPL) {
                    // Always shield SOL (user sends SOL) — SPL conversion happens at unshield
                    await shieldSol(client, shieldAmt, setPrivacyStatus)
                } else {
                    await shieldSol(client, shieldAmt, setPrivacyStatus)
                }
            }

            // ── UNSHIELD PHASE: withdraw to each destination ──
            setSwapStep('unshielding')
            const perRecipientAmt = quoteData.perRecipientAmount || parseFloat((amt / destinations.length).toFixed(6))

            // Use the first source wallet's client for unshielding (funds are in the shared pool)
            const primarySrc = fullWalletsRef.current.find(w => w.id === sourceWallets[0]?.id)
            const primaryClient = initPrivacyCash(rpcUrl, primarySrc.secretKey)

            let totalFees = 0
            let lastTx = null

            for (let j = 0; j < destinations.length; j++) {
                const dest = destinations[j]
                setMultiTransferProgress(prev => ({ ...prev, unshieldIndex: j }))
                setActiveSwap(prev => ({ ...prev, statusLabel: `Unshielding ${effectiveSymbol} to ${dest.name} (${j + 1}/${destinations.length})...` }))

                try {
                    let unshieldResult
                    if (effectiveIsSPL) {
                        unshieldResult = await unshieldSPL(primaryClient, tokenInfo.pubkey.toString(), perRecipientAmt, dest.address, setPrivacyStatus)
                    } else {
                        unshieldResult = await unshieldSol(primaryClient, perRecipientAmt, dest.address, setPrivacyStatus)
                    }
                    const feeSOL = lamportsToSol(unshieldResult.fee_in_lamports || 0)
                    totalFees += feeSOL
                    lastTx = unshieldResult.tx

                    setMultiTransferProgress(prev => ({
                        ...prev,
                        completedUnshields: [...prev.completedUnshields, { address: dest.address, name: dest.name, tx: unshieldResult.tx, amount: perRecipientAmt, fee: feeSOL }],
                    }))

                    // Save to swap history per unshield
                    await saveSwap(passphrase, {
                        txId: unshieldResult.tx,
                        type: 'private_transfer',
                        sourceWallet: { name: primarySrc.name, address: primarySrc.address },
                        destAddress: dest.address,
                        destName: dest.name,
                        amountSOL: perRecipientAmt,
                        feeSOL,
                        statusLabel: 'Complete',
                    })
                } catch (err) {
                    // Log error but continue to next destination
                    console.error(`Failed to unshield to ${dest.name}:`, err)
                    setMultiTransferProgress(prev => ({
                        ...prev,
                        completedUnshields: [...prev.completedUnshields, { address: dest.address, name: dest.name, error: err.message }],
                    }))
                }
            }

            setActiveSwap(prev => ({
                ...prev,
                txId: lastTx,
                statusLabel: 'Complete',
                feeSOL: totalFees,
                receivedSOL: perRecipientAmt * destinations.length,
            }))
            setSwapStep('done')

            // Refresh wallet balances
            fetchLiveBalances()

        } catch (err) {
            setSwapError(err.message || 'Private transfer failed')
            setSwapStep('error')
        }
    }

    const resetSwap = () => {
        setSwapAmount('')
        setManualDestAddr('')
        setQuoteData(null)
        setQuoteError('')
        setActiveSwap(null)
        setSwapStep('idle')
        setSwapError('')
        setPrivacyStatus(PRIVACY_STATUS.IDLE)
        setSourceWallets([])
        setDestWallets([])
        setMultiTransferProgress({ shieldIndex: -1, unshieldIndex: -1, shieldTotal: 0, unshieldTotal: 0, completedUnshields: [] })
        if (swapPollRef.current) {
            clearInterval(swapPollRef.current)
            swapPollRef.current = null
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (swapPollRef.current) clearInterval(swapPollRef.current)
        }
    }, [])

    /* ────────────────────────────────────────
       Drop zone component
       ──────────────────────────────────────── */
    const DropZone = ({ title, wallets: zoneWallets, zone, actionButton }) => (
        <div
            onDragOver={(e) => handleDragOver(e, zone)}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={(e) => handleDrop(e, zone)}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                transition: 'background 0.2s ease',
                background: dragOverZone === zone ? t.dropHighlight : 'transparent',
            }}
        >
            <div style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>
                    {title}
                </span>
                {actionButton}
            </div>

            {zoneWallets.length === 0 ? (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 20px',
                    gap: '8px',
                }}>
                    <ArrowDownUp size={18} style={{ color: t.textDim, opacity: 0.5 }} />
                    <p style={{ fontSize: '11px', color: t.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                        Drag wallets to<br />{zone === 'source' ? 'distribute SOL' : 'receive SOL'}
                    </p>
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {zoneWallets.map((w) => (
                        <div key={w.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderBottom: `1px solid ${t.border}`,
                            gap: '8px',
                        }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: t.accent,
                                fontFamily: "'JetBrains Mono', monospace",
                                flexShrink: 0,
                                width: '20px',
                            }}>
                                #{wallets.findIndex(ww => ww.id === w.id) + 1}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: t.text,
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                            }}>
                                {w.name}
                            </span>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: t.textDim,
                                fontFamily: "'JetBrains Mono', monospace",
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                            }}>
                                {w.balance.toFixed(w.balance >= 1 ? 4 : 6)}
                            </span>
                            <button
                                onClick={() => removeFromZone(w.id, zone)}
                                title="Remove"
                                style={{
                                    ...iconBtnStyle,
                                    flexShrink: 0,
                                    padding: '2px',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    /* ──────────────────────────────────────── */

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: t.bgGradient,
            fontFamily: "'Inter', sans-serif",
            color: t.text,
            transition: 'all 0.4s ease',
        }}>
            {/* ── SIDEBAR ── */}
            <aside style={{
                width: `${sidebarWidth}px`,
                background: t.sidebarBg,
                borderRight: `1px solid ${t.border}`,
                boxShadow: t.sidebarShadow,
                display: 'flex',
                flexDirection: 'column',
                alignItems: sidebarExpanded ? 'stretch' : 'center',
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 100,
                transition: 'width 0.25s ease, background 0.4s ease, border-color 0.4s ease',
                paddingTop: '8px',
            }}>
                {/* Brand mark */}
                <div style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    marginTop: '8px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: t.text,
                    letterSpacing: '-0.02em',
                    alignSelf: 'center',
                }}>
                    W<span style={{ color: '#DC3545' }}>.</span>
                </div>

                {/* Nav icons */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: sidebarExpanded ? '0 10px' : '0 8px' }}>
                    {NAV_ITEMS.map(({ icon: Icon, label }) => {
                        const isActive = activeNav === label
                        return (
                            <div key={label} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setActiveNav(label)}
                                    onMouseEnter={() => setHoveredNav(label)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                    title={label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                        gap: '12px',
                                        width: '100%',
                                        height: '40px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        background: isActive ? t.accentBg : 'transparent',
                                        color: isActive ? t.accent : hoveredNav === label ? t.textSec : t.textMuted,
                                        boxShadow: isActive ? t.accentGlow : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        paddingLeft: sidebarExpanded ? '12px' : '0',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                                    {sidebarExpanded && (
                                        <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, opacity: 1, transition: 'opacity 0.2s ease' }}>
                                            {label}
                                        </span>
                                    )}
                                </button>
                                {/* Tooltip — only when collapsed */}
                                {!sidebarExpanded && hoveredNav === label && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '54px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: '#1a1d23',
                                        color: '#eee',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        zIndex: 200,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                        border: `1px solid ${t.border}`,
                                        pointerEvents: 'none',
                                    }}>
                                        {label}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Bottom actions */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: sidebarExpanded ? '8px 10px' : '8px',
                    borderTop: `1px solid ${t.border}`,
                    width: '100%',
                }}>
                    {/* Settings */}
                    <div style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredBottomBtn('settings')}
                        onMouseLeave={() => setHoveredBottomBtn(null)}
                    >
                        <button
                            onClick={() => setActiveNav('Settings')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                gap: '10px',
                                width: '100%',
                                height: '40px',
                                border: 'none',
                                borderRadius: '10px',
                                background: activeNav === 'Settings' ? t.accentBg : 'transparent',
                                color: activeNav === 'Settings' ? t.accent : t.textMuted,
                                boxShadow: activeNav === 'Settings' ? t.accentGlow : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                paddingLeft: sidebarExpanded ? '12px' : '0',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Settings size={18} strokeWidth={activeNav === 'Settings' ? 2 : 1.5} style={{ flexShrink: 0 }} />
                            {sidebarExpanded && <span style={{ fontSize: '12px', fontWeight: activeNav === 'Settings' ? 600 : 500 }}>Settings</span>}
                        </button>
                        {!sidebarExpanded && hoveredBottomBtn === 'settings' && (
                            <div style={{
                                position: 'absolute', left: '54px', top: '50%', transform: 'translateY(-50%)',
                                background: '#1a1d23', color: '#eee',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                border: `1px solid ${t.border}`, pointerEvents: 'none',
                            }}>Settings</div>
                        )}
                    </div>

                    {/* Export Backup */}
                    <div style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredBottomBtn('export')}
                        onMouseLeave={() => setHoveredBottomBtn(null)}
                    >
                        <button
                            onClick={handleExportBackup}
                            title={sidebarExpanded ? 'Export Backup' : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                gap: '10px',
                                width: '100%',
                                height: '40px',
                                border: 'none',
                                borderRadius: '10px',
                                background: 'transparent',
                                color: t.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                paddingLeft: sidebarExpanded ? '12px' : '0',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <HardDrive size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            {sidebarExpanded && <span style={{ fontSize: '12px', fontWeight: 500 }}>Export Backup</span>}
                        </button>
                        {!sidebarExpanded && hoveredBottomBtn === 'export' && (
                            <div style={{
                                position: 'absolute', left: '54px', top: '50%', transform: 'translateY(-50%)',
                                background: '#1a1d23', color: '#eee',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                border: `1px solid ${t.border}`, pointerEvents: 'none',
                            }}>Export Backup</div>
                        )}
                    </div>

                    {/* Import Backup */}
                    <div style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredBottomBtn('import')}
                        onMouseLeave={() => setHoveredBottomBtn(null)}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                gap: '10px',
                                width: '100%',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'transparent',
                                color: t.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                paddingLeft: sidebarExpanded ? '12px' : '0',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Upload size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            {sidebarExpanded && <span style={{ fontSize: '12px', fontWeight: 500 }}>Import Backup</span>}
                            <input
                                type="file"
                                accept=".whispr,.json"
                                onChange={handleImportBackup}
                                style={{ display: 'none' }}
                            />
                        </label>
                        {!sidebarExpanded && hoveredBottomBtn === 'import' && (
                            <div style={{
                                position: 'absolute', left: '54px', top: '50%', transform: 'translateY(-50%)',
                                background: '#1a1d23', color: '#eee',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                border: `1px solid ${t.border}`, pointerEvents: 'none',
                            }}>Import Backup</div>
                        )}
                    </div>

                    {/* Sign Out */}
                    <div style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredBottomBtn('signout')}
                        onMouseLeave={() => setHoveredBottomBtn(null)}
                    >
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                gap: '10px',
                                width: '100%',
                                height: '40px',
                                border: 'none',
                                borderRadius: '10px',
                                background: 'transparent',
                                color: t.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                paddingLeft: sidebarExpanded ? '12px' : '0',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <LogOut size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            {sidebarExpanded && <span style={{ fontSize: '12px', fontWeight: 500 }}>Sign Out</span>}
                        </button>
                        {!sidebarExpanded && hoveredBottomBtn === 'signout' && (
                            <div style={{
                                position: 'absolute', left: '54px', top: '50%', transform: 'translateY(-50%)',
                                background: '#1a1d23', color: '#eee',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                border: `1px solid ${t.border}`, pointerEvents: 'none',
                            }}>Sign Out</div>
                        )}
                    </div>

                    {/* Collapse / Expand toggle */}
                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                            gap: '10px',
                            width: '100%',
                            height: '36px',
                            border: 'none',
                            borderRadius: '10px',
                            background: 'transparent',
                            color: t.textDim,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            paddingLeft: sidebarExpanded ? '12px' : '0',
                            marginTop: '4px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        {sidebarExpanded && <span style={{ fontSize: '11px', fontWeight: 500 }}>Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* ── MAIN AREA ── */}
            <div style={{ flex: 1, marginLeft: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s ease' }}>
                {/* ── TOP HEADER ── */}
                <header style={{
                    height: '56px',
                    borderBottom: `1px solid ${t.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 28px',
                    background: t.headerBg,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 1px 12px rgba(0,0,0,0.15)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 90,
                    transition: 'background 0.4s ease, border-color 0.4s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: t.text,
                            letterSpacing: '-0.01em',
                            margin: 0,
                        }}>
                            {activeNav}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Dim toggle */}
                        <button
                            onClick={() => setIsDim(!isDim)}
                            title={isDim ? 'Standard mode' : 'Dim mode'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: `1px solid ${t.cardBorder}`,
                                background: 'transparent',
                                color: t.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {isDim ? <Sun size={14} /> : <Moon size={14} />}
                        </button>

                        {/* Profile pill */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 12px 4px 4px',
                            borderRadius: '20px',
                            background: t.cardBg,
                            border: `1px solid ${t.cardBorder}`,
                            cursor: 'default',
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: t.accentBg,
                                border: `1px solid ${t.accentBorder}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: t.accent,
                            }}>
                                {initial}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: t.textSec }}>
                                {username}
                            </span>
                        </div>
                    </div>
                </header>

                {activeNav === 'Wallet Management' && (<>
                    {/* ── STATS BAR ── */}
                    <div style={{
                        display: 'flex',
                        gap: '1px',
                        background: t.border,
                        borderBottom: `1px solid ${t.border}`,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    }}>
                        {[
                            { label: 'Total Balance', value: totalBalance, accent: true, isSol: true },
                            { label: 'Active Wallets', value: activeWalletCount },
                            { label: 'Token Holdings', value: totalHoldings },
                        ].map(({ label, value, accent, isSol }) => (
                            <div key={label} style={{
                                flex: 1,
                                padding: '16px 24px',
                                background: accent ? t.statsGradient : t.statsBg,
                            }}>
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: t.textDim,
                                    marginBottom: '6px',
                                }}>
                                    {label}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <div style={{
                                        fontSize: accent ? '20px' : '18px',
                                        fontWeight: 700,
                                        color: accent ? t.text : t.textSec,
                                        letterSpacing: '-0.02em',
                                        fontFamily: accent ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        {isSol && <SolLogo size={16} />}
                                        {isSol ? value.toFixed(4) : value}
                                    </div>
                                    {isSol && solPrice && (
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            color: t.textDim,
                                            opacity: 0.7,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}>
                                            ${(value * solPrice).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {/* Refresh button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px 20px',
                            background: t.statsBg,
                        }}>
                            <button
                                onClick={() => fetchLiveBalances()}
                                disabled={balanceLoading}
                                title="Refresh balances"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    border: `1px solid ${t.cardBorder}`,
                                    background: 'transparent',
                                    color: balanceLoading ? t.textDim : t.textMuted,
                                    cursor: balanceLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    animation: balanceLoading ? 'spin 1s linear infinite' : 'none',
                                }}
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ── CONTENT ── */}
                    <main style={{ flex: 1, display: 'flex', overflow: 'hidden', maxWidth: '100%' }}>
                        {/* ── LEFT: WALLET LIST ── */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                            {/* Toolbar */}
                            <div style={{
                                padding: '12px 20px',
                                borderBottom: `1px solid ${t.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                {/* Search */}
                                <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
                                    <Search size={14} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: t.textDim,
                                    }} />
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search wallets..."
                                        style={{
                                            ...inputBaseStyle,
                                            paddingLeft: '34px',
                                            width: '100%',
                                            fontSize: '12px',
                                        }}
                                    />
                                </div>

                                <div style={{ flex: 1 }} />

                                {/* Show Archived */}
                                <button
                                    onClick={() => setShowArchived(!showArchived)}
                                    style={{
                                        ...smallBtnStyle,
                                        background: showArchived ? t.accentBg : 'transparent',
                                        color: showArchived ? t.accent : t.textMuted,
                                        borderColor: showArchived ? t.accentBorder : t.cardBorder,
                                    }}
                                >
                                    <Archive size={13} />
                                    Archived
                                </button>

                                {/* Import */}
                                <button
                                    onClick={() => { setShowImport(!showImport); setShowCreate(false) }}
                                    style={{
                                        ...smallBtnStyle,
                                        background: showImport ? t.accentBg : 'transparent',
                                        color: showImport ? t.accent : t.textSec,
                                        borderColor: showImport ? t.accentBorder : t.cardBorder,
                                    }}
                                >
                                    <Download size={13} />
                                    Import
                                </button>

                                {/* Create */}
                                <button
                                    onClick={() => { setShowCreate(!showCreate); setShowImport(false) }}
                                    style={{
                                        ...smallBtnStyle,
                                        background: '#DC3545',
                                        color: '#fff',
                                        border: '1px solid #DC3545',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <Plus size={13} />
                                    Create
                                </button>
                            </div>

                            {/* ── Create / Import inline forms ── */}
                            {showCreate && (
                                <div style={{
                                    padding: '16px 20px',
                                    borderBottom: `1px solid ${t.border}`,
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-end',
                                    background: t.statsBg,
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: t.textDim,
                                            display: 'block',
                                            marginBottom: '6px',
                                        }}>Wallet Name</label>
                                        <input
                                            value={newWalletName}
                                            onChange={(e) => setNewWalletName(e.target.value)}
                                            placeholder="e.g. Trading Wallet"
                                            style={{ ...inputBaseStyle, width: '100%' }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                        />
                                    </div>
                                    <button onClick={handleCreate} style={{
                                        ...smallBtnStyle,
                                        background: '#DC3545',
                                        color: '#fff',
                                        border: '1px solid #DC3545',
                                        padding: '10px 20px',
                                    }}>
                                        Create Wallet
                                    </button>
                                </div>
                            )}

                            {showImport && (
                                <div style={{
                                    padding: '16px 20px',
                                    borderBottom: `1px solid ${t.border}`,
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-end',
                                    background: t.statsBg,
                                }}>
                                    <div style={{ width: '140px' }}>
                                        <label style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: t.textDim,
                                            display: 'block',
                                            marginBottom: '6px',
                                        }}>Name</label>
                                        <input
                                            value={importName}
                                            onChange={(e) => setImportName(e.target.value)}
                                            placeholder="Label"
                                            style={{ ...inputBaseStyle, width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: t.textDim,
                                            display: 'block',
                                            marginBottom: '6px',
                                        }}>Private Key (base58)</label>
                                        <input
                                            type="password"
                                            value={importPrivateKey}
                                            onChange={(e) => { setImportPrivateKey(e.target.value); setImportError('') }}
                                            placeholder="Paste base58 private key"
                                            style={{ ...inputBaseStyle, width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                                            autoComplete="off"
                                        />
                                        {importError && (
                                            <p style={{ color: '#DC3545', fontSize: '11px', margin: '6px 0 0', fontWeight: 500 }}>
                                                {importError}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={handleImport} style={{
                                        ...smallBtnStyle,
                                        background: '#DC3545',
                                        color: '#fff',
                                        border: '1px solid #DC3545',
                                        padding: '10px 20px',
                                    }}>
                                        Import
                                    </button>
                                </div>
                            )}

                            {/* ── Wallet table ── */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                    <thead>
                                        <tr>
                                            <th style={tableHeaderStyle}>Wallet</th>
                                            <th style={tableHeaderStyle}>Balance</th>
                                            <th style={tableHeaderStyle}>Holdings</th>
                                            <th style={{ ...tableHeaderStyle, width: '100px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredWallets.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                    <Wallet size={28} strokeWidth={1} style={{ color: t.textDim, marginBottom: '10px' }} />
                                                    <p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>
                                                        {searchQuery ? 'No wallets match your search' : 'No wallets yet — create or import one'}
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWallets.map((w, i) => <WalletRow key={w.id} wallet={w} index={i} />)
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── RIGHT: TRANSFER PANEL ── */}
                        <div style={{
                            width: '400px',
                            minWidth: '400px',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            background: t.cardBg,
                            borderLeft: `1px solid ${t.border}`,
                            overflowX: 'hidden',
                            overflowY: 'auto',
                        }}>
                            {/* Panel header */}
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: `1px solid ${t.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowDownUp size={16} style={{ color: t.accent }} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>
                                        Quick Private Transfer
                                    </span>
                                </div>
                                {swapStep !== 'idle' && swapStep !== 'quoting' && (
                                    <button onClick={resetSwap} style={{ ...iconBtnStyle, fontSize: '10px', color: t.textDim }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* ── SWAP CONTENT ── */}
                            {(swapStep === 'idle' || swapStep === 'quoting' || swapStep === 'confirming') ? (
                                <>
                                    {/* Source wallets zone */}
                                    <DropZone title="Source" wallets={sourceWallets} zone="source" />

                                    {/* Amount input */}
                                    <div style={{
                                        padding: '12px 16px',
                                        borderBottom: `1px solid ${t.border}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: t.textDim, letterSpacing: '0.03em' }}>
                                            AMOUNT (SOL)
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                value={swapAmount}
                                                onChange={(e) => { setSwapAmount(e.target.value); setQuoteData(null); setSwapStep('idle'); setQuoteError('') }}
                                                placeholder="0.00"
                                                step="0.001"
                                                min="0"
                                                style={{
                                                    flex: 1,
                                                    background: t.inputBg,
                                                    border: `1px solid ${t.cardBorder}`,
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    color: t.text,
                                                    fontSize: '14px',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    outline: 'none',
                                                }}
                                            />
                                            {sourceWallets.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const total = sourceWallets.reduce((s, w) => s + (w.balance || 0), 0)
                                                        const feeReserve = 0.01 * sourceWallets.length // reserve per source wallet for shield tx fees
                                                        const maxAmt = Math.max(0, total - feeReserve)
                                                        setSwapAmount(maxAmt.toFixed(6))
                                                        setQuoteData(null); setSwapStep('idle')
                                                    }}
                                                    style={{
                                                        ...smallBtnStyle,
                                                        fontSize: '10px',
                                                        padding: '6px 10px',
                                                        background: t.inputBg,
                                                        border: `1px solid ${t.cardBorder}`,
                                                        color: t.accent,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    MAX
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: '1px', background: t.accent, opacity: 0.3, margin: '0 20px' }} />

                                    {/* Destination zone */}
                                    <DropZone title="Destination" wallets={destWallets} zone="dest" />

                                    {/* Manual address input */}
                                    <div style={{
                                        padding: '8px 16px 12px',
                                        borderTop: destWallets.length === 0 ? 'none' : `1px solid ${t.border}`,
                                    }}>
                                        <input
                                            type="text"
                                            value={manualDestAddr}
                                            onChange={(e) => { setManualDestAddr(e.target.value); setQuoteData(null); setSwapStep('idle') }}
                                            placeholder="Or paste destination address..."
                                            style={{
                                                width: '100%',
                                                background: t.inputBg,
                                                border: `1px solid ${t.cardBorder}`,
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                color: t.text,
                                                fontSize: '11px',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    {/* Quote error */}
                                    {quoteError && (
                                        <div style={{
                                            padding: '8px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: '#DC3545',
                                            fontSize: '11px',
                                        }}>
                                            <AlertTriangle size={12} />
                                            {quoteError}
                                        </div>
                                    )}

                                    {/* Quote preview */}
                                    {quoteData && swapStep === 'confirming' && (
                                        <div style={{
                                            margin: '0 16px 12px',
                                            background: t.statsBg,
                                            border: `1px solid ${t.accentBorder}`,
                                            borderRadius: '10px',
                                            padding: '14px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: t.textDim }}>You Send</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {quoteData.amountIn} {quoteData.tokenSymbol || 'SOL'}
                                                </span>
                                            </div>
                                            {(quoteData.sources > 1) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: t.textMuted }}>Source Wallets</span>
                                                    <span style={{ fontSize: '11px', color: t.textSec, fontWeight: 600 }}>
                                                        {quoteData.sources} wallets
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: t.textDim }}>{quoteData.recipients > 1 ? 'Total Received' : 'Recipient Gets'}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: t.green, fontFamily: "'JetBrains Mono', monospace" }}>
                                                    ≈ {quoteData.amountOut} {quoteData.tokenSymbol || 'SOL'}
                                                </span>
                                            </div>
                                            {quoteData.recipients > 1 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: t.textMuted }}>Per Wallet ({quoteData.recipients} recipients)</span>
                                                    <span style={{ fontSize: '11px', color: t.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                                        ≈ {quoteData.perRecipientAmount} {quoteData.tokenSymbol || 'SOL'} each
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ height: '1px', background: t.border }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', color: t.textMuted }}>Relayer Fee (est.)</span>
                                                <span style={{ fontSize: '11px', color: t.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                                                    ~{quoteData.estimatedFee} {quoteData.tokenSymbol || 'SOL'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', color: t.textMuted }}>Method</span>
                                                <span style={{ fontSize: '11px', color: t.accent, fontWeight: 600 }}>
                                                    ZK Privacy (on-chain)
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div style={{ padding: '8px 16px 16px' }}>
                                        {swapStep === 'confirming' && quoteData ? (
                                            <button
                                                onClick={handleExecuteSwap}
                                                style={{
                                                    ...smallBtnStyle,
                                                    width: '100%',
                                                    padding: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    background: 'linear-gradient(135deg, #DC3545 0%, #a02030 100%)',
                                                    color: '#fff',
                                                    border: '1px solid rgba(220,53,69,0.5)',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                Confirm Private Transfer
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleGetQuote}
                                                disabled={quoteLoading || !swapAmount || sourceWallets.length === 0 || (!manualDestAddr.trim() && destWallets.length === 0)}
                                                style={{
                                                    ...smallBtnStyle,
                                                    width: '100%',
                                                    padding: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    background: (swapAmount && sourceWallets.length > 0 && (manualDestAddr.trim() || destWallets.length > 0))
                                                        ? t.accent : t.inputBg,
                                                    color: (swapAmount && sourceWallets.length > 0 && (manualDestAddr.trim() || destWallets.length > 0))
                                                        ? '#fff' : t.textDim,
                                                    border: `1px solid ${t.cardBorder}`,
                                                    borderRadius: '10px',
                                                    cursor: (swapAmount && sourceWallets.length > 0 && (manualDestAddr.trim() || destWallets.length > 0))
                                                        ? 'pointer' : 'not-allowed',
                                                    opacity: quoteLoading ? 0.7 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                {quoteLoading ? (
                                                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Getting Quote...</>
                                                ) : (
                                                    'Get Quote'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* ── PRIVACY TRANSFER STATUS TRACKER ── */
                                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Status steps */}
                                    {(() => {
                                        // Build dynamic steps based on source/dest count
                                        const mtp = multiTransferProgress
                                        const shieldSteps = sourceWallets.map((w, i) => ({
                                            label: sourceWallets.length > 1 ? `Shield ${activeNav === 'Wallet Management' ? 'SOL' : tokenSymbol} from ${w.name} (${i + 1}/${sourceWallets.length})` : `Shielding ${activeNav === 'Wallet Management' ? 'SOL' : tokenSymbol}`,
                                            key: `shield-${i}`,
                                            phase: 'shield',
                                            index: i,
                                        }))
                                        const destinations = getDestinationAddresses()
                                        const unshieldSteps = destinations.map((d, i) => ({
                                            label: destinations.length > 1 ? `Unshield → ${d.name} (${i + 1}/${destinations.length})` : `Unshielding to ${d.name}`,
                                            key: `unshield-${i}`,
                                            phase: 'unshield',
                                            index: i,
                                        }))
                                        const steps = [...shieldSteps, ...unshieldSteps, { label: 'Complete', key: 'complete', phase: 'done', index: -1 }]

                                        // Determine active step index
                                        let activeIdx = 0
                                        if (swapStep === 'shielding') {
                                            activeIdx = Math.max(0, mtp.shieldIndex)
                                        } else if (swapStep === 'unshielding') {
                                            activeIdx = shieldSteps.length + Math.max(0, mtp.unshieldIndex)
                                        } else if (swapStep === 'done') {
                                            activeIdx = steps.length - 1
                                        }

                                        const isFailed = swapStep === 'error'

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                                {steps.map((step, i) => {
                                                    const isComplete = !isFailed && i < activeIdx
                                                    const isActive = !isFailed && i === activeIdx
                                                    // Check if this unshield step had an error
                                                    const unshieldResult = step.phase === 'unshield' ? mtp.completedUnshields?.[step.index] : null
                                                    const stepFailed = unshieldResult?.error

                                                    return (
                                                        <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                            {/* Dot + line */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                                                                <div style={{
                                                                    width: isActive ? '14px' : '10px',
                                                                    height: isActive ? '14px' : '10px',
                                                                    borderRadius: '50%',
                                                                    background: (isFailed && i === activeIdx) || stepFailed ? '#DC3545'
                                                                        : isComplete ? t.green
                                                                            : isActive ? t.accent
                                                                                : t.inputBg,
                                                                    border: `2px solid ${(isFailed && i === activeIdx) || stepFailed ? '#DC3545'
                                                                        : isComplete ? t.green
                                                                            : isActive ? t.accent
                                                                                : t.cardBorder}`,
                                                                    transition: 'all 0.3s ease',
                                                                    boxShadow: isActive ? `0 0 12px ${t.accent}40` : 'none',
                                                                    animation: isActive && !isFailed ? 'pulse 2s ease-in-out infinite' : 'none',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    marginTop: '3px',
                                                                }}>
                                                                    {isComplete && !stepFailed && <Check size={6} style={{ color: '#fff' }} />}
                                                                    {stepFailed && <span style={{ color: '#fff', fontSize: '8px', fontWeight: 700 }}>✕</span>}
                                                                </div>
                                                                {i < steps.length - 1 && (
                                                                    <div style={{
                                                                        width: '2px',
                                                                        height: '28px',
                                                                        background: isComplete ? t.green : t.cardBorder,
                                                                        transition: 'background 0.3s ease',
                                                                    }} />
                                                                )}
                                                            </div>
                                                            {/* Label */}
                                                            <span style={{
                                                                fontSize: '12px',
                                                                fontWeight: isActive ? 700 : 500,
                                                                color: (isFailed && i === activeIdx) || stepFailed ? '#DC3545'
                                                                    : isComplete ? t.green
                                                                        : isActive ? t.text
                                                                            : t.textMuted,
                                                                paddingTop: '1px',
                                                                transition: 'color 0.3s ease',
                                                            }}>
                                                                {step.label}{stepFailed ? ' — failed' : ''}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()}

                                    {/* Swap details */}
                                    {activeSwap && (
                                        <div style={{
                                            background: t.statsBg,
                                            border: `1px solid ${t.border}`,
                                            borderRadius: '10px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            fontSize: '11px',
                                        }}>
                                            {activeSwap.amountSOL != null && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: t.textDim }}>Total Amount</span>
                                                    <span style={{ color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>
                                                        {activeSwap.amountSOL} {activeSwap.tokenSymbol || 'SOL'}
                                                    </span>
                                                </div>
                                            )}
                                            {activeSwap.feeSOL != null && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: t.textDim }}>Total Fees</span>
                                                    <span style={{ color: t.textSec, fontFamily: "'JetBrains Mono', monospace" }}>
                                                        {activeSwap.feeSOL.toFixed(6)} {activeSwap.tokenSymbol || 'SOL'}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Show completed unshield txs */}
                                            {multiTransferProgress.completedUnshields.length > 0 && (
                                                <>
                                                    <div style={{ height: '1px', background: t.border }} />
                                                    {multiTransferProgress.completedUnshields.map((u, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ color: u.error ? '#DC3545' : t.textDim, fontSize: '10px' }}>
                                                                {u.name} {u.error ? '✕' : '✓'}
                                                            </span>
                                                            {u.tx ? (
                                                                <button onClick={() => { navigator.clipboard.writeText(u.tx); setCopiedField(`tx-${i}`) }}
                                                                    style={{ ...iconBtnStyle, fontSize: '10px', color: t.accent, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    {shortAddr(u.tx)}
                                                                    {copiedField === `tx-${i}` ? <Check size={10} /> : <Copy size={10} />}
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '10px', color: '#DC3545' }}>failed</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {activeSwap.statusLabel && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: t.textDim }}>Status</span>
                                                    <span style={{
                                                        color: swapStep === 'done' ? t.green
                                                            : swapStep === 'error' ? '#DC3545'
                                                                : t.accent,
                                                        fontWeight: 600,
                                                    }}>
                                                        {activeSwap.statusLabel}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Error message */}
                                    {swapError && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            padding: '10px 14px',
                                            background: 'rgba(220,53,69,0.08)',
                                            border: '1px solid rgba(220,53,69,0.2)',
                                            borderRadius: '10px',
                                            color: '#DC3545',
                                            fontSize: '11px',
                                            lineHeight: 1.5,
                                        }}>
                                            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                            <span>{swapError}</span>
                                        </div>
                                    )}

                                    {/* Done / Reset button */}
                                    {(swapStep === 'done' || swapStep === 'error') && (
                                        <button
                                            onClick={resetSwap}
                                            style={{
                                                ...smallBtnStyle,
                                                width: '100%',
                                                padding: '12px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                background: t.inputBg,
                                                color: t.text,
                                                border: `1px solid ${t.cardBorder}`,
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            New Transfer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </>)}

                {/* ══════════════════════════════════════════
                    PRIVATE SWAP VIEW
                   ══════════════════════════════════════════ */}
                {
                    activeNav === 'Private Swap' && (
                        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg }}>
                            {/* Header banner */}
                            <div style={{
                                padding: '14px 28px',
                                borderBottom: `1px solid ${t.accentBorder}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: t.accentBg, flexShrink: 0, position: 'relative',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ArrowDownUp size={14} style={{ color: t.accent }} />
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: t.accent, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                                        Private Swap · ZK Shielded
                                    </span>
                                </div>
                                {swapStep !== 'idle' && swapStep !== 'quoting' && swapStep !== 'confirming' && (
                                    <button onClick={resetSwap} style={{ ...iconBtnStyle, fontSize: '10px', color: t.textDim, position: 'absolute', right: '20px' }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* ── WALLET STRIP (horizontal, top) ── */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', overflowX: 'auto', flexShrink: 0,
                                borderBottom: `1px solid ${t.border}`, background: t.cardBg,
                            }}>
                                <Wallet size={12} style={{ color: t.textDim, flexShrink: 0 }} />
                                <span style={{ fontSize: '8px', fontWeight: 700, color: t.textDim, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>WALLETS</span>
                                <div style={{ width: '1px', height: '16px', background: t.border, flexShrink: 0 }} />
                                <span style={{ fontSize: '7px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, opacity: 0.7 }}>CLICK=SRC · SHIFT+CLICK=DST</span>
                                <div style={{ width: '1px', height: '16px', background: t.border, flexShrink: 0 }} />
                                {wallets.filter(w => !w.archived).map((w, i) => {
                                    const isSrc = sourceWallets.some(sw => sw.id === w.id)
                                    const isDst = destWallets.some(dw => dw.id === w.id)
                                    return (
                                        <div
                                            key={w.id} draggable onDragStart={(e) => handleDragStart(e, w)}
                                            onClick={(e) => {
                                                if (e.shiftKey) {
                                                    // Shift+click = toggle destination
                                                    if (isDst) { setDestWallets(prev => prev.filter(dw => dw.id !== w.id)) }
                                                    else { setDestWallets(prev => [...prev, w]); setSourceWallets(prev => prev.filter(sw => sw.id !== w.id)) }
                                                } else {
                                                    // Click = toggle source
                                                    if (isSrc) { setSourceWallets(prev => prev.filter(sw => sw.id !== w.id)) }
                                                    else { setSourceWallets(prev => [...prev, w]); setDestWallets(prev => prev.filter(dw => dw.id !== w.id)) }
                                                }
                                                setQuoteData(null); setSwapStep('idle'); setQuoteError('')
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '6px 12px', flexShrink: 0, cursor: 'pointer',
                                                background: isSrc ? t.accentBg : isDst ? 'rgba(34,197,94,0.08)' : t.inputBg,
                                                border: `1px solid ${isSrc ? t.accentBorder : isDst ? 'rgba(34,197,94,0.3)' : t.cardBorder}`,
                                                borderRadius: '2px', transition: 'all 0.15s ease',
                                                userSelect: 'none',
                                            }}
                                        >
                                            <GripVertical size={10} style={{ color: t.textMuted }} />
                                            <span style={{ fontSize: '10px', fontWeight: 600, color: t.text, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{w.name}</span>
                                            <span style={{ fontSize: '9px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{(w.balance || 0).toFixed(4)} SOL</span>
                                            {isSrc && <span style={{ fontSize: '7px', fontWeight: 700, color: t.accent, fontFamily: "'JetBrains Mono', monospace", padding: '1px 4px', border: `1px solid ${t.accentBorder}`, borderRadius: '2px' }}>SRC</span>}
                                            {isDst && <span style={{ fontSize: '7px', fontWeight: 700, color: t.green, fontFamily: "'JetBrains Mono', monospace", padding: '1px 4px', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '2px' }}>DST</span>}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* ── 3-COLUMN LAYOUT ── */}
                            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

                                {/* ── LEFT PANEL: SOURCE WALLETS ── */}
                                <div
                                    onDragOver={(e) => handleDragOver(e, 'source')}
                                    onDragLeave={() => setDragOverZone(null)}
                                    onDrop={(e) => handleDrop(e, 'source')}
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        borderRight: `1px solid ${t.border}`,
                                        background: dragOverZone === 'source' ? t.dropHighlight : 'transparent',
                                        transition: 'background 0.2s ease', overflow: 'hidden', flexShrink: 0,
                                    }}
                                >
                                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: t.accent, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Source</span>
                                        {sourceWallets.length > 0 && (
                                            <span style={{ fontSize: '9px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                                                {sourceWallets.reduce((s, w) => s + (w.balance || 0), 0).toFixed(4)} SOL
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {sourceWallets.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '8px', height: '100%', minHeight: '80px' }}>
                                                <ArrowDownUp size={18} style={{ color: t.textDim, opacity: 0.5 }} />
                                                <p style={{ fontSize: '10px', color: t.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                                                    Click wallets above<br />to select as source
                                                </p>
                                            </div>
                                        ) : (
                                            sourceWallets.map((w) => (
                                                <div key={w.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${t.border}`, gap: '6px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 600, color: t.accent, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                                                        #{wallets.findIndex(ww => ww.id === w.id) + 1}
                                                    </span>
                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                                                    <span style={{ fontSize: '10px', color: t.textDim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{(w.balance || 0).toFixed(4)}</span>
                                                    <button onClick={() => removeFromZone(w.id, 'source')} title="Remove" style={{ ...iconBtnStyle, flexShrink: 0, padding: '2px' }}><X size={12} /></button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* ── CENTER PANEL: SWAP CONTROLS ── */}
                                <div style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    overflowY: 'auto', padding: '24px 20px',
                                }}>
                                    <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

                                        {/* SEND input */}
                                        <div style={{
                                            width: '100%',
                                            background: t.cardBg, border: `1px solid ${t.border}`,
                                            borderRadius: '4px', padding: '14px 16px',
                                            backdropFilter: 'blur(12px)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 700, color: t.textDim, letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace" }}>SEND</span>
                                                {sourceWallets.length > 0 && (
                                                    <span style={{ fontSize: '10px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                                                        BAL: {sourceWallets.reduce((s, w) => s + (w.balance || 0), 0).toFixed(4)} SOL
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: t.inputBg, border: `1px solid ${t.cardBorder}`, borderRadius: '2px', padding: '8px 10px' }}>
                                                <img src={TOKEN_IMAGES.sol} alt="SOL" style={{ width: '24px', height: '24px', borderRadius: '2px' }} />
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>SOL</span>
                                                <input
                                                    type="number" value={swapAmount}
                                                    onChange={(e) => { setSwapAmount(e.target.value); setQuoteData(null); setSwapStep('idle'); setQuoteError('') }}
                                                    placeholder="0.00" step="0.001" min="0"
                                                    style={{ flex: 1, background: 'transparent', border: 'none', color: t.text, fontSize: '18px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'right' }}
                                                />
                                                {sourceWallets.length > 0 && (
                                                    <button onClick={() => { const total = sourceWallets.reduce((s, w) => s + (w.balance || 0), 0); setSwapAmount(Math.max(0, total - 0.01 * sourceWallets.length).toFixed(6)); setQuoteData(null); setSwapStep('idle') }}
                                                        style={{ padding: '3px 8px', fontSize: '9px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', border: `1px solid ${t.accent}`, borderRadius: '2px', background: 'transparent', color: t.accent, cursor: 'pointer' }}>
                                                        MAX
                                                    </button>
                                                )}
                                            </div>
                                            {sourceWallets.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                                    {sourceWallets.map(w => (
                                                        <span key={w.id} style={{ fontSize: '9px', color: t.accent, fontFamily: "'JetBrains Mono', monospace", padding: '2px 6px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {w.name}
                                                            <X size={8} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeFromZone(w.id, 'source')} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Token circle divider */}
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', position: 'relative', width: '100%' }}>
                                            <div style={{
                                                width: '52px', height: '52px', borderRadius: '50%',
                                                background: t.statsBg, border: `2px solid ${t.accent}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                zIndex: 2,
                                            }}>
                                                <img src={TOKEN_IMAGES[selectedToken]} alt={selectedToken} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                            </div>
                                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: t.border }} />
                                        </div>

                                        {/* RECEIVE section */}
                                        <div style={{
                                            width: '100%',
                                            background: t.cardBg, border: `1px solid ${t.border}`,
                                            borderRadius: '4px', padding: '14px 16px',
                                            backdropFilter: 'blur(12px)',
                                        }}>
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: t.textDim, letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '8px' }}>RECEIVE</span>

                                            {/* Token grid — 3 col */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                                                {SUPPORTED_TOKENS.map(tk => {
                                                    const isActive = selectedToken === tk.name
                                                    return (
                                                        <button key={tk.name}
                                                            onClick={() => { setSelectedToken(tk.name); setQuoteData(null); setSwapStep('idle'); setQuoteError('') }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 8px', borderRadius: '2px',
                                                                border: isActive ? `1px solid ${t.accent}` : `1px solid ${t.cardBorder}`,
                                                                background: isActive ? t.accentBg : t.inputBg,
                                                                cursor: 'pointer', transition: 'all 0.15s ease',
                                                                boxShadow: isActive ? `inset 0 0 0 1px ${t.accent}` : 'none',
                                                            }}
                                                        >
                                                            <img src={TOKEN_IMAGES[tk.name]} alt={tk.name} style={{ width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0 }} />
                                                            <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: "'JetBrains Mono', monospace", color: isActive ? t.accent : t.textMuted, letterSpacing: '0.04em' }}>
                                                                {tk.name.toUpperCase()}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Estimated receive */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: t.inputBg, border: `1px solid ${t.cardBorder}`, borderRadius: '2px', padding: '8px 10px', marginBottom: '8px' }}>
                                                <img src={TOKEN_IMAGES[selectedToken]} alt={selectedToken} style={{ width: '24px', height: '24px', borderRadius: '2px' }} />
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{tokenSymbol}</span>
                                                <span style={{ flex: 1, textAlign: 'right', fontSize: '18px', fontWeight: 600, color: quoteData ? (t.green || '#22c55e') : t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {quoteData ? `≈ ${quoteData.amountOut}` : '—'}
                                                </span>
                                            </div>

                                            {/* Dest wallet badges */}
                                            {destWallets.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                                    {destWallets.map(w => (
                                                        <span key={w.id} style={{ fontSize: '9px', color: t.green || '#22c55e', fontFamily: "'JetBrains Mono', monospace", padding: '2px 6px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {w.name}
                                                            <X size={8} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeFromZone(w.id, 'dest')} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Manual address input */}
                                            {destWallets.length === 0 && (
                                                <input
                                                    type="text" value={manualDestAddr}
                                                    onChange={(e) => { setManualDestAddr(e.target.value); setQuoteData(null); setSwapStep('idle') }}
                                                    placeholder="Or paste destination address..."
                                                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.cardBorder}`, borderRadius: '2px', padding: '8px 10px', color: t.text, fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box' }}
                                                />
                                            )}
                                        </div>

                                        {/* Quote preview */}
                                        {quoteData && swapStep === 'confirming' && (
                                            <div style={{ background: t.statsBg, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '9px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>FEE (EST.)</span>
                                                    <span style={{ fontSize: '10px', color: t.textDim, fontFamily: "'JetBrains Mono', monospace" }}>~{quoteData.estimatedFee} {quoteData.tokenSymbol}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '9px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>METHOD</span>
                                                    <span style={{ fontSize: '10px', color: t.accent, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>ZK PRIVACY</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quote error */}
                                        {quoteError && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.15)', borderRadius: '2px', color: '#DC3545', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", marginTop: '6px' }}>
                                                <AlertTriangle size={11} />
                                                {quoteError}
                                            </div>
                                        )}

                                        {/* Progress tracker */}
                                        {(swapStep === 'shielding' || swapStep === 'unshielding' || swapStep === 'done' || swapStep === 'error') && (
                                            <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                                {(() => {
                                                    const steps = [
                                                        { label: 'SHIELD SOL', key: 'shield-0' },
                                                        { label: `UNSHIELD ${tokenSymbol}`, key: 'unshield-0' },
                                                        { label: 'COMPLETE', key: 'complete' },
                                                    ]
                                                    let activeIdx = 0
                                                    if (swapStep === 'shielding') activeIdx = 0
                                                    else if (swapStep === 'unshielding') activeIdx = 1
                                                    else if (swapStep === 'done') activeIdx = steps.length - 1
                                                    const isFailed = swapStep === 'error'
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                                            {steps.map((step, i) => {
                                                                const isComplete = !isFailed && i < activeIdx
                                                                const isActive = !isFailed && i === activeIdx
                                                                return (
                                                                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px' }}>
                                                                            <div style={{
                                                                                width: isActive ? '10px' : '8px', height: isActive ? '10px' : '8px', borderRadius: '1px',
                                                                                background: (isFailed && i === activeIdx) ? '#DC3545' : isComplete ? t.green : isActive ? t.accent : t.inputBg,
                                                                                border: `1px solid ${(isFailed && i === activeIdx) ? '#DC3545' : isComplete ? t.green : isActive ? t.accent : t.cardBorder}`,
                                                                                transition: 'all 0.3s ease', animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            }}>
                                                                                {isComplete && <Check size={5} style={{ color: '#fff' }} />}
                                                                            </div>
                                                                            {i < steps.length - 1 && <div style={{ width: '1px', height: '14px', background: isComplete ? t.green : t.border, transition: 'background 0.3s ease' }} />}
                                                                        </div>
                                                                        <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', color: (isFailed && i === activeIdx) ? '#DC3545' : isComplete ? t.green : isActive ? t.text : t.textMuted }}>
                                                                            {step.label}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )
                                                })()}
                                                {activeSwap && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${t.border}`, paddingTop: '8px' }}>
                                                        <span style={{ fontSize: '9px', color: t.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>STATUS</span>
                                                        <span style={{ fontSize: '10px', color: swapStep === 'done' ? t.green : swapStep === 'error' ? '#DC3545' : t.accent, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                                                            {activeSwap.statusLabel}
                                                        </span>
                                                    </div>
                                                )}
                                                {swapError && (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '8px 10px', background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.12)', borderRadius: '2px', color: '#DC3545', fontSize: '10px', lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                                                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
                                                        <span>{swapError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action button */}
                                        <div style={{ marginTop: '8px' }}>
                                            {swapStep === 'confirming' && quoteData ? (
                                                <button onClick={handleExecuteSwap} style={{ ...smallBtnStyle, width: '100%', padding: '12px', fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', background: 'linear-gradient(135deg, #DC3545 0%, #a02030 100%)', color: '#fff', border: '1px solid rgba(220,53,69,0.5)', borderRadius: '2px', cursor: 'pointer' }}>
                                                    Confirm Private Swap
                                                </button>
                                            ) : (swapStep === 'done' || swapStep === 'error') ? (
                                                <button onClick={resetSwap} style={{ ...smallBtnStyle, width: '100%', padding: '12px', fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', background: t.inputBg, color: t.text, border: `1px solid ${t.cardBorder}`, borderRadius: '2px', cursor: 'pointer' }}>
                                                    New Swap
                                                </button>
                                            ) : swapStep === 'idle' || swapStep === 'quoting' ? (
                                                <button onClick={handleGetQuote} disabled={quoteLoading || !swapAmount || parseFloat(swapAmount) <= 0}
                                                    style={{ ...smallBtnStyle, width: '100%', padding: '12px', fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', background: (!swapAmount || parseFloat(swapAmount) <= 0) ? t.inputBg : 'linear-gradient(135deg, #DC3545 0%, #a02030 100%)', color: (!swapAmount || parseFloat(swapAmount) <= 0) ? t.textDim : '#fff', border: `1px solid ${(!swapAmount || parseFloat(swapAmount) <= 0) ? t.cardBorder : 'rgba(220,53,69,0.5)'}`, borderRadius: '2px', cursor: (!swapAmount || parseFloat(swapAmount) <= 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    {quoteLoading ? (<><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Getting Quote...</>) : 'Get Quote'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                {/* ── RIGHT PANEL: DESTINATION WALLETS ── */}
                                <div
                                    onDragOver={(e) => handleDragOver(e, 'dest')}
                                    onDragLeave={() => setDragOverZone(null)}
                                    onDrop={(e) => handleDrop(e, 'dest')}
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        borderLeft: `1px solid ${t.border}`,
                                        background: dragOverZone === 'dest' ? t.dropHighlight : 'transparent',
                                        transition: 'background 0.2s ease', overflow: 'hidden', flexShrink: 0,
                                    }}
                                >
                                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: t.green || '#22c55e', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Destination</span>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {destWallets.length === 0 && !manualDestAddr ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '8px', height: '100%', minHeight: '80px' }}>
                                                <ArrowDownUp size={18} style={{ color: t.textDim, opacity: 0.5 }} />
                                                <p style={{ fontSize: '10px', color: t.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                                                    Shift+click wallets<br />above for destination
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {destWallets.map((w) => (
                                                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${t.border}`, gap: '6px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 600, color: t.green || '#22c55e', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                                                            #{wallets.findIndex(ww => ww.id === w.id) + 1}
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                                                        <span style={{ fontSize: '10px', color: t.textDim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{(w.balance || 0).toFixed(4)}</span>
                                                        <button onClick={() => removeFromZone(w.id, 'dest')} title="Remove" style={{ ...iconBtnStyle, flexShrink: 0, padding: '2px' }}><X size={12} /></button>
                                                    </div>
                                                ))}
                                                {manualDestAddr && (
                                                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${t.border}`, gap: '6px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 600, color: t.green || '#22c55e', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>✦</span>
                                                        <span style={{ fontSize: '10px', color: t.text, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manualDestAddr.slice(0, 8)}...{manualDestAddr.slice(-6)}</span>
                                                        <button onClick={() => setManualDestAddr('')} title="Remove" style={{ ...iconBtnStyle, flexShrink: 0, padding: '2px' }}><X size={12} /></button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </main>
                    )}
            </div>


            {/* Private Key Modal */}
            {
                privateKeyModal && (
                    <div
                        onClick={() => setPrivateKeyModal(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 999,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: t.statsBg,
                                border: `1px solid ${t.border}`,
                                borderRadius: '14px',
                                padding: '20px 24px',
                                maxWidth: '420px',
                                width: '90%',
                                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                            }}
                        >
                            {/* Title */}
                            <label style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: t.textDim,
                                display: 'block',
                                marginBottom: '12px',
                            }}>Private Key — {privateKeyModal.name}</label>

                            {/* Warning text */}
                            <div style={{
                                fontSize: '12px', color: '#DC3545', lineHeight: 1.5,
                                marginBottom: '14px',
                            }}>
                                <strong>We will never ask for your private key.</strong> Do not share it with anyone. Anyone with your private key can steal your funds.
                            </div>

                            {/* Private Key Field */}
                            <label style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: t.textDim,
                                display: 'block',
                                marginBottom: '6px',
                            }}>Your Private Key</label>
                            <div
                                style={{
                                    ...inputBaseStyle,
                                    width: '100%',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '11px',
                                    color: '#DC3545',
                                    wordBreak: 'break-all',
                                    lineHeight: 1.6,
                                    cursor: 'pointer',
                                    filter: 'blur(6px)',
                                    transition: 'filter 0.25s ease',
                                    userSelect: 'all',
                                    padding: '10px 12px',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'blur(0px)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'blur(6px)'}
                                onClick={() => handleCopy(privateKeyModal.key, `pk-${privateKeyModal.id}`)}
                                title="Hover to reveal, click to copy"
                            >
                                {privateKeyModal.key}
                            </div>
                            <div style={{ fontSize: '10px', color: t.textDim, marginTop: '4px', textAlign: 'center' }}>
                                Hover to reveal • Click to copy
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                                <button
                                    onClick={() => handleCopy(privateKeyModal.key, `pk-${privateKeyModal.id}`)}
                                    style={{
                                        ...smallBtnStyle,
                                        flex: 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        background: copiedField === `pk-${privateKeyModal.id}` ? 'rgba(34,197,94,0.15)' : '#DC3545',
                                        color: copiedField === `pk-${privateKeyModal.id}` ? '#22c55e' : '#fff',
                                        border: copiedField === `pk-${privateKeyModal.id}` ? '1px solid rgba(34,197,94,0.3)' : '1px solid #DC3545',
                                        padding: '10px 20px',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {copiedField === `pk-${privateKeyModal.id}` ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedField === `pk-${privateKeyModal.id}` ? 'Copied!' : 'Copy to Clipboard'}
                                </button>
                                <button
                                    onClick={() => setPrivateKeyModal(null)}
                                    style={{
                                        ...smallBtnStyle,
                                        padding: '10px 20px',
                                        background: 'transparent',
                                        color: t.textMuted,
                                        border: `1px solid ${t.border}`,
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Spin animation for refresh */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
                    50% { opacity: 0.6; box-shadow: 0 0 16px currentColor; }
                }
            `}</style>
        </div >
    )
}
