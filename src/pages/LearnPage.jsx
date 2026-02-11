import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Eye, Zap, Globe, Lock, RefreshCw } from 'lucide-react'
import ParticleScene from '../components/ParticleScene'

const features = [
    {
        icon: Shield,
        title: 'Zero-Knowledge Auth',
        desc: 'No email. No password. Your 12-word passphrase is your identity — generated locally, never stored on our servers.',
    },
    {
        icon: Eye,
        title: 'Non-KYC Trading',
        desc: 'Trade without handing over your passport. WHISPR never collects personal data — your privacy is the product.',
    },
    {
        icon: Lock,
        title: 'Client-Side Encryption',
        desc: 'All account data is encrypted with AES-256-GCM before it touches storage. Only your passphrase can unlock it.',
    },
    {
        icon: Globe,
        title: 'Any Chain, One Interface',
        desc: 'Swap assets across Bitcoin, Ethereum, Solana, and more — all from a single, unified exchange.',
    },
    {
        icon: Zap,
        title: 'Instant Execution',
        desc: 'Trades execute in seconds, not minutes. Our routing engine finds the optimal path across liquidity pools.',
    },
    {
        icon: RefreshCw,
        title: 'Atomic Swaps',
        desc: 'Cross-chain swaps happen atomically — either both sides complete, or nothing moves. No counterparty risk.',
    },
]

export default function LearnPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--grey-800)',
            position: 'relative',
            overflow: 'auto',
        }}>
            {/* Background animation — single subtle sphere */}
            <ParticleScene
                spheres={[{ x: 12, y: -4, scale: 1.0 }]}
                opacity={0.15}
                showTrackers={false}
                interactive={true}
            />

            {/* Content overlay */}
            <div style={{
                position: 'relative',
                zIndex: 20,
                maxWidth: '960px',
                margin: '0 auto',
                padding: '80px 24px 120px',
            }}>

                {/* Header */}
                <header style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '24px',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Link to="/" style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '16px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: 'var(--grey-50)',
                        textDecoration: 'none',
                    }}>
                        WHISPR<span style={{ color: '#DC3545' }}>.</span>
                    </Link>
                    <Link to="/exchange" className="launch-btn" style={{ fontSize: '13px', padding: '10px 20px' }}>
                        Launch App
                        <ArrowRight size={14} strokeWidth={2} />
                    </Link>
                </header>

                {/* Hero */}
                <div className="animate-fade-in" style={{
                    textAlign: 'center',
                    marginBottom: '80px',
                    paddingTop: '40px',
                    opacity: 0,
                    animationDelay: '0.1s',
                }}>
                    <p style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--grey-500)',
                        marginBottom: '16px',
                    }}>
                        Why WHISPR
                    </p>
                    <h1 style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 'clamp(32px, 5vw, 56px)',
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1,
                        color: 'var(--grey-50)',
                        marginBottom: '20px',
                    }}>
                        Privacy-first trading,<br />built from the ground up.
                    </h1>
                    <p style={{
                        fontSize: '16px',
                        color: 'var(--grey-400)',
                        lineHeight: 1.6,
                        maxWidth: '560px',
                        margin: '0 auto',
                    }}>
                        WHISPR is a non-custodial, cross-chain exchange designed for traders who refuse to compromise on privacy.
                    </p>
                </div>

                {/* Feature grid */}
                <div className="animate-fade-in" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    opacity: 0,
                    animationDelay: '0.3s',
                }}>
                    {features.map((f, i) => (
                        <div key={i} style={{
                            background: 'rgba(52, 58, 64, 0.5)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(206, 212, 218, 0.08)',
                            borderRadius: '14px',
                            padding: '32px 28px',
                            transition: 'all 0.3s ease',
                            cursor: 'default',
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(52, 58, 64, 0.7)'
                                e.currentTarget.style.borderColor = 'rgba(206, 212, 218, 0.15)'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(52, 58, 64, 0.5)'
                                e.currentTarget.style.borderColor = 'rgba(206, 212, 218, 0.08)'
                                e.currentTarget.style.transform = 'translateY(0)'
                            }}
                        >
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: 'rgba(206, 212, 218, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                            }}>
                                <f.icon size={20} strokeWidth={1.5} style={{ color: 'var(--grey-300)' }} />
                            </div>
                            <h3 style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '16px',
                                fontWeight: 700,
                                color: 'var(--grey-50)',
                                marginBottom: '10px',
                                letterSpacing: '-0.01em',
                            }}>
                                {f.title}
                            </h3>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--grey-400)',
                                lineHeight: 1.6,
                            }}>
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA section */}
                <div className="animate-fade-in" style={{
                    textAlign: 'center',
                    marginTop: '80px',
                    opacity: 0,
                    animationDelay: '0.5s',
                }}>
                    <h2 style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '28px',
                        fontWeight: 700,
                        color: 'var(--grey-50)',
                        marginBottom: '12px',
                        letterSpacing: '-0.02em',
                    }}>
                        Ready to trade privately?
                    </h2>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--grey-400)',
                        marginBottom: '28px',
                    }}>
                        No sign-up required. Generate a passphrase and start in seconds.
                    </p>
                    <Link to="/exchange" className="launch-btn">
                        Launch App
                        <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                </div>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '80px',
                    paddingTop: '32px',
                    borderTop: '1px solid rgba(206, 212, 218, 0.06)',
                }}>
                    <Link to="/" style={{
                        fontSize: '12px',
                        color: 'var(--grey-500)',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
