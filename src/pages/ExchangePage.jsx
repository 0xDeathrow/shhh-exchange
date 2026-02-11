import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Copy, Check, ShieldCheck, KeyRound, AlertTriangle, User, Upload } from 'lucide-react'
import { generatePassphrase, createAccount, accessAccount } from '../utils/crypto'
import { importBackup } from '../utils/walletService.js'
import ParticleScene from '../components/ParticleScene'

/* ──────────────────────────────────────────
   Auth state machine
   IDLE → GENERATED → CONFIRM → USERNAME → (navigate to /dashboard)
   IDLE → ACCESS → (navigate to /dashboard)
   ────────────────────────────────────────── */

export default function ExchangePage() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('create')
    const [step, setStep] = useState('idle')
    const [passphrase, setPassphrase] = useState('')
    const [saved, setSaved] = useState(false)
    const [confirmInput, setConfirmInput] = useState('')
    const [accessInput, setAccessInput] = useState('')
    const [usernameInput, setUsernameInput] = useState('')
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [importFile, setImportFile] = useState(null)

    // ── Create flow ──
    const handleGenerate = () => {
        const phrase = generatePassphrase()
        setPassphrase(phrase)
        setStep('generated')
        setSaved(false)
        setError('')
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(passphrase)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleProceedToConfirm = () => {
        setStep('confirm')
        setConfirmInput('')
        setError('')
    }

    const handleConfirm = async () => {
        if (confirmInput.trim().toLowerCase() !== passphrase.trim().toLowerCase()) {
            setError('Passphrase does not match. Please try again.')
            return
        }
        // Move to username step
        setStep('username')
        setUsernameInput('')
        setError('')
    }

    const handleCreateWithUsername = async () => {
        const name = usernameInput.trim()
        if (!name) {
            setError('Please choose a username.')
            return
        }
        if (name.length < 2 || name.length > 20) {
            setError('Username must be 2–20 characters.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const p = await createAccount(passphrase, name)
            navigate('/dashboard', { state: { profile: p, passphrase } })
        } catch {
            setError('Something went wrong. Please try again.')
        }
        setLoading(false)
    }

    // ── Access flow ──
    const handleAccess = async () => {
        if (!accessInput.trim()) {
            setError('Please enter your passphrase.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const p = await accessAccount(accessInput.trim().toLowerCase())
            if (!p) {
                setError('No account found for this passphrase. Check your words and try again.')
                setLoading(false)
                return
            }
            navigate('/dashboard', { state: { profile: p, passphrase: accessInput.trim().toLowerCase() } })
        } catch {
            setError('Unable to decrypt. Please check your passphrase.')
        }
        setLoading(false)
    }

    // ── Import backup flow ──
    const handleImportBackup = async () => {
        if (!importFile) {
            setError('Please select a .whispr backup file.')
            return
        }
        if (!accessInput.trim()) {
            setError('Please enter the passphrase used when this backup was created.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const { profile, wallets } = await importBackup(importFile, accessInput.trim().toLowerCase())
            if (!profile) {
                setError('Wrong passphrase — cannot decrypt this backup.')
                setLoading(false)
                return
            }
            navigate('/dashboard', { state: { profile, passphrase: accessInput.trim().toLowerCase() } })
        } catch (err) {
            setError(err.message || 'Failed to import backup.')
        }
        setLoading(false)
    }

    // ── Shared styles ──
    const cardStyle = {
        background: 'rgba(33, 37, 41, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '2px',
        borderLeft: '4px solid #DC3545',
        borderTop: '1px solid rgba(206, 212, 218, 0.06)',
        borderRight: '1px solid rgba(206, 212, 218, 0.06)',
        borderBottom: '1px solid rgba(206, 212, 218, 0.06)',
        padding: '36px 40px',
        maxWidth: '460px',
        width: '100%',
        position: 'relative',
        zIndex: 30,
    }

    const btnPrimary = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '13px 28px',
        background: 'var(--grey-50)',
        color: 'var(--grey-900)',
        border: 'none',
        borderRadius: '2px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
    }

    const btnRed = {
        ...btnPrimary,
        background: '#DC3545',
        color: '#fff',
    }

    const btnSecondary = {
        ...btnPrimary,
        background: 'rgba(206, 212, 218, 0.06)',
        color: 'var(--grey-200)',
        border: '1px solid rgba(206, 212, 218, 0.1)',
    }

    const inputStyle = {
        width: '100%',
        padding: '13px 16px',
        background: 'rgba(33, 37, 41, 0.9)',
        border: '1px solid rgba(206, 212, 218, 0.1)',
        borderRadius: '2px',
        color: 'var(--grey-100)',
        fontSize: '14px',
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
    }

    const labelStyle = {
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--grey-500)',
        marginBottom: '8px',
        display: 'block',
    }

    // ── Background scene config: two spheres at corners, cropped off edges ──
    const bgSpheres = [
        { x: -15, y: -9, scale: 1.3 },
        { x: 15, y: 9, scale: 1.3 },
    ]

    // ── Auth view ──
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--grey-900)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background particle animation — two spheres exchanging nodes */}
            <ParticleScene
                spheres={bgSpheres}
                opacity={0.25}
                showTrackers={false}
                interactive={true}
            />

            {/* Branding */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--grey-50)',
                zIndex: 30,
            }}>
                WHISPR<span style={{ color: '#DC3545' }}>.</span>
            </div>

            <div style={cardStyle}>
                {/* Tab switcher */}
                <div style={{
                    display: 'flex',
                    gap: '0',
                    marginBottom: '32px',
                    borderBottom: '1px solid rgba(206, 212, 218, 0.08)',
                }}>
                    {['create', 'access', 'import'].map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setTab(t)
                                setStep('idle')
                                setError('')
                                setPassphrase('')
                                setConfirmInput('')
                                setAccessInput('')
                                setUsernameInput('')
                                setSaved(false)
                                setImportFile(null)
                            }}
                            style={{
                                padding: '0 0 14px',
                                marginRight: '28px',
                                border: 'none',
                                borderBottom: tab === t ? '2px solid #DC3545' : '2px solid transparent',
                                fontSize: '13px',
                                fontWeight: tab === t ? 600 : 500,
                                fontFamily: "'Inter', sans-serif",
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: 'none',
                                color: tab === t ? 'var(--grey-50)' : 'var(--grey-500)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {t === 'create' ? 'Create Account' : t === 'access' ? 'Access Account' : 'Import Backup'}
                        </button>
                    ))}
                </div>

                {/* ── CREATE TAB ── */}
                {tab === 'create' && step === 'idle' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: 'var(--grey-50)',
                                marginBottom: '8px',
                                letterSpacing: '-0.02em',
                            }}>
                                Create Your Account
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--grey-400)',
                                lineHeight: 1.6,
                                maxWidth: '360px',
                                margin: '0 auto',
                            }}>
                                We'll generate a secret passphrase — 12 random words that act as your private key. No email. No password. No KYC.
                            </p>
                        </div>
                        <button onClick={handleGenerate} style={btnRed}>
                            Generate My Passphrase
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {tab === 'create' && step === 'generated' && (
                    <div>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--grey-50)',
                            marginBottom: '6px',
                            letterSpacing: '-0.02em',
                        }}>
                            Your Secret Passphrase
                        </h2>
                        <p style={{
                            fontSize: '13px',
                            color: 'var(--grey-400)',
                            marginBottom: '20px',
                            lineHeight: 1.5,
                        }}>
                            Write these 12 words down and keep them somewhere safe.
                        </p>

                        {/* Passphrase display */}
                        <div style={{
                            background: 'rgba(33, 37, 41, 0.8)',
                            border: '1px solid rgba(206, 212, 218, 0.1)',
                            borderRadius: '2px',
                            padding: '20px',
                            marginBottom: '16px',
                            position: 'relative',
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '10px',
                            }}>
                                {passphrase.split(' ').map((word, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        background: 'rgba(52, 58, 64, 0.5)',
                                        borderRadius: '2px',
                                    }}>
                                        <span style={{
                                            fontSize: '10px',
                                            color: 'var(--grey-600)',
                                            fontWeight: 600,
                                            minWidth: '16px',
                                        }}>{i + 1}</span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: 'var(--grey-100)',
                                            fontWeight: 500,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}>{word}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleCopy}
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: 'rgba(206, 212, 218, 0.08)',
                                    border: '1px solid rgba(206, 212, 218, 0.1)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: 'var(--grey-300)',
                                    fontSize: '11px',
                                    fontFamily: "'Inter', sans-serif",
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        {/* Warning */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '14px',
                            background: 'rgba(255, 183, 77, 0.06)',
                            border: '1px solid rgba(255, 183, 77, 0.15)',
                            borderRadius: '2px',
                            marginBottom: '20px',
                        }}>
                            <AlertTriangle size={16} style={{ color: '#FFB74D', flexShrink: 0, marginTop: '1px' }} />
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--grey-300)',
                                lineHeight: 1.5,
                                margin: 0,
                            }}>
                                This passphrase is the <strong style={{ color: 'var(--grey-100)' }}>only way</strong> to access your account. If you lose it, your account cannot be recovered. We never store or see your passphrase.
                            </p>
                        </div>

                        {/* Saved checkbox */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            padding: '12px',
                            borderRadius: '2px',
                            background: saved ? 'rgba(206, 212, 218, 0.04)' : 'transparent',
                            transition: 'background 0.2s ease',
                        }}>
                            <input
                                type="checkbox"
                                checked={saved}
                                onChange={(e) => setSaved(e.target.checked)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: 'var(--grey-300)',
                                    cursor: 'pointer',
                                }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--grey-200)', fontWeight: 500 }}>
                                I have saved my passphrase safely
                            </span>
                        </label>

                        <button
                            onClick={handleProceedToConfirm}
                            disabled={!saved}
                            style={{
                                ...btnRed,
                                opacity: saved ? 1 : 0.35,
                                cursor: saved ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Continue
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {tab === 'create' && step === 'confirm' && (
                    <div>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--grey-50)',
                            marginBottom: '6px',
                            letterSpacing: '-0.02em',
                        }}>
                            Confirm Your Passphrase
                        </h2>
                        <p style={{
                            fontSize: '13px',
                            color: 'var(--grey-400)',
                            marginBottom: '24px',
                            lineHeight: 1.5,
                        }}>
                            Type your 12 words below to verify you've saved them correctly.
                        </p>

                        <label style={labelStyle}>Your 12-word passphrase</label>
                        <textarea
                            value={confirmInput}
                            onChange={(e) => { setConfirmInput(e.target.value); setError('') }}
                            placeholder="word1 word2 word3 ..."
                            rows={3}
                            style={{
                                ...inputStyle,
                                resize: 'none',
                                marginBottom: '8px',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                lineHeight: 1.6,
                            }}
                        />

                        {error && (
                            <p style={{
                                fontSize: '12px',
                                color: '#EF5350',
                                marginBottom: '12px',
                                marginTop: '4px',
                            }}>{error}</p>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={loading || !confirmInput.trim()}
                            style={{
                                ...btnRed,
                                marginTop: '12px',
                                opacity: loading || !confirmInput.trim() ? 0.5 : 1,
                                cursor: loading || !confirmInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                        >
                            Confirm Passphrase
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── USERNAME STEP ── */}
                {tab === 'create' && step === 'username' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: 'var(--grey-50)',
                                marginBottom: '8px',
                                letterSpacing: '-0.02em',
                            }}>
                                Choose a Username
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--grey-400)',
                                lineHeight: 1.6,
                                maxWidth: '360px',
                                margin: '0 auto',
                            }}>
                                Pick a display name for your account. This is how you'll appear on the platform.
                            </p>
                        </div>

                        <label style={labelStyle}>Username</label>
                        <input
                            type="text"
                            value={usernameInput}
                            onChange={(e) => { setUsernameInput(e.target.value); setError('') }}
                            placeholder="e.g. satoshi"
                            maxLength={20}
                            style={{
                                ...inputStyle,
                                marginBottom: '8px',
                            }}
                        />
                        <p style={{
                            fontSize: '11px',
                            color: 'var(--grey-500)',
                            marginBottom: '16px',
                            marginTop: '4px',
                        }}>
                            2–20 characters
                        </p>

                        {error && (
                            <p style={{
                                fontSize: '12px',
                                color: '#EF5350',
                                marginBottom: '12px',
                            }}>{error}</p>
                        )}

                        <button
                            onClick={handleCreateWithUsername}
                            disabled={loading || !usernameInput.trim()}
                            style={{
                                ...btnRed,
                                opacity: loading || !usernameInput.trim() ? 0.5 : 1,
                                cursor: loading || !usernameInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                )}

                {/* ── ACCESS TAB ── */}
                {tab === 'access' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: 'var(--grey-50)',
                                marginBottom: '8px',
                                letterSpacing: '-0.02em',
                            }}>
                                Access Your Account
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--grey-400)',
                                lineHeight: 1.6,
                                maxWidth: '360px',
                                margin: '0 auto',
                            }}>
                                Enter the 12-word passphrase you were given when you created your account.
                            </p>
                        </div>

                        <label style={labelStyle}>Your 12-word passphrase</label>
                        <textarea
                            value={accessInput}
                            onChange={(e) => { setAccessInput(e.target.value); setError('') }}
                            placeholder="word1 word2 word3 ..."
                            rows={3}
                            style={{
                                ...inputStyle,
                                resize: 'none',
                                marginBottom: '8px',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                lineHeight: 1.6,
                            }}
                        />

                        {error && (
                            <p style={{
                                fontSize: '12px',
                                color: '#EF5350',
                                marginBottom: '12px',
                                marginTop: '4px',
                            }}>{error}</p>
                        )}

                        <button
                            onClick={handleAccess}
                            disabled={loading || !accessInput.trim()}
                            style={{
                                ...btnRed,
                                marginTop: '12px',
                                opacity: loading || !accessInput.trim() ? 0.5 : 1,
                                cursor: loading || !accessInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Unlocking...' : 'Unlock Account'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </div>
                )}

                {/* ── IMPORT BACKUP TAB ── */}
                {tab === 'import' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: 'var(--grey-50)',
                                marginBottom: '8px',
                                letterSpacing: '-0.02em',
                            }}>
                                Import Backup
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--grey-400)',
                                lineHeight: 1.6,
                                maxWidth: '360px',
                                margin: '0 auto',
                            }}>
                                Upload a <span style={{ color: 'var(--grey-200)', fontWeight: 600 }}>.whispr</span> backup file and enter your passphrase to restore your account on this device.
                            </p>
                        </div>

                        <label style={labelStyle}>Backup file</label>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '18px',
                                border: `2px dashed ${importFile ? '#DC3545' : 'rgba(206, 212, 218, 0.15)'}`,
                                borderRadius: '2px',
                                cursor: 'pointer',
                                marginBottom: '20px',
                                transition: 'border-color 0.2s ease',
                                background: importFile ? 'rgba(220, 53, 69, 0.05)' : 'transparent',
                            }}
                        >
                            <Upload size={18} style={{ color: importFile ? '#DC3545' : 'var(--grey-500)' }} />
                            <span style={{
                                fontSize: '13px',
                                color: importFile ? 'var(--grey-100)' : 'var(--grey-500)',
                                fontWeight: importFile ? 600 : 400,
                            }}>
                                {importFile ? importFile.name : 'Click to select .whispr file'}
                            </span>
                            <input
                                type="file"
                                accept=".whispr,.json"
                                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setError('') }}
                                style={{ display: 'none' }}
                            />
                        </label>

                        <label style={labelStyle}>Your 12-word passphrase</label>
                        <textarea
                            value={accessInput}
                            onChange={(e) => { setAccessInput(e.target.value); setError('') }}
                            placeholder="word1 word2 word3 ..."
                            rows={3}
                            style={{
                                ...inputStyle,
                                resize: 'none',
                                marginBottom: '8px',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                lineHeight: 1.6,
                            }}
                        />

                        {error && (
                            <p style={{
                                fontSize: '12px',
                                color: '#EF5350',
                                marginBottom: '12px',
                                marginTop: '4px',
                            }}>{error}</p>
                        )}

                        <button
                            onClick={handleImportBackup}
                            disabled={loading || !importFile || !accessInput.trim()}
                            style={{
                                ...btnRed,
                                marginTop: '12px',
                                opacity: loading || !importFile || !accessInput.trim() ? 0.5 : 1,
                                cursor: loading || !importFile || !accessInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Restoring...' : 'Restore Account'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </div>
                )}
            </div>

            <Link to="/" style={{
                marginTop: '24px',
                fontSize: '12px',
                color: 'var(--grey-500)',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 30,
            }}>
                ← Back to home
            </Link>
        </div>
    )
}
