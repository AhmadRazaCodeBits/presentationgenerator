import { useState, useEffect } from 'react';
import { presentationService } from '../services/presentationService';
import TemplateStudio from '../components/TemplateStudio';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiPlus, FiTrash2, FiDownload, FiChevronDown,
  FiEdit3, FiMaximize2, FiImage, FiX, FiCheck, FiLoader,
  FiPlay, FiSave
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

export default function QuickEditorPage() {
  const [templateCatalog, setTemplateCatalog] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('business');
  const [presentation, setPresentation] = useState(() => {
    const saved = localStorage.getItem('quickPresentation');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPresenter, setShowPresenter] = useState(false);
  const [presenterSlide, setPresenterSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [editingFromPresenter, setEditingFromPresenter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [numSlides, setNumSlides] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
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

    loadTemplates();
  }, []);

  useEffect(() => {
    if (presentation?.template) {
      setSelectedTemplateId(presentation.template);
    }
  }, [presentation?.template]);

  useEffect(() => {
    // Save to localStorage whenever presentation changes
    if (presentation) {
      localStorage.setItem('quickPresentation', JSON.stringify(presentation));
    }
  }, [presentation]);

  const getTemplateMeta = (templateId) => templateCatalog.find((template) => {
    const candidateId = template.template_id || template.export_template_id || template.id;
    return candidateId === templateId;
  }) || null;

  const handleTemplateSelect = (template) => {
    const templateId = template.template_id || template.export_template_id || template.id;
    setSelectedTemplateId(templateId);
    setPresentation((prev) => prev ? ({ ...prev, template: templateId, templateData: template }) : prev);
  };

  const handleGeneratePresentation = async () => {
    if (!topicInput.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setGenerating(true);
    try {
      const selectedTemplate = getTemplateMeta(selectedTemplateId);
      // Call the pipeline API to generate presentation
        const response = await fetch('/api/chat/generate-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          numSlides: numSlides,
          template: selectedTemplateId,
          language: 'English',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate');
      const data = await response.json();
      
      const newPresentation = {
        title: topicInput,
        slides: data.slides || [],
        template: selectedTemplateId,
        templateData: selectedTemplate,
        language: 'English',
      };
      
      setPresentation(newPresentation);
      setActiveSlide(0);
      setTopicInput('');
      toast.success('Presentation generated!');
    } catch (error) {
      toast.error('Failed to generate presentation');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPPTX = async () => {
    if (!presentation) return;
    
    try {
      const selectedTemplate = presentation.templateData || getTemplateMeta(presentation.template);
      setSaving(true);
        const response = await fetch('/api/presentations/export/public/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: presentation.title,
          slides: presentation.slides,
          template: presentation.template,
          templateData: selectedTemplate,
          language: presentation.language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentation.title || 'presentation'}_${new Date().toISOString().split('T')[0]}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Presentation downloaded!');
    } catch (error) {
      toast.error(error.message || 'Failed to download presentation');
    } finally {
      setSaving(false);
    }
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
    if (presentation.slides.length <= 1) {
      toast.error('Need at least one slide');
      return;
    }
    setPresentation(prev => {
      const slides = prev.slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, slides };
    });
    if (activeSlide >= presentation.slides.length - 1) {
      setActiveSlide(Math.max(0, activeSlide - 1));
    }
  };

  const handleImageUrlChange = async (url) => {
    if (!url) {
      updateSlide('imageUrl', '');
      return;
    }

    setImageLoading(true);
    try {
      const img = new Image();
      img.onload = () => {
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

  // Keyboard handler for presenter mode
  useEffect(() => {
    if (!showPresenter || !presentation) return;
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

  if (!presentation) {
    return (
      <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              ✨ Quick Presentation Editor
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 32 }}>
              No signup needed! Generate and edit your presentation instantly.
            </p>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Presentation Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g., Climate Change, Digital Marketing, AI"
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleGeneratePresentation()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Number of Slides
                </label>
                <select
                  value={numSlides}
                  onChange={e => setNumSlides(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                  }}
                >
                  {[3, 5, 7, 10, 12, 15, 20].map(n => (
                    <option key={n} value={n}>{n} slides</option>
                  ))}
                </select>
              </div>

              <TemplateStudio
                templates={templatesLoading ? [] : templateCatalog}
                activeTemplateId={selectedTemplateId}
                onSelect={handleTemplateSelect}
                compact
              />

              <button
                onClick={handleGeneratePresentation}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? (
                  <><FiLoader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                ) : (
                  <><span>✨ Generate Presentation</span></>
                )}
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              💡 Tip: After generation, you can edit every slide directly. No download required until you're ready!
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <button onClick={() => { setPresentation(null); localStorage.removeItem('quickPresentation'); }}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <FiArrowLeft size={16} /> New
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
          
          <button onClick={() => { setPresenterSlide(0); setShowPresenter(true); }}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: '#22c55e' }}>
            <FiPlay size={16} /> Present
          </button>
          
          <button onClick={() => openEditSlide(activeSlide)}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: '#3b82f6' }}>
            <FiEdit3 size={16} /> Edit
          </button>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 999, background: 'var(--bg-secondary)' }}>
            Retheme without changing content
          </span>
          
          <button onClick={handleExportPPTX} disabled={saving}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: '#f97316' }}>
            {saving ? <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FiDownload size={16} />} Download
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
                }}>
                <div style={{
                  aspectRatio: '16/9', padding: 8,
                  background: `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <p style={{
                    fontSize: '0.55rem', fontWeight: 700, lineHeight: 1.2,
                    color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
                  }}>{s.heading}</p>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditSlide(idx); }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(108, 99, 255, 0.9)', color: 'white',
                      border: 'none', borderRadius: '50%', width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: 0.8,
                    }}
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
                      border: 'none', cursor: 'pointer',
                    }}
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
              cursor: 'pointer',
            }}>
              <FiPlus size={12} /> Add Slide
            </button>
          </div>

          {/* Canvas */}
          {/* Canvas */}
          <div className="slide-canvas">
            <button 
              onClick={() => openEditSlide(activeSlide)}
              style={{
                position: 'absolute', top: 32, right: 32,
                background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                zIndex: 10,
              }}
            >
              <FiEdit3 size={16} /> Edit Slide
            </button>
            
            <div className="slide-render" style={{
              background: `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`,
            }}>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', opacity: 0.15,
                }} />
              )}

              <div style={{
                position: 'relative', zIndex: 2, padding: '5%',
                height: '100%', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', textAlign: 'center',
              }}>
                <h2 style={{
                  fontSize: '2rem', fontWeight: 800, color: 'white',
                  marginBottom: 12,
                }}>
                  {slide.heading}
                </h2>

                {slide.content && (
                  <p style={{
                    fontSize: '0.9rem', lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.85)',
                    maxWidth: '80%', marginBottom: 16,
                  }}>
                    {slide.content}
                  </p>
                )}

                {slide.bullets?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {slide.bullets.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                        <span style={{ color: '#FF6B6B', fontWeight: 700 }}>●</span>
                        {b}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  position: 'absolute', bottom: '4%', right: '4%',
                  fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
                }}>
                  {activeSlide + 1} / {presentation.slides.length}
                </div>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="properties-panel-sidebar">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              <FiEdit3 style={{ marginRight: 6 }} /> Slide Properties
            </h3>

            {/* Layout */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Layout</label>
              <select value={slide.layout} onChange={e => updateSlide('layout', e.target.value)}
                style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>

            {/* Template */}
            <TemplateStudio
              templates={templatesLoading ? [] : templateCatalog}
              activeTemplateId={presentation.templateData?.template_id || presentation.template}
              onSelect={handleTemplateSelect}
              compact
            />

            {/* Heading */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Heading</label>
              <input style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
                value={slide.heading} onChange={e => updateSlide('heading', e.target.value)} />
            </div>

            {/* Content */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Content</label>
              <textarea rows={3} style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', resize: 'vertical', fontFamily: 'inherit' }}
                value={slide.content || ''} onChange={e => updateSlide('content', e.target.value)} />
            </div>

            {/* Image URL */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                <FiImage style={{ marginRight: 4 }} size={12} /> Image URL
              </label>
              <input style={{ fontSize: '0.8rem', padding: '6px 8px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
                value={slide.imageUrl || ''} onChange={e => updateSlide('imageUrl', e.target.value)}
                placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      {/* Presenter Mode */}
      {showPresenter && presentation && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPresenter(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100vw', height: '100vh', position: 'relative',
            background: `linear-gradient(135deg, ${tplColors[0]}, ${tplColors[1]})`,
          }}>
            <div style={{
              position: 'relative', zIndex: 2, height: '100%', padding: '6% 10%',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            }}>
               <h1 style={{
                fontSize: '4rem', fontWeight: 800, marginBottom: 20, color: 'white',
              }}>
                {presentation.slides[presenterSlide].heading}
              </h1>
              {presentation.slides[presenterSlide].subtitle && (
                <p style={{
                  fontSize: '1.5rem', marginBottom: 16,
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 300,
                }}>{presentation.slides[presenterSlide].subtitle}</p>
              )}

              {presentation.slides[presenterSlide].content &&
               String(presentation.slides[presenterSlide].content).trim() !== String(presentation.slides[presenterSlide].subtitle || '').trim() && (
                <p style={{
                  fontSize: '1.3rem', lineHeight: 1.7, marginBottom: 24, maxWidth: '70%',
                  color: 'rgba(255,255,255,0.85)',
                }}>
                  {presentation.slides[presenterSlide].content}
                </p>
              )}

              {presentation.slides[presenterSlide].bullets?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                  {presentation.slides[presenterSlide].bullets.map((b, i) => (
                    <div key={i} style={{ fontSize: '1.2rem', color: '#fff', display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <span style={{ color: '#FF6B6B', fontWeight: 700 }}>●</span> {b}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
              
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
              
              <button onClick={(e) => { e.stopPropagation(); setEditingFromPresenter(true); setShowPresenter(false); setEditingSlide(presenterSlide); }}
                style={{
                  background: 'rgba(108, 99, 255, 0.9)', color: 'white', padding: '4px 10px', 
                  borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <FiEdit3 size={12} /> Edit
              </button>

              <button onClick={() => setShowPresenter(false)}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', 
                  borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                }}
              >
                ESC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slide Modal */}
      {editingSlide !== null && presentation && (
        <div className="edit-modal-overlay" onClick={closeEditSlide}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Slide {editingSlide + 1}</h2>
              <button onClick={closeEditSlide} style={{
                background: 'transparent', color: 'var(--text-muted)', fontSize: '1.5rem', padding: 0, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
              }}>
                <FiX />
              </button>
            </div>

            <div className="modal-form">
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
                      }}>
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
                  }}>
                    <FiPlus size={14} /> Add Bullet Point
                  </button>
                </div>
              </div>

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
                      Image will auto-scale
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 0 }}>
                  💡 Tip: Images will be automatically resized and optimized.
                </p>
              </div>

              <div className="form-group">
                <label>Speaker Notes</label>
                <textarea rows={3}
                  value={presentation.slides[editingSlide].notes || ''}
                  onChange={e => {
                    const slides = [...presentation.slides];
                    slides[editingSlide].notes = e.target.value;
                    setPresentation({ ...presentation, slides });
                  }}
                  placeholder="Private notes for presenter..." />
              </div>
            </div>

            <div className="edit-modal-actions">
              <button onClick={closeEditSlide} style={{
                background: 'var(--primary)', color: 'white',
              }}>
                <FiCheck size={14} style={{ marginRight: 6 }} /> Done
              </button>
              <button onClick={closeEditSlide} style={{
                background: 'var(--border-light)', color: 'var(--text-primary)',
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
