import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const STEPS = [
  { num: 1, title: 'Enter Your Topic', desc: 'Start by typing the topic of your presentation. You can write in English or Urdu.', points: ['Type any topic - business, education, research', 'Support for English and Urdu languages', 'Smart topic suggestions based on input'], color: '#6366f1' },
  { num: 2, title: 'AI Analyzes & Generates', desc: 'Our AI creates a structured presentation automatically.', points: ['AI understands context', 'Generates professional slide structure', 'Selects appropriate visuals and icons'], color: '#f43f5e' },
  { num: 3, title: 'Review & Customize', desc: 'Preview your slides and customize colors and layouts.', points: ['Live preview of all slides', 'Drag-and-drop to reorder slides', 'Edit text, images and layout'], color: '#8b5cf6' },
  { num: 4, title: 'Export & Present', desc: 'Download in multiple formats and start presenting.', points: ['Export to PowerPoint (PPTX)', 'Download as PDF for printing', 'Present directly from browser'], color: '#22c55e' },
];

const COMPARISONS = [
  { task: 'Research & Planning', trad: 60, ai: 5 },
  { task: 'Content Writing', trad: 90, ai: 10 },
  { task: 'Design & Layout', trad: 45, ai: 5 },
  { task: 'Finding Images', trad: 30, ai: 2 },
  { task: 'Final Review', trad: 15, ai: 8 },
];

const FAQS = [
  { q: 'How long does it take to generate a presentation?', a: 'SlideEdge AI generates complete presentations in just 10-15 seconds.' },
  { q: 'Can I edit the generated slides?', a: 'All generated slides are fully editable. Modify text, layout, images, and more.' },
  { q: 'Is there a limit on the number of slides?', a: 'Free accounts support up to 20 slides. Premium accounts have unlimited generation.' },
  { q: 'Do you support languages other than English and Urdu?', a: 'Currently English and Urdu with RTL support. More languages coming soon.' },
  { q: 'What export formats are supported?', a: 'Export to PowerPoint (PPTX), PDF, and present directly from browser.' },
  { q: 'How does the AI understand my topic?', a: 'Our AI uses advanced NLP to analyze context, identify key concepts, and generate relevant content.' },
  { q: 'Is my data secure?', a: 'All data is encrypted in transit and at rest. We never share your content with third parties.' },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ paddingTop: 100, paddingBottom: 0, background: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 'var(--radius-full)',
            background: 'var(--surface)', border: '1px solid var(--border-light)',
            fontSize: '0.85rem', fontWeight: 600, marginBottom: 16,
          }}>📖 Step-by-Step Guide</div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>
            How <span className="gradient-text">SlideEdge</span> Works
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
            Transform your ideas into stunning presentations in 4 simple steps.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid-4" style={{ gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Save 90% Time', stat: '10min vs 2hrs' },
            { label: 'AI-Powered', stat: '98% accuracy' },
            { label: '10,000+ Users', stat: '4.9/5 rating' },
            { label: 'Professional Quality', stat: '99% satisfaction' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: 28, animation: `fadeInUp 0.5s ease-out ${i * 0.1}s backwards` }}>
              <h3 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{s.stat}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Step-by-Step Interactive */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
          display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 500,
          marginBottom: 60,
        }} className="steps-grid">
          {/* Visual Side */}
          <div style={{
            background: STEPS[activeStep].color, padding: 48,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', color: 'white', transition: 'background 0.5s',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', marginBottom: 16,
            }}>
              {['🪄', '✨', '🎯', '📥'][activeStep]}
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, opacity: 0.8 }}>Step {activeStep + 1}</p>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: 8, color: 'white' }}>{STEPS[activeStep].title}</h3>
          </div>

          {/* Content Side */}
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'var(--border-light)', transform: 'translateY(-50%)' }}>
                <div style={{ width: `${(activeStep / 3) * 100}%`, height: '100%', background: '#22c55e', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              {STEPS.map((step, i) => (
                <button key={i} onClick={() => setActiveStep(i)} style={{
                  width: 40, height: 40, borderRadius: '50%', fontWeight: 700,
                  background: i <= activeStep ? (i < activeStep ? '#22c55e' : `linear-gradient(135deg, var(--primary), var(--secondary))`) : 'var(--surface)',
                  color: i <= activeStep ? 'white' : 'var(--text-muted)',
                  border: '3px solid white', boxShadow: 'var(--shadow-md)',
                  position: 'relative', zIndex: 2, transition: 'all 0.3s',
                  transform: i === activeStep ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {i < activeStep ? '✓' : step.num}
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12 }}>{STEPS[activeStep].title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 20 }}>{STEPS[activeStep].desc}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {STEPS[activeStep].points.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  <FiCheck style={{ color: '#22c55e', flexShrink: 0 }} /> {p}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {activeStep > 0 && (
                <button onClick={() => setActiveStep(activeStep - 1)} className="btn btn-ghost" style={{ border: '1px solid var(--border-light)' }}>
                  Previous
                </button>
              )}
              <button onClick={() => activeStep < 3 ? setActiveStep(activeStep + 1) : null}
                className="btn btn-gradient" style={{ flex: activeStep === 0 ? 1 : 'unset' }}>
                {activeStep === 3 ? <Link to="/chatbot" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>Start Creating 🚀</Link> : <>Next Step <FiArrowRight /></>}
              </button>
            </div>
          </div>
        </div>

        {/* Time Comparison */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 'var(--radius-full)',
            background: '#fef9c3', color: '#854d0e', fontSize: '0.85rem', fontWeight: 600, marginBottom: 16,
          }}>📈 Time Comparison</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: '#16a34a' }}>Traditional vs SlideEdge AI</h2>
          <p style={{ color: 'var(--text-secondary)' }}>See how much time you can save</p>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {COMPARISONS.map((c, i) => (
            <div key={i} className="card-flat" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontWeight: 700 }}>{c.task}</h4>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Traditional: {c.trad}min</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>SlideEdge: {c.ai}min</span>
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${(c.trad / 100) * 100}%`, height: '100%', background: 'var(--text-muted)', opacity: 0.4, borderRadius: 'var(--radius-full)' }} />
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${(c.ai / 100) * 100}%`, height: '100%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save 90% */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '2px solid #86efac', borderRadius: 'var(--radius-xl)', padding: '24px 48px',
          }}>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#16a34a', marginBottom: 4 }}>Save 90% Time</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Create presentations in <strong style={{ color: '#16a34a' }}>minutes</strong> instead of <s>hours</s></p>
          </div>
        </div>

        {/* FAQs */}
        <div style={{ maxWidth: 750, margin: '0 auto 60px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 32, color: 'var(--primary)' }}>FAQs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="card-flat" style={{
                cursor: 'pointer', borderWidth: 2,
                borderColor: openFaq === i ? 'var(--primary)' : 'var(--border-light)',
                transition: 'all 0.3s',
              }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '1rem', color: openFaq === i ? 'var(--primary)' : 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--primary)', marginRight: 8 }}>Q.</span>{faq.q}
                  </h4>
                  {openFaq === i ? <FiChevronUp /> : <FiChevronDown />}
                </div>
                {openFaq === i && (
                  <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, animation: 'fadeIn 0.3s ease-out' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: 'var(--radius-xl)', padding: '64px 48px',
          textAlign: 'center', color: 'white', marginBottom: 60,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12, color: 'white', position: 'relative', zIndex: 2 }}>
            Ready to Create Your First Presentation?
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: 32, position: 'relative', zIndex: 2 }}>
            Join 10,000+ users. <span style={{ color: '#fde047' }}>Start free, no credit card required.</span>
          </p>
          <Link to="/signup" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)', fontWeight: 800, borderRadius: 'var(--radius-full)', position: 'relative', zIndex: 2 }}>
            Get Started Free <FiArrowRight />
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
