export default function SlideGenerationProgress({ step, currentSlide, totalSlides }) {
  const steps = [
    { key: 'content', label: 'Generating content', icon: '📝' },
    { key: 'images', label: 'Refining & generating images', icon: '🎨' },
    { key: 'assembling', label: 'Assembling presentation', icon: '📊' },
  ];

  const currentIdx = steps.findIndex(s => s.key === step);

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-light)', padding: '24px',
      animation: 'fadeInUp 0.4s ease-out',
    }}>
      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2, background: 'var(--bg-secondary)',
        marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          width: step === 'done' ? '100%' : `${((currentIdx + 1) / steps.length) * 100}%`,
          transition: 'width 1s ease-out',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {steps.map((s, i) => {
          const isActive = i === currentIdx;
          const isDone = i < currentIdx || step === 'done';

          return (
            <div key={s.key} style={{
              flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: isActive ? 'rgba(108,99,255,0.08)' : isDone ? 'rgba(34,197,94,0.06)' : 'var(--bg-secondary)',
              border: `1px solid ${isActive ? 'rgba(108,99,255,0.2)' : isDone ? 'rgba(34,197,94,0.15)' : 'transparent'}`,
              transition: 'all 0.3s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem' }}>
                  {isDone ? '✅' : isActive ? s.icon : '⏳'}
                </span>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700,
                  color: isActive ? 'var(--primary)' : isDone ? '#22c55e' : 'var(--text-muted)',
                }}>{s.label}</span>
              </div>
              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="typing-dots" style={{ marginTop: 2 }}>
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slide counter */}
      {totalSlides > 0 && (
        <div style={{
          textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          🎴 {currentSlide || totalSlides} / {totalSlides} slides generated
        </div>
      )}

      {/* Pulsing animation */}
      {step !== 'done' && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: '0.78rem', color: 'var(--text-muted)',
        }}>
          This may take 30-60 seconds depending on the number of slides...
        </div>
      )}
    </div>
  );
}
