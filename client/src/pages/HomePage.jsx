import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiStar, FiZap, FiGlobe, FiLayout, FiImage, FiDownload } from 'react-icons/fi';

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('active'); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, style, className = '' }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`} style={style}>{children}</div>;
}

export default function HomePage() {
  return (
    <div style={{ paddingTop: 80 }}>
      {/* ============ HERO ============ */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '60px 0 100px' }}>
        {/* Animated blobs */}
        <div style={{ position: 'absolute', top: -40, left: -40, width: 300, height: 300, borderRadius: '50%', background: 'rgba(108,99,255,0.15)', filter: 'blur(80px)', animation: 'blob 7s infinite' }} />
        <div style={{ position: 'absolute', top: -20, right: -40, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,107,107,0.12)', filter: 'blur(80px)', animation: 'blob 7s infinite 2s' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(168,85,247,0.1)', filter: 'blur(80px)', animation: 'blob 7s infinite 4s' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          {/* Left Content */}
          <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 'var(--radius-full)',
              background: 'var(--surface)', border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)', fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--text-primary)', marginBottom: 24,
            }}>
              🌍 Multilingual AI Powered | English + اردو
            </div>

            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
              <span className="gradient-text">Create Stunning Presentations</span>
              <br />
              <span style={{ color: 'var(--text-primary)' }}>with </span>
              <span className="gradient-text">AI in Seconds</span>
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
              SlideEdge is an intelligent AI presentation generator that turns your ideas into professional slides instantly. Simply type your topic in English or Urdu.
            </p>

            {/* CTA Input */}
            <div style={{
              background: 'var(--surface)', padding: 8, borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)', display: 'flex', gap: 8, maxWidth: 520,
              border: '1px solid var(--border-light)',
            }}>
              <input type="text" placeholder="Type your topic... (e.g., Marketing Strategy)"
                className="input" style={{ border: 'none', boxShadow: 'none', flex: 1, padding: '14px 16px' }}
              />
              <Link to="/chatbot" className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}>
                <FiStar /> Generate
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
              {['No design skills', 'English & Urdu', 'Free to start'].map(text => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <FiCheck style={{ color: '#22c55e' }} /> {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual */}
          <div style={{ position: 'relative', animation: 'fadeInUp 0.8s ease-out 0.2s backwards' }} className="hero-visual">
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: 'var(--radius-xl)', padding: 32,
              boxShadow: 'var(--shadow-xl)', animation: 'float 6s ease-in-out infinite',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>SlideEdge AI</span>
                </div>
                {['Introduction to AI', 'Key Concepts', 'Applications', 'Future Trends'].map((title, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px', marginBottom: 8, color: 'white', fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                    }}>{i + 1}</span>
                    {title}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating card */}
            <div style={{
              position: 'absolute', bottom: -20, left: -30,
              background: 'var(--surface)', padding: '14px 20px', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)', zIndex: 10, animation: 'float 6s ease-in-out infinite 1s',
              display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-light)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <FiZap />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>+124% faster</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .hero-visual { display: none !important; }
            .container { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ============ TRUSTED ============ */}
      <RevealSection>
        <section style={{ padding: '64px 0', background: 'var(--surface)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Trusted by Students, Professionals & Educators</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>Thousands rely on SlideEdge to create professional presentations quickly.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 40, opacity: 0.5 }}>
              {[
                { icon: '🏛️', name: 'University' },
                { icon: '🏢', name: 'CorpTech' },
                { icon: '🎓', name: 'EduSmart' },
                { icon: '🚀', name: 'StartupHub' },
              ].map(org => (
                <div key={org.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{org.icon}</span> {org.name}
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ============ AI GENERATOR ============ */}
      <RevealSection>
        <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
          <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: 'var(--radius-xl)', padding: 40,
              boxShadow: 'var(--shadow-xl)', aspectRatio: '4/3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🧠</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>AI Brain</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>Analyzing your topic...</p>
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16 }}>Generate Presentations with AI</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 32 }}>
                SlideEdge AI analyzes your topic and automatically creates structured presentations with titles, bullet points, and visuals.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { icon: <FiLayout />, title: 'Structured Content', desc: 'Logical flow with intro, body, and conclusion.', color: 'var(--primary)' },
                  { icon: <FiImage />, title: 'Smart Visuals', desc: 'AI suggests relevant images automatically.', color: 'var(--secondary)' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${item.color}15`, color: item.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem',
                    }}>{item.icon}</div>
                    <div>
                      <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <style>{`@media(max-width:1024px){section .container{grid-template-columns:1fr!important;}}`}</style>
        </section>
      </RevealSection>

      {/* ============ BILINGUAL ============ */}
      <RevealSection>
        <section style={{ padding: '80px 0', background: 'var(--surface)' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: 800 }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Global Support</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '8px 0 40px' }}>Create Presentations in English & Urdu</h2>
            <div className="grid-2" style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{
                padding: 32, borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white', textAlign: 'center',
                border: '2px solid transparent',
                transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🇬🇧</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'white' }}>English</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>"Create a presentation about Climate Change."</p>
              </div>
              <div style={{
                padding: 32, borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, #065f46, #047857)',
                color: 'white', textAlign: 'center',
                border: '2px solid transparent',
                transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🇵🇰</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'white' }}>Urdu</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, direction: 'rtl' }}>"ماحولیاتی تبدیلی پر پریزنٹیشن بنائیں۔"</p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ============ 3 STEPS ============ */}
      <RevealSection>
        <section style={{ padding: '80px 0', background: 'linear-gradient(to bottom, var(--bg-secondary), var(--surface))' }}>
          <div className="container">
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Create in 3 Simple Steps</h2>
            <div className="grid-3">
              {[
                { num: 1, title: 'Enter Topic', desc: 'Type your topic in English or Urdu.', color: 'var(--primary)' },
                { num: 2, title: 'AI Generates', desc: 'Our AI creates structure, content, and visuals.', color: 'var(--secondary)' },
                { num: 3, title: 'Download', desc: 'Review, edit, and export to PowerPoint or PDF.', color: '#22c55e' },
              ].map(step => (
                <div key={step.num} className="card" style={{ textAlign: 'left' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                    background: step.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 800, marginBottom: 20,
                    boxShadow: `0 8px 20px ${step.color}40`,
                  }}>{step.num}</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ============ CTA ============ */}
      <RevealSection>
        <section style={{ padding: '80px 0' }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: 'var(--radius-xl)', padding: '64px 48px',
              textAlign: 'center', color: 'white', position: 'relative', overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(99,102,241,0.3)',
            }}>
              <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
              <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 280, height: 280, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 16, color: 'white' }}>Ready To Create Amazing Presentations?</h2>
                <p style={{ fontSize: '1.15rem', opacity: 0.9, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
                  Join thousands of users turning ideas into professional presentations instantly.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/signup" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)', fontWeight: 700, borderRadius: 'var(--radius-full)', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                    Start Free <FiArrowRight />
                  </Link>
                  <Link to="/chatbot" className="btn btn-lg" style={{ background: 'transparent', color: 'white', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-full)' }}>
                    Try Chatbot
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>
    </div>
  );
}
