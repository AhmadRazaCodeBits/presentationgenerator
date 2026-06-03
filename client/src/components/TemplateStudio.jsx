import { FiCheck, FiLayers, FiRefreshCw } from 'react-icons/fi';

function resolveTemplateId(template) {
  return template?.template_id || template?.export_template_id || template?.id || '';
}

function resolveTemplateColors(template) {
  const scheme = template?.color_scheme || {};
  const palette = Array.isArray(template?.colors)
    ? template.colors
    : (template?.colors && typeof template.colors === 'object'
      ? [template.colors.primary, template.colors.secondary]
      : []);

  return [
    scheme.primary || palette[0] || '#6C63FF',
    scheme.secondary || palette[1] || '#FF6B6B',
  ];
}

export default function TemplateStudio({
  templates = [],
  activeTemplateId,
  onSelect,
  onCustomize,
  title = 'Template Studio',
  description = 'Retheme the same content without changing your message.',
  compact = false,
}) {
  const activeId = String(activeTemplateId || '');

  if (!templates.length) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            <FiRefreshCw style={{ marginRight: 6 }} /> {title}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{description}</p>
        </div>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)',
          background: 'rgba(108,99,255,0.08)', padding: '4px 10px', borderRadius: '999px',
          whiteSpace: 'nowrap',
        }}>
          Same content, new theme
        </span>
      </div>

      <div className="template-studio-grid-inner" style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : undefined,
        gap: 10,
      }}>
        {templates.map((template) => {
          const templateId = resolveTemplateId(template);
          const colors = resolveTemplateColors(template);
          const selected = activeId === String(templateId);

          return (
            <button
              key={templateId}
              onClick={() => onSelect?.(template)}
              style={{
                border: selected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                padding: 0,
                overflow: 'hidden',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: selected ? '0 10px 30px rgba(108,99,255,0.12)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
              title={template.template_name || template.name}
            >
              <div style={{
                height: 92,
                background: template.preview_image
                  ? `linear-gradient(rgba(0,0,0,0.14), rgba(0,0,0,0.4)), url(${template.preview_image}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: selected ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' : 'transparent',
                }} />
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: 0.4, color: 'white',
                    background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 999, padding: '3px 8px',
                  }}>
                    <FiLayers size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} /> TEMPLATE
                  </span>
                  {selected && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, color: '#0f172a',
                      background: '#fff', borderRadius: 999, padding: '3px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <FiCheck size={10} /> Active
                    </span>
                  )}
                </div>
                <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 5 }}>
                  {colors.map((color) => (
                    <span key={color} style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.35)' }} />
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px 13px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  {template.best_for || 'General use'}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {template.template_name || template.name}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {template.description || 'Professional template'}
                </p>
                {selected && onCustomize && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => onCustomize({
                      template_id: templateId,
                      template_name: template.template_name || template.name || 'Custom',
                      color_scheme: {
                        primary: colors[0],
                        secondary: colors[1],
                        background: template.colors?.bg || '#FFFFFF',
                        text: template.colors?.heading || '#111827',
                        accent: colors[0],
                      },
                      font_style: { heading: 'Arial', body: 'Segoe UI' },
                    })} className="btn btn-sm btn-ghost">Use as Custom</button>

                    <details style={{ fontSize: '0.82rem' }}>
                      <summary style={{ cursor: 'pointer' }}>Customize</summary>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" defaultValue={colors[0]} onChange={() => {}} />
                        <input type="color" defaultValue={colors[1]} onChange={() => {}} />
                        <select style={{ padding: '6px' }} defaultValue="Arial">
                          <option>Arial</option>
                          <option>Calibri</option>
                          <option>Segoe UI</option>
                          <option>Roboto</option>
                        </select>
                        <button className="btn btn-sm btn-primary" onClick={() => onCustomize({
                          template_id: templateId,
                          template_name: template.template_name || template.name || 'Custom',
                          color_scheme: {
                            primary: colors[0],
                            secondary: colors[1],
                            background: template.colors?.bg || '#FFFFFF',
                            text: template.colors?.heading || '#111827',
                            accent: colors[0],
                          },
                          font_style: { heading: 'Arial', body: 'Segoe UI' },
                        })}>Apply</button>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}