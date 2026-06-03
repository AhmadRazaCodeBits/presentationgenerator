import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { presentationService } from '../services/presentationService';
import TemplateStudio from '../components/TemplateStudio';

const CATEGORIES = ['All', 'Business', 'Education', 'Startup', 'Corporate', 'General'];

const getCategory = (template) => {
  const text = `${template.best_for || ''} ${template.name || ''}`.toLowerCase();
  if (text.includes('education') || text.includes('research') || text.includes('training')) return 'Education';
  if (text.includes('startup') || text.includes('pitch') || text.includes('campaign')) return 'Startup';
  if (text.includes('corporate') || text.includes('board') || text.includes('strategy')) return 'Corporate';
  if (text.includes('business') || text.includes('executive') || text.includes('consulting')) return 'Business';
  return 'General';
};

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await presentationService.getTemplates();
        const data = (res.templates || []).map(t => ({
          ...t,
          id: t.id,
          template_name: t.name,
          description: t.description || 'Professional PPTX template ready for export.',
          best_for: t.best_for || 'General presentations',
          category: getCategory(t),
          color_scheme: {
            primary: t.colors?.primary || '#6C63FF',
            secondary: t.colors?.secondary || '#FF6B6B',
            background: t.colors?.bg || '#FFFFFF',
            text: t.colors?.heading || '#1E1E2E',
          },
        }));
        setTemplates(data);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory);

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

        <TemplateStudio
          templates={filtered}
          activeTemplateId={filtered[0]?.id || ''}
          onSelect={() => {}}
          title="Browse Templates"
          description="Explore the built-in themes. Use any of them as a base and retheme after generation."
        />

        {/* Template Grid */}
        <div className="grid-3" style={{ gap: 28 }}>
          {loading && [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="template-card" style={{ minHeight: 250 }}>
              <div className="skeleton" style={{ height: 150 }} />
              <div style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '95%' }} />
              </div>
            </div>
          ))}

          {filtered.map((template, i) => (
            <div key={template.id} className="template-card"
              style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.1}s backwards` }}>
              <div className="template-preview" style={{
                background: template.preview_image
                  ? `url(${template.preview_image}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 10, left: 10,
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: 0.4,
                  color: 'white', background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999,
                  padding: '3px 8px', zIndex: 2,
                }}>
                  REAL PPTX
                </div>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Best for: {template.best_for}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .template-card:hover .template-overlay { opacity: 1 !important; }
        @media (max-width: 1024px) {
          .template-overlay {
            opacity: 1 !important;
            background: rgba(0,0,0,0.05) !important;
            position: relative !important;
            inset: auto !important;
            height: 48px;
            margin-top: 12px;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .template-overlay .btn {
            width: 100%;
            background: var(--primary) !important;
            color: white !important;
            border-radius: var(--radius-sm);
            padding: 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
