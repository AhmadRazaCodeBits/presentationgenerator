import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { presentationService } from '../services/presentationService';
import { useAuth } from '../context/AuthContext';
import EnhancedBriefReview from '../components/EnhancedBriefReview';
import TemplateSuggestionCard from '../components/TemplateSuggestionCard';
import SlideGenerationProgress from '../components/SlideGenerationProgress';
import toast from 'react-hot-toast';
import {
  FiSend, FiPlus, FiDownload, FiMaximize2, FiEdit3, FiFileText,
  FiChevronDown, FiPaperclip, FiImage, FiFile, FiX, FiArrowLeft,
  FiCheck,
} from 'react-icons/fi';

const LANGUAGES = [
  { id: 'auto', label: 'Auto Detect', icon: '🌐', flag: '' },
  { id: 'en', label: 'English', icon: '🇬🇧', flag: 'EN' },
  { id: 'ur', label: 'اردو (Urdu)', icon: '🇵🇰', flag: 'UR' },
];

const SLIDE_COUNTS = [6, 8, 10, 12, 15, 18];

const SUGGESTIONS = [
  'Create a presentation about Artificial Intelligence',
  'Generate slides for Digital Marketing Strategy',
  'پاکستان کی معیشت پر پریزنٹیشن بنائیں',
  'Make a pitch deck for a startup',
];

// Pipeline steps
const STEP = {
  INPUT: 'input',
  ENHANCING: 'enhancing',
  BRIEF_REVIEW: 'brief_review',
  SUGGESTING: 'suggesting',
  TEMPLATE_SELECT: 'template_select',
  GENERATING: 'generating',
  DONE: 'done',
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentPresentationId, setCurrentPresentationId] = useState(null);
  const [showPresenter, setShowPresenter] = useState(false);
  const [presenterSlide, setPresenterSlide] = useState(0);

  // Pipeline state
  const [pipelineStep, setPipelineStep] = useState(STEP.INPUT);
  const [enhancedBrief, setEnhancedBrief] = useState(null);
  const [suggestedTemplates, setSuggestedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [genProgress, setGenProgress] = useState({ step: 'content', currentSlide: 0, totalSlides: 0 });

  // UI state
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [selectedSlideCount, setSelectedSlideCount] = useState(10);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pipelineStep]);

  useEffect(() => {
    if (isAuthenticated) {
      chatService.getChatHistory()
        .then(data => setChatHistory(data.chats || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Presenter keyboard
  useEffect(() => {
    if (!showPresenter) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPresenterSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPresenterSlide(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') setShowPresenter(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPresenter, slides]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.lang-dropdown')) setShowLangMenu(false);
      if (!e.target.closest('.attach-dropdown')) setShowAttachMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be under 10MB');
        return;
      }
      setAttachedFile(file);
      setShowAttachMenu(false);
      toast.success(`📎 ${file.name} attached`);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  // ============================================================================
  // PIPELINE FLOW
  // ============================================================================

  const handleSend = async () => {
    const topic = input.trim();
    if (!topic || pipelineStep === STEP.ENHANCING) return;

    setInput('');
    const lang = LANGUAGES.find(l => l.id === selectedLanguage);
    const langLabel = selectedLanguage !== 'auto' ? ` [${lang?.flag}]` : '';
    const fileLabel = attachedFile ? ` 📎 ${attachedFile.name}` : '';
    const slideLabel = ` (${selectedSlideCount} slides)`;

    setMessages(prev => [...prev, {
      role: 'user',
      content: `${topic}${langLabel}${slideLabel}${fileLabel}`,
    }]);

    // Step 1: Enhance Topic
    setPipelineStep(STEP.ENHANCING);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🚀 **Step 1/3** — Analyzing your topic and creating a structured brief...',
      type: 'status',
    }]);

    try {
      const enhanceResult = await chatService.enhanceTopic(topic, {
        slideCount: selectedSlideCount,
        language: selectedLanguage,
      });

      if (enhanceResult.success && enhanceResult.brief) {
        setEnhancedBrief(enhanceResult.brief);
        setPipelineStep(STEP.BRIEF_REVIEW);

        // Replace status message with brief review
        setMessages(prev => {
          const updated = prev.filter(m => m.type !== 'status');
          return [...updated, {
            role: 'assistant',
            content: `✅ I've analyzed your topic and created a presentation plan for **"${enhanceResult.brief.enhanced_topic}"** with ${enhanceResult.brief.suggested_slide_count} slides across ${enhanceResult.brief.sections?.length || 0} sections.\n\nReview the brief below and click **Choose Template** to continue.`,
            type: 'brief',
            brief: enhanceResult.brief,
          }];
        });
      } else {
        throw new Error('Failed to enhance topic');
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to enhance topic';
      setMessages(prev => {
        const updated = prev.filter(m => m.type !== 'status');
        return [...updated, { role: 'assistant', content: `❌ ${errMsg}. Please try again.` }];
      });
      setPipelineStep(STEP.INPUT);
      toast.error(errMsg);
    } finally {
      removeFile();
    }
  };

  const handleProceedToTemplates = async () => {
    if (!enhancedBrief) return;

    // Step 2: Suggest Templates
    setPipelineStep(STEP.SUGGESTING);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🎨 **Step 2/3** — Generating custom template suggestions based on your brief...',
      type: 'status',
    }]);

    try {
      const templateResult = await chatService.suggestTemplates(enhancedBrief);

      if (templateResult.success && templateResult.templates) {
        setSuggestedTemplates(templateResult.templates);
        setPipelineStep(STEP.TEMPLATE_SELECT);

        setMessages(prev => {
          const updated = prev.filter(m => m.type !== 'status');
          return [...updated, {
            role: 'assistant',
            content: `✅ I've designed **${templateResult.templates.length} custom templates** tailored to your presentation. Select one below to generate your slides.`,
            type: 'templates',
            templates: templateResult.templates,
          }];
        });
      } else {
        throw new Error('Failed to generate templates');
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to suggest templates';
      setMessages(prev => {
        const updated = prev.filter(m => m.type !== 'status');
        return [...updated, { role: 'assistant', content: `❌ ${errMsg}. Please try again.` }];
      });
      setPipelineStep(STEP.BRIEF_REVIEW);
      toast.error(errMsg);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleGenerateSlides = async () => {
    if (!enhancedBrief || !selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    // Step 3+4: Generate Slides + Images
    setPipelineStep(STEP.GENERATING);
    setGenProgress({ step: 'content', currentSlide: 0, totalSlides: enhancedBrief.suggested_slide_count });

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `🚀 **Step 3/3** — Generating your presentation with **"${selectedTemplate.template_name}"** template...`,
      type: 'generating',
    }]);

    // Simulate progress steps
    const progressTimer = setTimeout(() => {
      setGenProgress(prev => ({ ...prev, step: 'images' }));
    }, 8000);

    const progressTimer2 = setTimeout(() => {
      setGenProgress(prev => ({ ...prev, step: 'assembling' }));
    }, 20000);

    try {
      const result = await chatService.generatePipelineSlides(enhancedBrief, selectedTemplate);

      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);

      if (result.success && result.data) {
        const slideData = result.data.slides;
        setSlides(slideData);
        setCurrentPresentationId(result.presentationId || null);
        setGenProgress({ step: 'done', currentSlide: slideData.length, totalSlides: slideData.length });
        setPipelineStep(STEP.DONE);

        const slideList = slideData.map((s, i) => `**Slide ${i + 1}:** ${s.heading}`).join('\n');
        setMessages(prev => {
          const updated = prev.filter(m => m.type !== 'generating');
          return [...updated, {
            role: 'assistant',
            content: `🎉 Your presentation is ready! **"${result.data.title}"** — ${slideData.length} slides with Pixabay stock images.\n\n${slideList}\n\n📝 Click any slide to edit. Use the toolbar to export or present.`,
            slides: slideData,
          }];
        });

        toast.success(`🎉 ${slideData.length} slides generated!`);
      } else {
        throw new Error('Failed to generate slides');
      }
    } catch (error) {
      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);
      const errMsg = error.response?.data?.error || error.message || 'Failed to generate slides';
      setMessages(prev => {
        const updated = prev.filter(m => m.type !== 'generating');
        return [...updated, { role: 'assistant', content: `❌ ${errMsg}. Please try again.` }];
      });
      setPipelineStep(STEP.TEMPLATE_SELECT);
      toast.error(errMsg);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text) => {
    setInput(text);
    const urduRegex = /[\u0600-\u06FF]/;
    if (urduRegex.test(text)) {
      setSelectedLanguage('ur');
    }
    inputRef.current?.focus();
  };

  const resetChat = () => {
    setMessages([]);
    setSlides([]);
    setEditingSlide(null);
    setCurrentPresentationId(null);
    setEnhancedBrief(null);
    setSuggestedTemplates([]);
    setSelectedTemplate(null);
    setPipelineStep(STEP.INPUT);
    removeFile();
  };

  const updateSlide = (index, field, value) => {
    setSlides(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateBullet = (slideIdx, bulletIdx, value) => {
    setSlides(prev => {
      const updated = [...prev];
      const bullets = [...updated[slideIdx].bullets];
      bullets[bulletIdx] = value;
      updated[slideIdx] = { ...updated[slideIdx], bullets };
      return updated;
    });
  };

  const addBullet = (slideIdx) => {
    setSlides(prev => {
      const updated = [...prev];
      updated[slideIdx] = { ...updated[slideIdx], bullets: [...updated[slideIdx].bullets, 'New point'] };
      return updated;
    });
  };

  const handleExportPPTX = () => {
    if (currentPresentationId) {
      window.open(presentationService.getExportPPTXUrl(currentPresentationId), '_blank');
    } else if (slides.length > 0) {
      presentationService.downloadPublicPPTX({
        title: enhancedBrief?.enhanced_topic || slides[0]?.heading || 'Presentation',
        slides,
        language: selectedLanguage === 'ur' ? 'ur' : 'en',
        template: selectedTemplate?.export_template_id || selectedTemplate?.template_id || 'modern-gradient',
        templateData: selectedTemplate || null,
        pipelineVersion: 2,
      }).catch((error) => {
        const message = error?.response?.data?.error || (error?.response?.status === 413
          ? 'Presentation is too large to export in one request. Try fewer slides.'
          : 'Failed to download PPTX');
        toast.error(message);
      });
    } else {
      toast.error('Generate slides first to export.');
    }
  };

  const handleExportPDF = () => {
    if (currentPresentationId) {
      window.open(presentationService.getExportPDFUrl(currentPresentationId), '_blank');
    } else if (slides.length > 0) {
      presentationService.downloadPublicPDF({
        title: enhancedBrief?.enhanced_topic || slides[0]?.heading || 'Presentation',
        slides,
        language: selectedLanguage === 'ur' ? 'ur' : 'en',
        template: selectedTemplate?.export_template_id || selectedTemplate?.template_id || 'modern-gradient',
        templateData: selectedTemplate || null,
        pipelineVersion: 2,
      }).catch((error) => {
        const message = error?.response?.data?.error || (error?.response?.status === 413
          ? 'Presentation is too large to export in one request. Try fewer slides.'
          : 'Failed to download PDF');
        toast.error(message);
      });
    } else {
      toast.error('Generate slides first to export.');
    }
  };

  const handleOpenEditor = () => {
    if (currentPresentationId) {
      navigate(`/editor/${currentPresentationId}`);
    } else {
      toast.error('Save first to open editor. Login required.');
    }
  };

  // Get template colors for preview
  const getTemplateColors = () => {
    if (selectedTemplate?.color_scheme) {
      return [selectedTemplate.color_scheme.primary, selectedTemplate.color_scheme.secondary];
    }
    return ['#6C63FF', '#FF6B6B'];
  };

  const templateColors = getTemplateColors();
  const currentLang = LANGUAGES.find(l => l.id === selectedLanguage);
  const isInputDisabled = ![STEP.INPUT, STEP.DONE].includes(pipelineStep);

  // ============================================================================
  // PIPELINE STEP INDICATOR
  // ============================================================================
  const PipelineSteps = () => {
    const steps = [
      { key: STEP.INPUT, label: 'Topic', num: 1 },
      { key: STEP.BRIEF_REVIEW, label: 'Brief', num: 2 },
      { key: STEP.TEMPLATE_SELECT, label: 'Template', num: 3 },
      { key: STEP.DONE, label: 'Generate', num: 4 },
    ];

    const getStepState = (step) => {
      const stepOrder = [STEP.INPUT, STEP.ENHANCING, STEP.BRIEF_REVIEW, STEP.SUGGESTING, STEP.TEMPLATE_SELECT, STEP.GENERATING, STEP.DONE];
      const currentIdx = stepOrder.indexOf(pipelineStep);
      const stepIdx = stepOrder.indexOf(step.key);
      if (stepIdx < currentIdx) return 'done';
      if (stepIdx === currentIdx || (step.key === STEP.INPUT && pipelineStep === STEP.ENHANCING) ||
          (step.key === STEP.BRIEF_REVIEW && pipelineStep === STEP.SUGGESTING) ||
          (step.key === STEP.TEMPLATE_SELECT && pipelineStep === STEP.GENERATING)) return 'active';
      return 'pending';
    };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)',
      }}>
        {steps.map((step, i) => {
          const state = getStepState(step);
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: state === 'done' ? '#22c55e' :
                    state === 'active' ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: state === 'pending' ? '2px solid var(--border-light)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: state === 'pending' ? 'var(--text-muted)' : 'white',
                  transition: 'all 0.3s',
                }}>
                  {state === 'done' ? '✓' : step.num}
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: state === 'active' ? 700 : 500,
                  color: state === 'active' ? 'var(--primary)' : state === 'done' ? '#22c55e' : 'var(--text-muted)',
                  transition: 'all 0.3s', whiteSpace: 'nowrap',
                }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginLeft: 8, borderRadius: 1,
                  background: state === 'done' ? '#22c55e' : 'var(--border-light)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar" style={{ padding: 16 }}>
          <button onClick={resetChat} className="btn btn-primary" style={{ width: '100%', marginBottom: 20, borderRadius: 'var(--radius-md)' }}>
            <FiPlus /> New Presentation
          </button>

          {/* Pipeline info */}
          {pipelineStep !== STEP.INPUT && (
            <div style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
            }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                Current Session
              </p>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>
                {enhancedBrief?.enhanced_topic?.substring(0, 40) || 'Processing...'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {pipelineStep === STEP.ENHANCING ? '⏳ Analyzing...' :
                 pipelineStep === STEP.BRIEF_REVIEW ? '📋 Review brief' :
                 pipelineStep === STEP.SUGGESTING ? '⏳ Generating templates...' :
                 pipelineStep === STEP.TEMPLATE_SELECT ? '🎨 Select template' :
                 pipelineStep === STEP.GENERATING ? '🚀 Generating slides...' :
                 pipelineStep === STEP.DONE ? '✅ Complete' : ''}
              </p>
            </div>
          )}

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Recent
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {chatHistory.length > 0 ? chatHistory.slice(0, 10).map((chat, i) => (
              <div key={chat._id || i} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem', color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'pointer', marginBottom: 4,
              }}
              onMouseEnter={e => e.target.style.background = 'var(--surface-hover)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
                <FiFileText style={{ marginRight: 8, opacity: 0.5 }} />
                {chat.title?.substring(0, 30) || 'Untitled'}
              </div>
            )) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 12px' }}>
                No recent presentations
              </p>
            )}
          </div>
        </div>

        {/* Chat Main */}
        <div className="chat-main">
          {/* Pipeline Step Indicator */}
          <PipelineSteps />

          <div className="chat-messages" style={{ padding: '24px 16px' }}>
            {messages.length === 0 && (
              <div style={{ maxWidth: 650, margin: '40px auto', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: 'white', boxShadow: '0 8px 25px rgba(108,99,255,0.3)',
                }}>🤖</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>SlideEdge AI Pipeline 🚀</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                  I create presentations in 3 smart steps:
                </p>
                <div style={{
                  display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28,
                  flexWrap: 'wrap',
                }}>
                  {['📋 Analyze Topic', '🎨 Design Template', '📊 Generate Slides'].map(s => (
                    <span key={s} style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(108,99,255,0.08)', fontSize: '0.82rem',
                      fontWeight: 600, color: 'var(--primary)',
                    }}>{s}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => handleSuggestion(s)} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      background: 'var(--surface)', border: '1px solid var(--border-light)',
                      fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left',
                      transition: 'all 0.2s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.color = 'var(--text-secondary)'; }}>
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ maxWidth: 720, margin: '0 auto 16px' }}>
                <div className={`message-bubble ${msg.role}`}>
                  <div className="message-avatar" style={{
                    background: msg.role === 'user'
                      ? 'var(--bg-secondary)'
                      : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: msg.role === 'user' ? 'var(--text-secondary)' : 'white',
                  }}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} style={{ marginBottom: line ? 6 : 0 }}>
                        {line.startsWith('**') ? <strong>{line.replace(/\*\*/g, '')}</strong> : line}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Embedded Brief Review */}
                {msg.type === 'brief' && msg.brief && pipelineStep === STEP.BRIEF_REVIEW && (
                  <div style={{ marginTop: 12, marginLeft: 48 }}>
                    <EnhancedBriefReview
                      brief={msg.brief}
                      onProceed={handleProceedToTemplates}
                    />
                  </div>
                )}

                {/* Embedded Template Selection */}
                {msg.type === 'templates' && msg.templates && pipelineStep === STEP.TEMPLATE_SELECT && (
                  <div style={{ marginTop: 12, marginLeft: 48 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 12, marginBottom: 16,
                    }}>
                      {msg.templates.map((t, ti) => (
                        <div key={ti} style={{ animationDelay: `${ti * 0.1}s` }}>
                          <TemplateSuggestionCard
                            template={t}
                            isSelected={selectedTemplate?.template_id === t.template_id}
                            onSelect={handleTemplateSelect}
                          />
                        </div>
                      ))}
                    </div>
                    {selectedTemplate && (
                      <button onClick={handleGenerateSlides} className="btn btn-primary" style={{
                        width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-md)',
                        fontWeight: 700, fontSize: '0.95rem',
                        animation: 'fadeInUp 0.3s ease-out',
                      }}>
                        <FiCheck size={18} /> Generate Presentation with "{selectedTemplate.template_name}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading States */}
            {pipelineStep === STEP.ENHANCING && (
              <div className="message-bubble assistant" style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="message-avatar" style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white',
                }}>🤖</div>
                <div className="message-content">
                  <div className="typing-dots"><span /><span /><span /></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Analyzing your topic and building a structured brief...
                  </p>
                </div>
              </div>
            )}

            {pipelineStep === STEP.SUGGESTING && (
              <div className="message-bubble assistant" style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="message-avatar" style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white',
                }}>🤖</div>
                <div className="message-content">
                  <div className="typing-dots"><span /><span /><span /></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Designing custom templates for your presentation...
                  </p>
                </div>
              </div>
            )}

            {pipelineStep === STEP.GENERATING && (
              <div style={{ maxWidth: 720, margin: '0 auto 16px' }}>
                <SlideGenerationProgress
                  step={genProgress.step}
                  currentSlide={genProgress.currentSlide}
                  totalSlides={genProgress.totalSlides}
                />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            {attachedFile && (
              <div style={{
                maxWidth: 720, margin: '0 auto 8px', padding: '8px 12px',
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease-out',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: attachedFile.type.startsWith('image/') ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: attachedFile.type.startsWith('image/') ? '#22c55e' : '#3b82f6',
                }}>
                  {attachedFile.type.startsWith('image/') ? <FiImage size={14} /> : <FiFile size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attachedFile.name}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button onClick={removeFile} style={{
                  background: 'transparent', color: 'var(--text-muted)', padding: 4,
                  borderRadius: '50%', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <FiX size={14} />
                </button>
              </div>
            )}

            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e)} />
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e)} />

              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '2px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', padding: '6px 6px 6px 8px',
                transition: 'border-color 0.2s',
                opacity: isInputDisabled ? 0.6 : 1,
                pointerEvents: isInputDisabled ? 'none' : 'auto',
              }}>
                {/* Attach Button */}
                <div className="attach-dropdown" style={{ position: 'relative' }}>
                  <button onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      background: showAttachMenu ? 'var(--surface-hover)' : 'transparent',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }} title="Attach file">
                    <FiPaperclip size={18} />
                  </button>
                  {showAttachMenu && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
                      background: 'var(--surface)', border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                      minWidth: 200, padding: 6, animation: 'fadeInUp 0.2s ease-out', zIndex: 50,
                    }}>
                      <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                        style={{
                          width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                          background: 'transparent', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><FiImage size={16} /></div>
                        <div>
                          <p style={{ fontWeight: 600 }}>Upload Image</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>JPG, PNG, GIF, WebP</p>
                        </div>
                      </button>
                      <button onClick={() => { docInputRef.current?.click(); setShowAttachMenu(false); }}
                        style={{
                          width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                          background: 'transparent', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><FiFileText size={16} /></div>
                        <div>
                          <p style={{ fontWeight: 600 }}>Upload Document</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF, Word, TXT</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Language Selector */}
                <div className="lang-dropdown" style={{ position: 'relative' }}>
                  <button onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }}
                    style={{
                      height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)',
                      background: showLangMenu ? 'var(--surface-hover)' : 'transparent',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }} title="Select language">
                    <span>{currentLang?.icon}</span>
                    <span style={{ fontSize: '0.75rem' }}>{currentLang?.flag || 'AUTO'}</span>
                    <FiChevronDown size={12} />
                  </button>
                  {showLangMenu && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
                      background: 'var(--surface)', border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                      minWidth: 180, padding: 6, animation: 'fadeInUp 0.2s ease-out', zIndex: 50,
                    }}>
                      {LANGUAGES.map(lang => (
                        <button key={lang.id}
                          onClick={() => { setSelectedLanguage(lang.id); setShowLangMenu(false); }}
                          style={{
                            width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                            background: lang.id === selectedLanguage ? 'var(--surface-hover)' : 'transparent',
                            color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem', textAlign: 'left', transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = lang.id === selectedLanguage ? 'var(--surface-hover)' : 'transparent'}>
                          <span style={{ fontSize: '1.1rem' }}>{lang.icon}</span>
                          <span style={{ fontWeight: lang.id === selectedLanguage ? 700 : 400 }}>{lang.label}</span>
                          {lang.id === selectedLanguage && (
                            <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '0.8rem' }}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slide Count Selector */}
                <select
                  value={selectedSlideCount}
                  onChange={(e) => setSelectedSlideCount(Number(e.target.value))}
                  style={{
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0 8px',
                    outline: 'none',
                  }}
                  title="Number of slides"
                >
                  {SLIDE_COUNTS.map((count) => (
                    <option key={count} value={count}>{count} slides</option>
                  ))}
                </select>

                {/* Text Input */}
                <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    pipelineStep === STEP.DONE ? 'Start a new presentation topic...' :
                    selectedLanguage === 'ur' ? 'اپنا موضوع لکھیں...' :
                    'Describe your presentation topic...'
                  }
                  style={{
                    flex: 1, padding: '10px 0', border: 'none', outline: 'none',
                    background: 'transparent', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontFamily: 'inherit',
                    direction: selectedLanguage === 'ur' ? 'rtl' : 'ltr',
                  }}
                />

                <button onClick={handleSend} disabled={isInputDisabled || !input.trim()} className="btn btn-primary"
                  style={{
                    borderRadius: 'var(--radius-md)', padding: '10px 20px',
                    opacity: (!input.trim() || isInputDisabled) ? 0.5 : 1,
                    flexShrink: 0,
                  }}>
                  <FiSend size={16} />
                  {pipelineStep === STEP.DONE ? 'New' : 'Generate'}
                </button>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
              3-Step Pipeline: Analyze → Real PPTX Template → Generate • Text via RapidAPI • Images via Pixabay
            </p>
          </div>
        </div>

        {/* Slide Preview Panel */}
        <div className="chat-preview" style={{ padding: 0 }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-secondary)',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Slide Preview</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {slides.length > 0 && (
                <>
                  <button onClick={handleExportPPTX} className="btn-icon btn-ghost"
                    style={{ width: 32, height: 32, fontSize: '0.85rem' }} title="Download PPTX">
                    <FiDownload />
                  </button>
                  <button onClick={handleExportPDF} className="btn-icon btn-ghost"
                    style={{ width: 32, height: 32, fontSize: '0.85rem' }} title="Download PDF">
                    <FiFileText />
                  </button>
                  <button onClick={() => { setPresenterSlide(0); setShowPresenter(true); }} className="btn-icon btn-ghost"
                    style={{ width: 32, height: 32, fontSize: '0.85rem' }} title="Present fullscreen">
                    <FiMaximize2 />
                  </button>
                  {currentPresentationId && (
                    <button onClick={handleOpenEditor} className="btn-icon btn-ghost"
                      style={{ width: 32, height: 32, fontSize: '0.85rem', color: 'var(--primary)' }} title="Open Editor">
                      <FiEdit3 />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slides.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80 }}>
                <FiFileText style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: 8 }} />
                <p>Slides will appear here</p>
                <p style={{ fontSize: '0.78rem', marginTop: 6 }}>
                  {pipelineStep === STEP.INPUT ? 'Enter a topic to get started' :
                   pipelineStep === STEP.BRIEF_REVIEW ? 'Review your brief, then choose a template' :
                   pipelineStep === STEP.TEMPLATE_SELECT ? 'Select a template to generate slides' :
                   pipelineStep === STEP.GENERATING ? 'Generating your slides...' :
                   'Complete the pipeline to see slides'}
                </p>
              </div>
            ) : (
              slides.map((slide, idx) => (
                <div key={idx} className="slide-preview-card" style={{
                  animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s backwards`,
                  border: editingSlide === idx ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                }} onClick={() => setEditingSlide(editingSlide === idx ? null : idx)}>
                  {/* Slide Thumbnail */}
                  <div className="slide-thumb" style={{
                    background: slide.slide_type === 'title' || slide.layout === 'title' || slide.layout === 'full-bleed-image'
                      ? `linear-gradient(135deg, ${templateColors[0]}, ${templateColors[1]})`
                      : slide.slide_type === 'section-divider' || slide.layout === 'section-divider'
                      ? `linear-gradient(135deg, ${templateColors[0]}dd, ${templateColors[1]}dd)`
                      : 'var(--surface)',
                    padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {slide.imageUrl && (
                      <img src={slide.imageUrl} alt="" style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        opacity: (slide.slide_type === 'title' || slide.layout === 'title') ? 0.3 : 0.15,
                      }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <h4 style={{
                        fontSize: (slide.slide_type === 'title' || slide.layout === 'title') ? '0.95rem' : '0.8rem',
                        fontWeight: 700,
                        color: (slide.slide_type === 'title' || slide.slide_type === 'section-divider' || slide.layout === 'title' || slide.layout === 'section-divider')
                          ? 'white' : 'var(--text-primary)',
                        marginBottom: 4,
                      }}>{slide.heading}</h4>
                      {slide.subtitle && (
                        <p style={{
                          fontSize: '0.7rem',
                          color: (slide.slide_type === 'title' || slide.slide_type === 'section-divider')
                            ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                          marginBottom: 2,
                        }}>{slide.subtitle}</p>
                      )}
                      {slide.slide_type !== 'title' && slide.slide_type !== 'section-divider' &&
                        slide.layout !== 'title' && slide.layout !== 'section-divider' &&
                        slide.bullets?.slice(0, 2).map((b, bi) => (
                        <p key={bi} style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>• {b}</p>
                      ))}
                    </div>

                    {/* Slide type badge */}
                    {slide.slide_type && slide.slide_type !== 'content' && (
                      <span style={{
                        position: 'absolute', top: 6, right: 6,
                        fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px',
                        borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.2)',
                        color: 'white', textTransform: 'uppercase',
                      }}>{slide.slide_type}</span>
                    )}
                  </div>

                  {/* Card Info */}
                  <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {slide.heading}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', background: 'var(--bg-secondary)',
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      color: 'var(--text-muted)', flexShrink: 0,
                    }}>Slide {idx + 1}</span>
                  </div>

                  {/* Inline Editor */}
                  {editingSlide === idx && (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}
                         onClick={e => e.stopPropagation()}>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Heading</label>
                        <input className="input" style={{ fontSize: '0.85rem', padding: '8px 10px', marginTop: 4 }}
                          value={slide.heading} onChange={e => updateSlide(idx, 'heading', e.target.value)} />
                      </div>
                      {slide.subtitle !== undefined && (
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtitle</label>
                          <input className="input" style={{ fontSize: '0.85rem', padding: '8px 10px', marginTop: 4 }}
                            value={slide.subtitle || ''} onChange={e => updateSlide(idx, 'subtitle', e.target.value)} />
                        </div>
                      )}
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Content</label>
                        <textarea className="input" rows={2} style={{ fontSize: '0.85rem', padding: '8px 10px', marginTop: 4, resize: 'vertical' }}
                          value={slide.content} onChange={e => updateSlide(idx, 'content', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bullet Points</label>
                        {slide.bullets?.map((b, bi) => (
                          <input key={bi} className="input" style={{ fontSize: '0.8rem', padding: '6px 10px', marginTop: 4 }}
                            value={b} onChange={e => updateBullet(idx, bi, e.target.value)} />
                        ))}
                        <button onClick={() => addBullet(idx)} className="btn btn-sm btn-ghost" style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--primary)' }}>
                          + Add Point
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Presenter Mode */}
      {showPresenter && slides.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPresenter(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100vw', height: '100vh', position: 'relative',
            background: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].layout === 'title' ||
                        slides[presenterSlide].slide_type === 'section-divider' || slides[presenterSlide].layout === 'section-divider')
              ? `linear-gradient(135deg, ${templateColors[0]}, ${templateColors[1]})`
              : 'white',
          }}>
            {slides[presenterSlide].layout !== 'title' && slides[presenterSlide].slide_type !== 'title' &&
             slides[presenterSlide].slide_type !== 'section-divider' && (
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
                background: `linear-gradient(to bottom, ${templateColors[0]}, ${templateColors[1]})`,
              }} />
            )}
            {slides[presenterSlide].imageUrl && (
              <img src={slides[presenterSlide].imageUrl} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.15,
              }} />
            )}
            <div style={{
              position: 'relative', zIndex: 2, height: '100%', padding: '6% 10%',
              display: 'flex', flexDirection: 'column',
              justifyContent: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                ? 'center' : 'flex-start',
              alignItems: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                ? 'center' : 'flex-start',
              textAlign: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                ? 'center' : 'left',
            }}>
              <h1 style={{
                fontSize: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                  ? '4rem' : '2.5rem',
                fontWeight: 800, marginBottom: 20,
                color: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                  ? 'white' : '#1e1e2e',
              }}>{slides[presenterSlide].heading}</h1>
              {slides[presenterSlide].subtitle && (
                <p style={{
                  fontSize: '1.5rem', marginBottom: 16,
                  color: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                    ? 'rgba(255,255,255,0.85)' : '#777',
                  fontWeight: 300,
                }}>{slides[presenterSlide].subtitle}</p>
              )}
              {slides[presenterSlide].content && (
                <p style={{
                  fontSize: '1.3rem', lineHeight: 1.7, marginBottom: 24, maxWidth: '70%',
                  color: (slides[presenterSlide].slide_type === 'title' || slides[presenterSlide].slide_type === 'section-divider')
                    ? 'rgba(255,255,255,0.85)' : '#555',
                }}>{slides[presenterSlide].content}</p>
              )}
              {slides[presenterSlide].bullets?.length > 0 &&
                slides[presenterSlide].slide_type !== 'title' &&
                slides[presenterSlide].slide_type !== 'section-divider' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {slides[presenterSlide].bullets.map((b, i) => (
                    <div key={i} style={{ fontSize: '1.2rem', color: '#333', display: 'flex', gap: 12 }}>
                      <span style={{ color: templateColors[0], fontWeight: 700 }}>●</span> {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 16, padding: '8px 20px',
              background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)', color: 'white',
            }}>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.max(0, prev - 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px' }}>←</button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{presenterSlide + 1} / {slides.length}</span>
              <button onClick={(e) => { e.stopPropagation(); setPresenterSlide(prev => Math.min(slides.length - 1, prev + 1)); }}
                style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', padding: '4px 12px' }}>→</button>
              <button onClick={() => setShowPresenter(false)}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: '0.8rem' }}>ESC</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
