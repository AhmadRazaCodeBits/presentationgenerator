import { FiCheck, FiLayout } from 'react-icons/fi';

export default function TemplateSuggestionCard({ template, isSelected, onSelect }) {
  if (!template) return null;

  const cs = template.color_scheme || {};

  return (
    <div
      onClick={() => onSelect(template)}
      style={{
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        border: isSelected ? `2px solid ${cs.primary || 'var(--primary)'}` : '1px solid var(--border-light)',
        background: 'var(--surface)', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? `0 8px 25px ${cs.primary}33` : 'var(--shadow-sm)',
        animation: 'fadeInUp 0.4s ease-out backwards',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = `0 6px 20px ${cs.primary}22`;
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }
      }}
    >
      {/* Header with Freepik Image or Fallback Gradient */}
      <div style={{
        height: 120, position: 'relative', overflow: 'hidden',
        background: (template.preview_image || template.master_background_image)
          ? `url(${template.preview_image || template.master_background_image}) center/cover no-repeat`
          : `linear-gradient(135deg, ${cs.primary || '#6C63FF'}, ${cs.secondary || '#FF6B6B'})`,
      }}>
        {/* Dark overlay for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))',
        }} />

        {/* Decorative shapes only if fallback gradient */}
        {!(template.preview_image || template.master_background_image) && (
          <>
            <div style={{
              position: 'absolute', right: -20, top: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: `${cs.accent || '#fff'}30`,
            }} />
            <div style={{
              position: 'absolute', left: -10, bottom: -10,
              width: 50, height: 50, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }} />
          </>
        )}

        {/* Layout pattern preview */}
        <div style={{
          position: 'absolute', inset: 12,
          display: 'flex', gap: 4, alignItems: 'stretch',
        }}>
          {/* Mini slide preview */}
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.15)',
            borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{ width: '60%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ width: '80%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ width: '45%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
          </div>
          <div style={{
            width: '35%', background: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
          }} />
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: '50%',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <FiCheck size={14} style={{ color: cs.primary || 'var(--primary)' }} />
          </div>
        )}

        <span style={{
          position: 'absolute', left: 8, top: 8,
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: 0.4,
          color: 'white', background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 999, padding: '3px 8px',
        }}>
          REAL PPTX
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 4 }}>
          {template.template_name}
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
          {template.description}
        </p>

        {/* Color dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          {[cs.primary, cs.secondary, cs.accent, cs.background, cs.text].map((c, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: '50%',
              background: c || '#999', border: '2px solid var(--bg-secondary)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }} title={c} />
          ))}
        </div>

        {/* Best for tag */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.72rem', color: 'var(--text-muted)',
        }}>
          <FiLayout size={11} />
          <span>{template.best_for}</span>
        </div>

        {/* Font info */}
        <div style={{
          marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.7,
        }}>
          {template.font_style?.heading} / {template.font_style?.body}
        </div>
      </div>
    </div>
  );
}
