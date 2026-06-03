import { Link } from 'react-router-dom';
import { FiCpu, FiLayout, FiImage, FiGlobe, FiDownload, FiCloud, FiUsers, FiFlag, FiCheck } from 'react-icons/fi';

const FEATURES = [
  {
    icon: <FiCpu />, title: 'AI Content Generation', color: '#3b82f6', bg: '#eff6ff',
    desc: 'Analyzes your topic and generates structured slide content automatically with clear sections.',
    checks: ['Structured outlines', 'Clear bullet points'],
  },
  {
    icon: <FiLayout />, title: 'Smart Slide Layouts', color: '#8b5cf6', bg: '#f5f3ff',
    desc: 'Automatically arranges text, images, and titles in balanced layouts that improve readability.',
    checks: ['Clean layouts', 'Professional typography'],
  },
  {
    icon: <FiImage />, title: 'Automatic Images', color: '#f97316', bg: '#fff7ed',
    desc: 'Suggests relevant images and icons for each slide to make presentations visually engaging.',
    checks: ['Context-based visuals', 'High quality images'],
  },
  {
    icon: <FiLayout />, title: 'Template Retheming', color: '#22c55e', bg: '#f0fdf4',
    desc: 'Change the visual template after content is generated so the story stays intact while the look evolves.',
    checks: ['Same content, new theme', 'One-click template switching'],
  },
  {
    icon: <FiGlobe />, title: 'Bilingual Support', color: '#22c55e', bg: '#f0fdf4',
    desc: 'Generate presentations in both English and Urdu, making it accessible for a wider audience.',
    checks: ['Urdu slide generation', 'RTL text support'],
  },
];

const MORE_FEATURES = [
  { icon: <FiDownload />, title: 'Multiple Export Formats', desc: 'Export to PDF, PPTX, and more' },
  { icon: <FiCloud />, title: 'Cloud Storage', desc: 'Access your presentations anywhere' },
  { icon: <FiUsers />, title: 'Real-time Collaboration', desc: 'Work together with your team' },
  { icon: <FiFlag />, title: 'Custom Branding', desc: 'Add your logo and brand colors' },
];

export default function FeaturesPage() {
  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, background: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60, animation: 'fadeInUp 0.6s ease-out' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12 }}>
            Powerful Features of <span className="gradient-text">SlideEdge AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 650, margin: '0 auto' }}>
            SlideEdge combines Artificial Intelligence with modern presentation design to create a powerful platform.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid-2" style={{ gap: 32, marginBottom: 60 }}>
          {FEATURES.map((feat, i) => (
            <div key={i} className="card-flat" style={{
              display: 'flex', gap: 20, animation: `fadeInUp 0.5s ease-out ${i * 0.1}s backwards`,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                background: feat.bg, color: feat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>{feat.icon}</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>{feat.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>{feat.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {feat.checks.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <FiCheck style={{ color: '#22c55e', flexShrink: 0 }} /> {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* More Features Banner */}
        <div className="more-features-banner" style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(255,107,107,0.06))',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, background: 'rgba(108,99,255,0.06)', borderRadius: '50%', filter: 'blur(60px)' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>And Much More...</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            Packed with features to make your presentation process smooth and efficient.
          </p>
          <div className="grid-2" style={{ maxWidth: 700, margin: '0 auto', gap: 20, textAlign: 'left' }}>
            {MORE_FEATURES.map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ color: '#22c55e', marginTop: 2 }}><FiCheck size={18} /></div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 2 }}>{feat.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>Ready to experience these features?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Start creating professional presentations with AI today.</p>
          <Link to="/chatbot" className="btn btn-gradient btn-lg">Try SlideEdge AI Now</Link>
        </div>
      </div>
    </div>
  );
}
