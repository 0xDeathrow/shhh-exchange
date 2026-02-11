import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ParticleScene from '../components/ParticleScene'

export default function LandingPage() {
    return (
        <>
            {/* Particle scene background — single sphere offset right */}
            <ParticleScene
                spheres={[{ x: 4.0, y: 0, scale: 1.0 }]}
                opacity={1.0}
                showTrackers={true}
                interactive={true}
            />

            {/* UI overlay */}
            <main style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>

                {/* Header branding */}
                <header
                    className="animate-fade-in"
                    style={{
                        position: 'absolute',
                        top: '24px',
                        left: '24px',
                        opacity: 0,
                        animationDelay: '0.1s',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '16px',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            color: 'var(--grey-50)',
                        }}>
                            WHISPR<span style={{ color: '#DC3545' }}>.</span>
                        </span>
                    </div>
                </header>

                {/* Hero section */}
                <div
                    className="animate-fade-in"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: '24px',
                        maxWidth: '520px',
                        opacity: 0,
                        animationDelay: '0.2s',
                        zIndex: 30,
                    }}
                >
                    <h1
                        className="hero-title"
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 'clamp(48px, 8vw, 96px)',
                            fontWeight: 700,
                            letterSpacing: '-0.04em',
                            lineHeight: 0.9,
                            color: 'var(--grey-50)',
                            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            marginBottom: '24px',
                        }}
                    >
                        Trade<span style={{ color: '#DC3545' }}>.</span>
                        <br />
                        Private<span style={{ color: '#DC3545' }}>.</span>
                        <br />
                        Any Chain<span style={{ color: '#DC3545' }}>.</span>
                    </h1>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link to="/exchange" className="launch-btn" style={{ animationDelay: '0.4s' }}>
                            Launch App
                            <ArrowRight size={16} strokeWidth={2} />
                        </Link>
                        <Link to="/learn" className="learn-btn" style={{ animationDelay: '0.5s' }}>
                            Learn More
                        </Link>
                    </div>
                </div>
            </main>
        </>
    )
}
