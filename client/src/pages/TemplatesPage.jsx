import { useState } from 'react';
import { Link } from 'react-router-dom';

const TEMPLATE_DATA = [
  { id: 'modern-gradient', name: 'Modern Gradient', category: 'Business', colors: ['#6C63FF', '#FF6B6B'], desc: 'Clean gradient design for corporate presentations.' },
  { id: 'dark-professional', name: 'Dark Professional', category: 'Business', colors: ['#1a1a2e', '#e94560'], desc: 'Sleek dark theme for tech and business pitches.' },
  { id: 'ocean-breeze', name: 'Ocean Breeze', category: 'Education', colors: ['#0077b6', '#00b4d8'], desc: 'Fresh blue tones ideal for academic presentations.' },
  { id: 'sunset-warm', name: 'Sunset Warm', category: 'Startup', colors: ['#ff6b35', '#ff9f1c'], desc: 'Warm energetic design for pitch decks.' },
  { id: 'emerald-nature', name: 'Emerald Nature', category: 'Education', colors: ['#2d6a4f', '#52b788'], desc: 'Natural green palette for eco and health topics.' },
  { id: 'minimal-clean', name: 'Minimal Clean', category: 'Business', colors: ['#e2e8f0', '#0d6efd'], desc: 'Ultra-clean minimal design for any topic.' },
];

const CATEGORIES = ['All', 'Business', 'Education', 'Startup'];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? TEMPLATE_DATA
    : TEMPLATE_DATA.filter(t => t.category === activeCategory);

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80 }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeInUp 0.6s ease-out' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12 }}>
            Presentation <span className="gradient-text">Templates</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
            Choose from professionally designed templates to match your presentation style.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 'var(--radius-full)', padding: '10px 24px',
                border: activeCategory !== cat ? '1px solid var(--border-light)' : 'none',
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid-3" style={{ gap: 28 }}>
          {filtered.map((template, i) => (
            <div key={template.id} className="template-card"
              style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.1}s backwards` }}>
              <div className="template-preview" style={{
                background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
              }}>
                {/* Mini slide mockup */}
                <div style={{
                  width: '80%', aspectRatio: '16/9',
                  background: 'rgba(255,255,255,0.15)', borderRadius: 8,
                  backdropFilter: 'blur(10px)', padding: 16,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ width: '60%', height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '80%', height: 5, background: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 4 }} />
                  <div style={{ width: '70%', height: 5, background: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 4 }} />
                  <div style={{ width: '50%', height: 5, background: 'rgba(255,255,255,0.3)', borderRadius: 3 }} />
                </div>

                {/* Hover overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.5)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                  opacity: 0, transition: 'opacity 0.3s',
                }}
                className="template-overlay">
                  <Link to="/chatbot" className="btn btn-sm" style={{ background: 'white', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Use Template
                  </Link>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  {template.category}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{template.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{template.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .template-card:hover .template-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
