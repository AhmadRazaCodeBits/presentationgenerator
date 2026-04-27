import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService } from '../services/presentationService';
import toast from 'react-hot-toast';
import {
  FiSave, FiDownload, FiArrowLeft, FiPlus, FiTrash2, FiPlay,
  FiChevronDown, FiEdit3, FiMaximize2, FiFileText, FiImage
} from 'react-icons/fi';

const TEMPLATES = [
  { id: 'modern-gradient', name: 'Modern Gradient', colors: ['#6C63FF', '#FF6B6B'] },
  { id: 'dark-professional', name: 'Dark Professional', colors: ['#1a1a2e', '#e94560'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', colors: ['#0077b6', '#00b4d8'] },
  { id: 'sunset-warm', name: 'Sunset Warm', colors: ['#ff6b35', '#ff9f1c'] },
  { id: 'emerald-nature', name: 'Emerald Nature', colors: ['#2d6a4f', '#52b788'] },
  { id: 'minimal-clean', name: 'Minimal Clean', colors: ['#e2e8f0', '#0d6efd'] },
];

const LAYOUTS = [
  { id: 'title', label: 'Title' },
  { id: 'content', label: 'Content' },
  { id: 'image-left', label: 'Image Left' },
  { id: 'image-right', label: 'Image Right' },
  { id: 'two-column', label: 'Two Column' },
  { id: 'bullets', label: 'Bullets' },
  { id: 'quote', label: 'Quote' },
];

export default function PresentationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPresenter, setShowPresenter] = useState(false);
  const [presenterSlide, setPresenterSlide] = useState(0);

  useEffect(() => {
    loadPresentation();
  }, [id]);

  const loadPresentation = async () => {
    try {
      const data = await presentationService.getPresentation(id);
      setPresentation(data.presentation);
    } catch (error) {
      toast.error('Failed to load presentation');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!presentation) return;
    setSaving(true);
    try {
      await presentationService.updatePresentation(id, {
        title: presentation.title,
        slides: presentation.slides,
        template: presentation.template,
        language: presentation.language,
      });
      toast.success('Saved!');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (field, value) => {
    setPresentation(prev => {
      const slides = [...prev.slides];
      slides[activeSlide] = { ...slides[activeSlide], [field]: value };
      return { ...prev, slides };
    });
  };

  const updateBullet = (bulletIdx, value) => {
    setPresentation(prev => {
      const slides = [...prev.slides];
      const bullets = [...slides[activeSlide].bullets];
      bullets[bulletIdx] = value;
      slides[activeSlide] = { ...slides[activeSlide], bullets };
      return { ...prev, slides };
    });
  };

  const addBullet = () => {
    setPresentation(prev => {
      const slides = [...prev.slides];
      slides[activeSlide] = { ...slides[activeSlide], bullets: [...(slides[activeSlide].bullets || []), 'New point'] };
      return { ...prev, slides };
    });
  };

  const removeBullet = (bulletIdx) => {
    setPresentation(prev => {
      const slides = [...prev.slides];
      const bullets = slides[activeSlide].bullets.filter((_, i) => i !== bulletIdx);
      slides[activeSlide] = { ...slides[activeSlide], bullets };
      return { ...prev, slides };
    });
  };

  const addSlide = () => {
    setPresentation(prev => {
      const newSlide = {
        order: prev.slides.length + 1,
        heading: 'New Slide',
        content: 'Add your content here.',
        bullets: ['Point 1', 'Point 2'],
        notes: '',
        imageUrl: '',
        imageQuery: '',
        layout: 'content',
      };
      return { ...prev, slides: [...prev.slides, newSlide] };
    });
    setActiveSlide(presentation.slides.length);
  };

  const deleteSlide = (idx) => {
    if (presentation.slides.length <= 1) return toast.error('Need at least one slide');
    setPresentation(prev => {
      const slides = prev.slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, slides };
    });
    if (activeSlide >= presentation.slides.length - 1) setActiveSlide(Math.max(0, activeSlide - 1));
  };

  const handleExportPPTX = () => {
    window.open(presentationService.getExportPPTXUrl(id), '_blank');
  };

  const handleExportPDF = () => {
    window.open(presentationService.getExportPDFUrl(id), '_blank');
  };

  // Keyboard handler for presenter mode
  useEffect(() => {
    if (!showPresenter) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPresenterSlide(prev => Math.min(prev + 1, presentation.slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPresenterSlide(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setShowPresenter(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPresenter, presentation]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!presentation) return null;

  const slide = presentation.slides[activeSlide];
  const tplColors = TEMPLATES.find(t => t.id === presentation.template)?.colors || ['#6C63FF', '#FF6B6B'];

  return (
    <>
      <div style={{ paddingTop: 72, height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        {/* Toolbar */}
        <div style={{
          padding: '8px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm">
            <FiArrowLeft /> Back
          </button>
          <div style={{ flex: 1 }}>
            <input value={presentation.title} onChange={e => setPresentation(prev => ({ ...prev, title: e.target.value }))}
              style={{
                background: 'transparent', border: 'none', fontSize: '1.1rem', fontWeight: 700,
                color: 'var(--text-primary)', width: '100%', maxWidth: 400,
              }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {presentation.slides.length} slides
          </span>
          <button onClick={() => { setPresenterSlide(0); setShowPresenter(true); }} className="btn btn-ghost btn-sm"
            style={{ color: '#22c55e' }}>
            <FiPlay /> Present
          </button>
          <button onClick={handleExportPPTX} className="btn btn-ghost btn-sm" style={{ color: '#f97316' }}>
            <FiDownload /> PPTX
          </button>
          <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
            <FiFileText /> PDF
          </button>
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><FiSave /> Save</>}
          </button>
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Slide Thumbnails */}
          <div style={{
            width: 180, background: 'var(--surface)', borderRight: '1px solid var(--border-light)',
            overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {presentation.slides.map((s, idx) => (
              <div key={idx} onClick={() => setActiveSlide(idx)}
                style={{
                  position: 'relative', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                  border: idx === activeSlide ? '2px solid var(--primary)' : '2px solid var(--border-light)',
                  overflow: 'hidden', transition: 'all 0.2s',
                  boxShadow: idx === activeSlide ? '0 0 0 2px rgba(108,99,255,0.2)' : 'none',
                }}>
                <div style={{
                  aspectRatio: '16/9', padding: 8,
                  background: s.layout === 'title'
                    ? `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`
                    : 'var(--bg-secondary)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <p style={{
                    fontSize: '0.55rem', fontWeight: 700, lineHeight: 1.2,
                    color: s.layout === 'title' ? 'white' : 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{s.heading}</p>
                </div>
                <div style={{
                  padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface)',
                }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                    style={{ background: 'transparent', color: 'var(--secondary)', fontSize: '0.65rem', padding: 2 }}>
                    <FiTrash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addSlide} style={{
              padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px dashed var(--border-light)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all 0.2s', cursor: 'pointer',
            }}>
              <FiPlus size={12} /> Add Slide
            </button>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, overflow: 'auto' }}>
            <div style={{
              width: '100%', maxWidth: 860, aspectRatio: '16/9',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)',
              position: 'relative', overflow: 'hidden',
              background: slide.layout === 'title'
                ? `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`
                : 'white',
            }}>
              {/* Accent bar for content slides */}
              {slide.layout !== 'title' && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                  background: `linear-gradient(to bottom, ${tplColors[0]}, ${tplColors[1]})`,
                }} />
              )}

              {/* Image background */}
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', opacity: slide.layout === 'title' ? 0.25 : 0.08,
                }} />
              )}

              <div style={{
                position: 'relative', zIndex: 2, padding: '5%',
                height: '100%', display: 'flex', flexDirection: 'column',
                justifyContent: slide.layout === 'title' ? 'center' : 'flex-start',
                alignItems: slide.layout === 'title' ? 'center' : 'flex-start',
                textAlign: slide.layout === 'title' ? 'center' : 'left',
              }}>
                <h2 style={{
                  fontSize: slide.layout === 'title' ? '2rem' : '1.5rem',
                  fontWeight: 800,
                  color: slide.layout === 'title' ? 'white' : 'var(--text-primary)',
                  marginBottom: slide.layout === 'title' ? 12 : 16,
                }}>
                  {slide.heading}
                </h2>

                {slide.content && (
                  <p style={{
                    fontSize: '0.9rem', lineHeight: 1.7,
                    color: slide.layout === 'title' ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                    maxWidth: slide.layout === 'title' ? '60%' : '100%',
                    marginBottom: 16,
                  }}>
                    {slide.content}
                  </p>
                )}

                {slide.layout !== 'title' && slide.bullets?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {slide.bullets.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: tplColors[0], fontWeight: 700, flexShrink: 0 }}>●</span>
                        {b}
                      </div>
                    ))}
                  </div>
                )}

                {/* Slide number */}
                <div style={{
                  position: 'absolute', bottom: '4%', right: '4%',
                  fontSize: '0.7rem', color: slide.layout === 'title' ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
                }}>
                  {activeSlide + 1} / {presentation.slides.length}
                </div>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div style={{
            width: 300, background: 'var(--surface)', borderLeft: '1px solid var(--border-light)',
            overflow: 'auto', padding: 16,
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              <FiEdit3 style={{ marginRight: 6 }} /> Slide Properties
            </h3>

            {/* Layout */}
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Layout</label>
              <select className="input" value={slide.layout} onChange={e => updateSlide('layout', e.target.value)}
                style={{ fontSize: '0.85rem', padding: '8px 10px' }}>
                {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>

            {/* Template */}
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setPresentation(prev => ({ ...prev, template: t.id }))}
                    style={{
                      aspectRatio: '16/9', borderRadius: 6,
                      background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
                      border: presentation.template === t.id ? '3px solid var(--primary)' : '2px solid var(--border-light)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }} title={t.name} />
                ))}
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Heading</label>
              <input className="input" style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                value={slide.heading} onChange={e => updateSlide('heading', e.target.value)} />
            </div>

            {/* Content */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Content</label>
              <textarea className="input" rows={3} style={{ fontSize: '0.85rem', padding: '8px 10px', resize: 'vertical' }}
                value={slide.content || ''} onChange={e => updateSlide('content', e.target.value)} />
            </div>

            {/* Bullets */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Bullet Points</label>
              {slide.bullets?.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input className="input" style={{ fontSize: '0.8rem', padding: '6px 8px', flex: 1 }}
                    value={b} onChange={e => updateBullet(i, e.target.value)} />
                  <button onClick={() => removeBullet(i)} style={{
                    background: 'transparent', color: 'var(--secondary)', padding: 4, flexShrink: 0,
                  }}>
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))}
              <button onClick={addBullet} className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, padding: '4px 8px' }}>
                <FiPlus size={12} /> Add Point
              </button>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Speaker Notes</label>
              <textarea className="input" rows={2} style={{ fontSize: '0.8rem', padding: '8px 10px', resize: 'vertical' }}
                value={slide.notes || ''} onChange={e => updateSlide('notes', e.target.value)}
                placeholder="Notes visible only to presenter..." />
            </div>

            {/* Image URL */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>
                <FiImage style={{ marginRight: 4 }} /> Image URL
              </label>
              <input className="input" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                value={slide.imageUrl || ''} onChange={e => updateSlide('imageUrl', e.target.value)}
                placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      {/* Presenter Mode */}
      {showPresenter && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPresenter(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100vw', height: '100vh', position: 'relative',
            background: presentation.slides[presenterSlide].layout === 'title'
              ? `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`
              : 'white',
          }}>
            {/* Accent bar */}
            {presentation.slides[presenterSlide].layout !== 'title' && (
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
                background: `linear-gradient(to bottom, ${tplColors[0]}, ${tplColors[1]})`,
              }} />
            )}

            {/* Image bg */}
            {presentation.slides[presenterSlide].imageUrl && (
              <img src={presentation.slides[presenterSlide].imageUrl} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.15,
              }} />
            )}

            <div style={{
              position: 'relative', zIndex: 2, height: '100%', padding: '6% 10%',
              display: 'flex', flexDirection: 'column',
              justifyContent: presentation.slides[presenterSlide].layout === 'title' ? 'center' : 'flex-start',
              alignItems: presentation.slides[presenterSlide].layout === 'title' ? 'center' : 'flex-start',
              textAlign: presentation.slides[presenterSlide].layout === 'title' ? 'center' : 'left',
            }}>
              <h1 style={{
                fontSize: presentation.slides[presenterSlide].layout === 'title' ? '4rem' : '2.5rem',
                fontWeight: 800, marginBottom: 20,
                color: presentation.slides[presenterSlide].layout === 'title' ? 'white' : '#1e1e2e',
              }}>
                {presentation.slides[presenterSlide].heading}
              </h1>

              {presentation.slides[presenterSlide].content && (
                <p style={{
                  fontSize: '1.3rem', lineHeight: 1.7, marginBottom: 24, maxWidth: '70%',
                  color: presentation.slides[presenterSlide].layout === 'title' ? 'rgba(255,255,255,0.85)' : '#555',
                }}>
                  {presentation.slides[presenterSlide].content}
                </p>
              )}

              {presentation.slides[presenterSlide].bullets?.length > 0 && presentation.slides[presenterSlide].layout !== 'title' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                  {presentation.slides[presenterSlide].bullets.map((b, i) => (
                    <div key={i} style={{ fontSize: '1.2rem', color: '#333', display: 'flex', gap: 12 }}>
                      <span style={{ color: tplColors[0], fontWeight: 700 }}>●</span> {b}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 16, padding: '8px 20px',
              background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)', color: 'white',
            }}>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.max(0, prev - 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px' }}>←</button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {presenterSlide + 1} / {presentation.slides.length}
              </span>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.min(presentation.slides.length - 1, prev + 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px' }}>→</button>
              <button onClick={() => setShowPresenter(false)}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: '0.8rem' }}>
                ESC
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
