import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService } from '../services/presentationService';
import TemplateStudio from '../components/TemplateStudio';
import toast from 'react-hot-toast';
import {
  FiSave, FiDownload, FiArrowLeft, FiPlus, FiTrash2, FiPlay,
  FiChevronDown, FiEdit3, FiMaximize2, FiImage, FiX, FiCheck, FiLoader
} from 'react-icons/fi';

const TEMPLATES = [
  { id: 'business', name: 'Modern Business Premium', colors: ['#1E3A8A', '#3B82F6'] },
  { id: 'technology', name: 'Vibrant Tech Premium', colors: ['#6F42C1', '#D946EF'] },
  { id: 'creative', name: 'Creative Marketing Premium', colors: ['#FF6B35', '#FF9F1C'] },
  { id: 'minimal', name: 'Minimal Clean Premium', colors: ['#111827', '#4B5563'] },
  { id: 'professional', name: 'Corporate Professional Premium', colors: ['#0D6EFD', '#6C757D'] },
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

const isSideBySideLayout = (layout) => ['image-left', 'image-right', 'two-column'].includes(layout);

export default function PresentationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPresenter, setShowPresenter] = useState(false);
  const [presenterSlide, setPresenterSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [editingFromPresenter, setEditingFromPresenter] = useState(false);
  const [templateCatalog, setTemplateCatalog] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    loadPresentation();
    loadTemplates();
  }, [id]);

  const loadTemplates = async () => {
    try {
      const data = await presentationService.getTemplates();
      setTemplateCatalog(data.templates || []);
    } catch {
      setTemplateCatalog([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

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

  const getTemplateMeta = (templateId) => templateCatalog.find((template) => {
    const candidateId = template.template_id || template.export_template_id || template.id;
    return candidateId === templateId;
  }) || null;

  const handleTemplateSelect = (template) => {
    const templateId = template.template_id || template.export_template_id || template.id;
    setPresentation((prev) => ({
      ...prev,
      template: templateId,
      templateData: template,
    }));
  };

  const handleTemplateCustomize = (templateData) => {
    setPresentation(prev => ({ ...prev, templateData, template: templateData.template_id || prev.template }));
    toast.success('Template changes applied (remember to Save)');
  };

  const handleSave = async () => {
    if (!presentation) return;
    setSaving(true);
    try {
      const selectedTemplate = presentation.templateData || getTemplateMeta(presentation.template);
      await presentationService.updatePresentation(id, {
        title: presentation.title,
        slides: presentation.slides,
        template: presentation.template,
        templateData: selectedTemplate,
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
    if (presentation.slides.length >= 20) {
      toast.error('Maximum 20 slides allowed');
      return;
    }

    setPresentation(prev => {
      const newSlide = {
        order: prev.slides.length + 1,
        heading: 'New Slide',
        content: 'Add your content here.',
        bullets: ['Point 1', 'Point 2'],
        notes: '',
        imageUrl: '',
        imageQuery: '',
        image_prompt: '',
        layout: 'content',
      };
      return { ...prev, slides: [...prev.slides, newSlide] };
    });
    setActiveSlide(presentation.slides.length);
  };

  const handleLayoutChange = (newLayout) => {
    // Map layout to image_position where applicable
    const pos = (newLayout === 'image-left' || newLayout === 'image-left-text-right') ? 'left'
      : (newLayout === 'image-right' || newLayout === 'text-left-image-right') ? 'right'
      : (newLayout === 'two-column') ? 'right'
      : 'none';

    updateSlide('layout', newLayout);
    updateSlide('image_position', pos);
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

  const openEditSlide = (slideIdx) => {
    setEditingSlide(slideIdx);
  };

  const closeEditSlide = () => {
    if (editingFromPresenter) {
      setShowPresenter(true);
      setEditingFromPresenter(false);
    }
    setEditingSlide(null);
  };

  const handleImageUrlChange = async (url) => {
    if (!url) {
      updateSlide('imageUrl', '');
      return;
    }

    setImageLoading(true);
    try {
      // Create a new Image object to validate and get dimensions
      const img = new Image();
      img.onload = () => {
        // Image loaded successfully
        setImageLoading(false);
        updateSlide('imageUrl', url);
        toast.success('Image added! Size will adjust automatically.');
      };
      img.onerror = () => {
        setImageLoading(false);
        toast.error('Invalid image URL');
      };
      img.src = url;
    } catch (err) {
      setImageLoading(false);
      toast.error('Failed to load image');
    }
  };

  const handleFetchImageForSlide = async (slideIdx) => {
    if (!presentation || !presentation._id) return;
    setImageLoading(true);
    try {
      const res = await presentationService.fetchSlideImage(presentation._id, slideIdx + 1);
      if (res && res.success && res.slide) {
        setPresentation(prev => {
          const slides = [...prev.slides];
          slides[slideIdx] = res.slide;
          return { ...prev, slides };
        });
        toast.success('Fetched image for slide');
      } else {
        toast.error('Failed to fetch image');
      }
    } catch (err) {
      toast.error('Failed to fetch image');
    } finally {
      setImageLoading(false);
    }
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
  const activeTemplateMeta = presentation.templateData || getTemplateMeta(presentation.template);
  const tplColors = activeTemplateMeta?.color_scheme
    ? [activeTemplateMeta.color_scheme.primary, activeTemplateMeta.color_scheme.secondary]
    : TEMPLATES.find(t => t.id === presentation.template)?.colors || ['#6C63FF', '#FF6B6B'];

  return (
    <>
      <div style={{ paddingTop: 72, height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        {/* Toolbar */}
        <div className="editor-toolbar" style={{
          padding: '8px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm">
            <FiArrowLeft /> Back
          </button>
          <div style={{ flex: 1, minWidth: 120 }}>
            <input value={presentation.title} onChange={e => setPresentation(prev => ({ ...prev, title: e.target.value }))}
              style={{
                background: 'transparent', border: 'none', fontSize: '1.1rem', fontWeight: 700,
                color: 'var(--text-primary)', width: '100%', maxWidth: 'min(400px, 35vw)',
              }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {presentation.slides.length} slides
          </span>
          <button onClick={() => { setPresenterSlide(0); setShowPresenter(true); }} className="btn btn-ghost btn-sm"
            style={{ color: '#22c55e' }}>
            <FiPlay /> Present
          </button>
          <button onClick={() => openEditSlide(activeSlide)} className="btn btn-ghost btn-sm" style={{ color: '#3b82f6' }}>
            <FiEdit3 /> Edit
          </button>
          <button onClick={handleExportPPTX} className="btn btn-ghost btn-sm" style={{ color: '#f97316' }}>
            <FiDownload /> PPTX
          </button>
          <button onClick={async () => {
            try {
              const tpl = presentation.templateData || getTemplateMeta(presentation.template) || {};
              await presentationService.previewDownloadPPTX(presentation._id, tpl);
              toast.success('Preview PPTX downloaded');
            } catch (err) {
              toast.error('Preview failed: ' + (err.response?.data?.error || err.message));
            }
          }} className="btn btn-ghost btn-sm" style={{ color: '#8b5cf6' }}>
            <FiMaximize2 /> Preview Theme
          </button>
          <button onClick={async () => {
            try {
              const res = await presentationService.exportToGoogle(presentation._id);
              if (res && res.success && res.google) {
                const link = res.google.webViewLink || `https://docs.google.com/presentation/d/${res.google.id}/edit`;
                window.open(link, '_blank');
                toast.success('Exported to Google Slides — opened in new tab');
              } else {
                toast.error('Google export failed');
              }
            } catch (err) {
              toast.error('Google export failed: ' + (err.response?.data?.error || err.message));
            }
          }} className="btn btn-ghost btn-sm" style={{ color: '#0ea5a4' }}>
            <svg style={{ width: 14, height: 14, marginRight: 6 }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8H9L12 2Z" fill="#0ea5a4"/></svg> Google
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 999, background: 'var(--bg-secondary)' }}>
            Rethemeable deck
          </span>
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><FiSave /> Save</>}
          </button>
        </div>

        {/* Editor Body */}
        <div className="editor-workspace">
          {/* Slide Thumbnails */}
          <div className="slide-thumbnails-sidebar">
            {presentation.slides.map((s, idx) => (
              <div key={idx} onClick={() => setActiveSlide(idx)}
                style={{
                  position: 'relative', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                  border: idx === activeSlide ? '2px solid var(--primary)' : '2px solid var(--border-light)',
                  overflow: 'hidden', transition: 'all 0.2s',
                  boxShadow: idx === activeSlide ? '0 0 0 2px rgba(108,99,255,0.2)' : 'none',
                  group: 'slide-thumbnail',
                }}>
                <div style={{
                  aspectRatio: '16/9', padding: 8,
                  background: s.layout === 'title'
                    ? `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`
                    : 'var(--bg-secondary)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <p style={{
                    fontSize: '0.55rem', fontWeight: 700, lineHeight: 1.2,
                    color: s.layout === 'title' ? 'white' : 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{s.heading}</p>
                  
                  {/* Edit Overlay Icon */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditSlide(idx); }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(108, 99, 255, 0.9)', color: 'white',
                      border: 'none', borderRadius: '50%', width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                      opacity: 0.8, hoverOpacity: 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                    title="Edit slide"
                  >
                    <FiEdit3 size={12} />
                  </button>
                </div>
                <div style={{
                  padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface)',
                }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                    style={{ 
                      background: 'transparent', color: 'var(--secondary)', fontSize: '0.65rem', padding: 2,
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    title="Delete slide"
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--secondary)'}
                  >
                    <FiTrash2 size={11} />
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
          <div className="slide-canvas">
            {/* Edit Button Overlay */}
            <button 
              onClick={() => openEditSlide(activeSlide)}
              style={{
                position: 'absolute', top: 32, right: 32,
                background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                boxShadow: 'var(--shadow-lg)', transition: 'all 0.2s',
                zIndex: 10,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              title="Edit current slide"
            >
              <FiEdit3 size={16} /> Edit Slide
            </button>
            
            <div className="slide-render" style={{
              background: slide.layout === 'title'
                ? `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`
                : 'white',
            }}>
              {/* Accent bar for content slides */}
              {slide.layout !== 'title' && !isSideBySideLayout(slide.layout) && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                  background: `linear-gradient(to bottom, ${tplColors[0]}, ${tplColors[1]})`,
                }} />
              )}

              {isSideBySideLayout(slide.layout) ? (
                <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr' }}>
                  <div style={{ padding: '6% 5% 6% 7%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: presentation.language === 'ur' ? 'right' : 'left', direction: presentation.language === 'ur' ? 'rtl' : 'ltr' }}>
                    <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
                      {slide.heading}
                    </h2>
                    {slide.content && (
                      <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        {slide.content}
                      </p>
                    )}
                    {slide.bullets?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {slide.bullets.map((b, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: presentation.language === 'ur' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            <span style={{ color: tplColors[0], fontWeight: 700, flexShrink: 0 }}>●</span>
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', minHeight: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,247,250,0.92))', borderLeft: '1px solid rgba(0,0,0,0.04)' }}>
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Image area
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.35)', padding: '4px 8px', borderRadius: 999 }}>
                      {activeSlide + 1} / {presentation.slides.length}
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                    textAlign: slide.layout === 'title' ? 'center' : presentation.language === 'ur' ? 'right' : 'left',
                    direction: presentation.language === 'ur' ? 'rtl' : 'ltr',
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
                          <div key={i} style={{ display: 'flex', flexDirection: presentation.language === 'ur' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
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
                </>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="properties-panel-sidebar">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              <FiEdit3 style={{ marginRight: 6 }} /> Slide Properties
            </h3>

            {/* Layout */}
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Layout</label>
              <select className="input" value={slide.layout} onChange={e => handleLayoutChange(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '8px 10px' }}>
                {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>

              {isSideBySideLayout(slide.layout) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', marginRight: 6 }}>Image Position:</label>
                  <button className={`btn btn-sm ${slide.image_position === 'left' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => { updateSlide('image_position', 'left'); updateSlide('layout', 'image-left'); }}>
                    Left
                  </button>
                  <button className={`btn btn-sm ${slide.image_position === 'right' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => { updateSlide('image_position', 'right'); updateSlide('layout', 'image-right'); }}>
                    Right
                  </button>
                </div>
              )}
            </div>

            {/* Template */}
            <TemplateStudio
              templates={templatesLoading ? [] : templateCatalog}
              activeTemplateId={presentation.templateData?.template_id || presentation.template}
              onSelect={handleTemplateSelect}
              onCustomize={handleTemplateCustomize}
              compact
            />

            {/* Heading */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Heading</label>
              <input className="input" style={{ fontSize: '0.85rem', padding: '8px 10px', direction: presentation.language === 'ur' ? 'rtl' : 'ltr', textAlign: presentation.language === 'ur' ? 'right' : 'left' }}
                value={slide.heading} onChange={e => updateSlide('heading', e.target.value)} />
            </div>

            {/* Content */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Content</label>
              <textarea className="input" rows={3} style={{ fontSize: '0.85rem', padding: '8px 10px', resize: 'vertical', direction: presentation.language === 'ur' ? 'rtl' : 'ltr', textAlign: presentation.language === 'ur' ? 'right' : 'left' }}
                value={slide.content || ''} onChange={e => updateSlide('content', e.target.value)} />
            </div>

            {/* Bullets */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Bullet Points</label>
              {slide.bullets?.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input className="input" style={{ fontSize: '0.8rem', padding: '6px 8px', flex: 1, direction: presentation.language === 'ur' ? 'rtl' : 'ltr', textAlign: presentation.language === 'ur' ? 'right' : 'left' }}
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
              <textarea className="input" rows={2} style={{ fontSize: '0.8rem', padding: '8px 10px', resize: 'vertical', direction: presentation.language === 'ur' ? 'rtl' : 'ltr', textAlign: presentation.language === 'ur' ? 'right' : 'left' }}
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

            {/* Image Prompt */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Image Prompt</label>
              <input className="input" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                value={slide.image_prompt || ''} onChange={e => updateSlide('image_prompt', e.target.value)}
                placeholder="Describe the image you want (e.g. 'side-by-side product shot, clean white background')" />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>Edit this prompt to improve automatically fetched images.</p>
            </div>

            {/* Image Alt Text (Accessibility) */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Alt Text</label>
              <input className="input" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                value={slide.image_alt || ''} onChange={e => updateSlide('image_alt', e.target.value)}
                placeholder="Short description for screen readers" />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>Alt text improves accessibility and will be embedded in exports.</p>
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

            {isSideBySideLayout(presentation.slides[presenterSlide].layout) ? (
              <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr' }}>
                <div style={{ padding: '6% 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center', direction: presentation.language === 'ur' ? 'rtl' : 'ltr', textAlign: presentation.language === 'ur' ? 'right' : 'left' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 20, color: '#1e1e2e' }}>
                    {presentation.slides[presenterSlide].heading}
                  </h1>
                  {presentation.slides[presenterSlide].content && (
                    <p style={{ fontSize: '1.15rem', lineHeight: 1.7, marginBottom: 24, color: '#555' }}>
                      {presentation.slides[presenterSlide].content}
                    </p>
                  )}
                  {presentation.slides[presenterSlide].bullets?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                      {presentation.slides[presenterSlide].bullets.map((b, i) => (
                        <div key={i} style={{ fontSize: '1.1rem', color: '#333', display: 'flex', flexDirection: presentation.language === 'ur' ? 'row-reverse' : 'row', gap: 12 }}>
                          <span style={{ color: tplColors[0], fontWeight: 700 }}>●</span> {b}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative', minHeight: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,247,250,0.92))', borderLeft: '1px solid rgba(0,0,0,0.04)' }}>
                  {presentation.slides[presenterSlide].imageUrl ? (
                    <img src={presentation.slides[presenterSlide].imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
              </div>
            ) : (
              <>
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
                  textAlign: presentation.slides[presenterSlide].layout === 'title' ? 'center' : presentation.language === 'ur' ? 'right' : 'left',
                  direction: presentation.language === 'ur' ? 'rtl' : 'ltr',
                }}>
                  <h1 style={{
                    fontSize: presentation.slides[presenterSlide].layout === 'title' ? '4rem' : '2.5rem',
                    fontWeight: 800, marginBottom: 20,
                    color: presentation.slides[presenterSlide].layout === 'title' ? 'white' : '#1e1e2e',
                  }}>
                    {presentation.slides[presenterSlide].heading}
                  </h1>
                  {presentation.slides[presenterSlide].subtitle && (
                    <p style={{
                      fontSize: '1.5rem', marginBottom: 16,
                      color: presentation.slides[presenterSlide].layout === 'title' ? 'rgba(255,255,255,0.85)' : '#777',
                      fontWeight: 300,
                    }}>{presentation.slides[presenterSlide].subtitle}</p>
                  )}

                  {presentation.slides[presenterSlide].content &&
                   presentation.slides[presenterSlide].layout !== 'title' &&
                   presentation.slides[presenterSlide].layout !== 'Title Slide' &&
                   String(presentation.slides[presenterSlide].content).trim() !== String(presentation.slides[presenterSlide].subtitle || '').trim() && (
                    <p style={{
                      fontSize: '1.3rem', lineHeight: 1.7, marginBottom: 24, maxWidth: '70%',
                      color: '#555',
                    }}>
                      {presentation.slides[presenterSlide].content}
                    </p>
                  )}

                  {presentation.slides[presenterSlide].bullets?.length > 0 && presentation.slides[presenterSlide].layout !== 'title' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                      {presentation.slides[presenterSlide].bullets.map((b, i) => (
                        <div key={i} style={{ fontSize: '1.2rem', color: '#333', display: 'flex', flexDirection: presentation.language === 'ur' ? 'row-reverse' : 'row', gap: 12 }}>
                          <span style={{ color: tplColors[0], fontWeight: 700 }}>●</span> {b}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Navigation */}
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              background: 'rgba(0,0,0,0.7)', borderRadius: 'var(--radius-full)', color: 'white',
              backdropFilter: 'blur(10px)',
            }}>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.max(0, prev - 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px', cursor: 'pointer', border: 'none' }}>
                ←
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>
                {presenterSlide + 1} / {presentation.slides.length}
              </span>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.min(presentation.slides.length - 1, prev + 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px', cursor: 'pointer', border: 'none' }}>
                →
              </button>
              
              {/* Divider */}
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
              
              {/* Edit Button */}
              <button onClick={(e) => { e.stopPropagation(); setEditingFromPresenter(true); setShowPresenter(false); setEditingSlide(presenterSlide); }}
                style={{
                  background: 'rgba(108, 99, 255, 0.9)', color: 'white', padding: '4px 10px', 
                  borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(108, 99, 255, 1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(108, 99, 255, 0.9)'}
                title="Edit current slide"
              >
                <FiEdit3 size={12} /> Edit
              </button>

              <button onClick={() => setShowPresenter(false)}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', 
                  borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                title="Exit presenter mode"
              >
                ESC
              </button>
            </div>

            {/* Edit Hint */}
            <div style={{
              position: 'absolute', top: 20, right: 20, 
              background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)',
              padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(10px)',
            }}>
              <FiEdit3 size={14} /> Click Edit button to modify this slide
            </div>
          </div>
        </div>
      )}

      {/* Edit Slide Modal */}
      {editingSlide !== null && presentation && (
        <div className="edit-modal-overlay" onClick={closeEditSlide}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header">
              <h2>
                Edit Slide {editingSlide + 1}
              </h2>
              <button onClick={closeEditSlide} style={{
                background: 'transparent', color: 'var(--text-muted)', fontSize: '1.5rem', padding: 0, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
              }}>
                <FiX />
              </button>
            </div>

            {/* Edit Form */}
            <div className="modal-form">
              {/* Heading */}
              <div className="form-group">
                <label>Slide Title</label>
                <input
                  value={presentation.slides[editingSlide].heading}
                  onChange={e => {
                    const slides = [...presentation.slides];
                    slides[editingSlide].heading = e.target.value;
                    setPresentation({ ...presentation, slides });
                  }} />
              </div>

              {/* Content */}
              <div className="form-group">
                <label>Content</label>
                <textarea rows={4}
                  value={presentation.slides[editingSlide].content || ''}
                  onChange={e => {
                    const slides = [...presentation.slides];
                    slides[editingSlide].content = e.target.value;
                    setPresentation({ ...presentation, slides });
                  }} />
              </div>

              {/* Bullet Points */}
              <div className="form-group">
                <label>Bullet Points</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {presentation.slides[editingSlide].bullets?.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <input style={{ flex: 1 }}
                        value={b} onChange={e => {
                          const slides = [...presentation.slides];
                          slides[editingSlide].bullets[i] = e.target.value;
                          setPresentation({ ...presentation, slides });
                        }} />
                      <button onClick={() => {
                        const slides = [...presentation.slides];
                        slides[editingSlide].bullets = slides[editingSlide].bullets.filter((_, idx) => idx !== i);
                        setPresentation({ ...presentation, slides });
                      }} style={{
                        background: 'transparent', color: 'var(--secondary)', padding: 8, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const slides = [...presentation.slides];
                    slides[editingSlide].bullets = [...(slides[editingSlide].bullets || []), 'New point'];
                    setPresentation({ ...presentation, slides });
                  }} style={{ 
                    justifyContent: 'flex-start', color: 'var(--primary)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '8px 0', fontSize: '0.9rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <FiPlus size={14} /> Add Bullet Point
                  </button>
                </div>
              </div>

              {/* Image Section */}
              <div style={{
                border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16,
                background: 'var(--bg-secondary)',
              }}>
                <label style={{ fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                  <FiImage size={14} style={{ marginRight: 6 }} /> Image URL
                </label>
                
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <input style={{ flex: 1 }}
                    placeholder="https://example.com/image.jpg"
                    value={presentation.slides[editingSlide].imageUrl || ''}
                    onChange={e => handleImageUrlChange(e.target.value)} />
                  {imageLoading && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}>
                    <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  </span>}
                </div>

                {/* Image Preview */}
                {presentation.slides[editingSlide].imageUrl && !imageLoading && (
                  <div className="image-preview-container" style={{
                    position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                    border: '1px solid var(--border-light)', marginBottom: 12,
                  }}>
                    <img src={presentation.slides[editingSlide].imageUrl} alt="preview" style={{
                      width: '100%', height: 'auto', maxHeight: 200, objectFit: 'cover', display: 'block',
                    }} onError={() => toast.error('Failed to load image')} />
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      fontSize: '0.7rem', background: 'rgba(0,0,0,0.6)', color: 'white',
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                    }}>
                      Image will auto-scale in presentation
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 0 }}>
                  💡 Tip: Images from Pixabay, Unsplash, or other websites work great. Size adjusts automatically.
                </p>
                
                {/* Image Prompt (edit per-slide) */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: '0.85rem', marginBottom: 6, display: 'block', fontWeight: 500 }}>Image Prompt</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea rows={2} style={{ flex: 1, padding: 8 }}
                      value={presentation.slides[editingSlide].image_prompt || ''}
                      onChange={e => {
                        const slides = [...presentation.slides];
                        slides[editingSlide].image_prompt = e.target.value;
                        setPresentation({ ...presentation, slides });
                      }}
                      placeholder="e.g. 'clean office workspace, natural lighting, person presenting'" />
                    <button onClick={() => handleFetchImageForSlide(editingSlide)} className="btn btn-sm btn-ghost"
                      style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }} disabled={imageLoading}>
                      {imageLoading ? 'Fetching...' : 'Fetch Image'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>This prompt will be used when fetching images for this slide.</p>
                </div>

                {/* Image Alt Text (edit per-slide) */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: '0.85rem', marginBottom: 6, display: 'block', fontWeight: 500 }}>Alt Text</label>
                  <textarea rows={2} style={{ width: '100%', padding: 8 }}
                    value={presentation.slides[editingSlide].image_alt || ''}
                    onChange={e => {
                      const slides = [...presentation.slides];
                      slides[editingSlide].image_alt = e.target.value;
                      setPresentation({ ...presentation, slides });
                    }}
                    placeholder="Short description for screen readers" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>You can edit the generated alt text before saving.</p>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Speaker Notes</label>
                <textarea rows={3}
                  value={presentation.slides[editingSlide].notes || ''}
                  onChange={e => {
                    const slides = [...presentation.slides];
                    slides[editingSlide].notes = e.target.value;
                    setPresentation({ ...presentation, slides });
                  }}
                  placeholder="Notes visible only to presenter..." />
              </div>
            </div>

            {/* Actions */}
            <div className="edit-modal-actions">
              <button onClick={handleSave} style={{
                background: 'var(--primary)', color: 'white',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-dark)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
              >
                <FiCheck size={14} style={{ marginRight: 6 }} /> Save Changes
              </button>
              <button onClick={closeEditSlide} style={{
                background: 'var(--border-light)', color: 'var(--text-primary)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--border-light)'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
