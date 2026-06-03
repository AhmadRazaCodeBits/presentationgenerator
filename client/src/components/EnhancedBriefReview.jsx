import { FiUsers, FiTarget, FiLayers, FiBarChart2, FiCheck, FiEdit3 } from 'react-icons/fi';

export default function EnhancedBriefReview({ brief, onProceed, onEdit }) {
  if (!brief) return null;

  const prettifyTopic = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 'Untitled topic';

    return raw
      .replace(/^create\s+(a\s+)?presentation\s+(about|on)\s+/i, '')
      .replace(/^generate\s+(slides?|a\s+presentation)\s+(for|about|on)\s+/i, '')
      .replace(/^make\s+(a\s+)?(pitch\s+deck|presentation)\s+(for|about|on)\s+/i, '')
      .trim() || raw;
  };

  const topic = prettifyTopic(brief.source_topic || brief.enhanced_topic);
  const subtopic = brief.subtopic || brief.enhanced_topic || '';

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-light)', overflow: 'hidden',
      animation: 'fadeInUp 0.5s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px', background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(255,107,107,0.06))',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>
          📋 Presentation Brief
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Your topic is ready as a structured presentation plan
        </p>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Topic + Subtopic */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 8, columnGap: 10,
            alignItems: 'start',
          }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Topic
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {topic}
            </p>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Subtopic
            </p>
            <p style={{
              fontSize: '1.05rem', fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {subtopic}
            </p>
          </div>
          {!!brief.key_message && (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 8 }}>
              {brief.key_message}
            </p>
          )}
        </div>

        {/* Meta badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <Badge icon={<FiUsers size={12} />} label={brief.target_audience} />
          <Badge icon={<FiTarget size={12} />} label={brief.tone} accent />
          <Badge icon={<FiLayers size={12} />} label={`${brief.suggested_slide_count} slides`} />
          <Badge icon={<FiBarChart2 size={12} />} label={brief.color_mood} />
        </div>

        {/* Sections */}
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
          }}>Sections</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.sections?.map((section, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid transparent', transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{section.section_title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{section.purpose}</p>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)',
                  background: 'rgba(108,99,255,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>{section.suggested_slides} slide{section.suggested_slides !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Points */}
        {brief.data_points_to_include?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>Key Data Points</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {brief.data_points_to_include.map((dp, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}>📊 {dp}</span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onProceed} className="btn btn-primary" style={{
            flex: 1, padding: '12px 20px', borderRadius: 'var(--radius-md)',
            fontWeight: 700, fontSize: '0.9rem',
          }}>
            <FiCheck size={16} /> Choose Template →
          </button>
          {onEdit && (
            <button onClick={onEdit} className="btn btn-ghost" style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)', fontSize: '0.85rem',
            }}>
              <FiEdit3 size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, label, accent }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem', fontWeight: 600,
      background: accent ? 'rgba(108,99,255,0.1)' : 'var(--bg-secondary)',
      color: accent ? 'var(--primary)' : 'var(--text-secondary)',
      border: `1px solid ${accent ? 'rgba(108,99,255,0.2)' : 'var(--border-light)'}`,
    }}>
      {icon} {label}
    </span>
  );
}
