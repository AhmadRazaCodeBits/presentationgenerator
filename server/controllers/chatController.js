import ChatHistory from '../models/ChatHistory.js';
import Presentation from '../models/Presentation.js';
import GenerationStat from '../models/GenerationStat.js';
import aiService from '../services/openaiService.js';
import pipeline from '../services/presentationPipeline.js';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/json',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Use images, PDFs, JSON, or Word docs.'));
    }
  },
});

async function fetchUrlContext(message) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlRegex);

  if (urls && urls.length > 0) {
    const targetUrl = urls[0];
    console.log(`🌐 Found URL in message: ${targetUrl}. Fetching data...`);
    try {
      const response = await axios.get(targetUrl, { timeout: 10000 });
      let dataStr = '';
      if (typeof response.data === 'object') {
        dataStr = JSON.stringify(response.data, null, 2);
      } else {
        dataStr = String(response.data);
      }

      const maxCharLimit = 15000;
      if (dataStr.length > maxCharLimit) {
        dataStr = dataStr.substring(0, maxCharLimit) + '\n... [truncated due to size]';
      }

      return `[Data fetched from URL: ${targetUrl}]\n${dataStr}`;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch from URL: ${targetUrl}. Error: ${err.message}`);
      return `[Warning: Failed to fetch from URL: ${targetUrl} due to error: ${err.message}]`;
    }
  }
  return '';
}

export const generateSlides = async (req, res, next) => {
  try {
    const {
      message, chatId, template, language, slideCount,
      role, tone, audience, structure, depth, presType, statsLevel,
      speakerNotes, visualHints, animHints, includeQA, includeKey,
    } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build user prompt with language preference
    let userPrompt = message;
    const languageLabel = language === 'ur' ? 'Urdu' : language === 'en' ? 'English' : 'Auto Detect';
    if (language === 'ur') {
      userPrompt = `[Target Language: Urdu]
IMPORTANT: Even if the user input is in English, translate and generate ALL slide text in Urdu script only.
The correct Urdu translation for "Artificial Intelligence" is "مصنوعی ذہانت" (never translate it as "صنعتی ذہانت").
Do not use English words in titles, headings, content, bullets, subtitles, or speaker notes.
Use natural Urdu phrasing and RTL-friendly wording for headings, content, bullets, and speaker notes.
For simple educational topics, create a complete teaching-style deck: title, introduction, definition, types/categories, how it works, important fields, everyday examples, domain uses, benefits, disadvantages/risks, future, conclusion, and thank-you/questions.
Use complete Urdu sentences with enough detail. Do not create tiny generic bullets like "اہم حقیقت", "عملی اثر", or "واضح مثال".
Keep imageQuery in English only.

User topic: ${message}`;
    } else if (language === 'en') {
      userPrompt = `[Generate this presentation in ${languageLabel}] ${message}`;
    }

    // Fetch URL context if any URL is in the message
    const urlContext = await fetchUrlContext(message);
    if (urlContext) {
      userPrompt = `${userPrompt}\n\nFetched context from URL:\n${urlContext}`;
    }

    // If file is uploaded, extract text context from it
    let fileContext = '';
    if (req.file) {
      const filePath = req.file.path;
      const mime = req.file.mimetype;

      if (mime === 'text/plain' || mime === 'application/json') {
        fileContext = fs.readFileSync(filePath, 'utf-8');
      } else if (mime.startsWith('image/')) {
        // Pass image to Gemini for understanding
        fileContext = `[User uploaded an image: ${req.file.originalname}. Use this as visual context for the presentation.]`;
      } else if (mime === 'application/pdf' || mime.includes('word')) {
        fileContext = `[User uploaded a document: ${req.file.originalname}. The document content should inform the presentation structure and content.]`;
      }

      if (fileContext) {
        userPrompt = `${userPrompt}\n\nAttached file context:\n${fileContext}`;
      }
    }

    // Generate slides via AI (pass file for Gemini multimodal if image)
    let fileForAI = null;
    if (req.file && req.file.mimetype.startsWith('image/')) {
      fileForAI = {
        path: req.file.path,
        mimeType: req.file.mimetype,
      };
    }

    const result = await aiService.generateSlides(userPrompt, [], fileForAI, {
      role,
      tone,
      audience,
      structure,
      depth,
      presType,
      statsLevel,
      speakerNotes,
      visualHints,
      animHints,
      includeQA,
      includeKey,
      slideCount: Number(slideCount) || undefined,
      targetLanguage: language || 'auto',
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to generate slides' });
    }

    // Fetch stock images for each slide from Pixabay
    const slidesWithImages = await Promise.all(
      result.data.slides.map(async (slide) => {
        try {
          const imageUrl = await fetchPixabayImage(slide.imageQuery);
          return { ...slide, imageUrl };
        } catch {
          return slide;
        }
      })
    );
    result.data.slides = slidesWithImages;

    // Save presentation if user is authenticated
    let presentation = null;
    const assistantSummary = `Generated "${result.title}" with ${result.data.slides.length} slides.`;

    if (req.user) {
      presentation = await Presentation.create({
        userId: req.user._id,
        title: result.data.title,
        language: result.data.language,
        template: template || 'modern-gradient',
        slides: result.data.slides,
        twoslidesJobId: result.twoslidesJobId || '',
        twoslidesFileLocalPath: result.twoslidesFileLocalPath || '',
      });

      // Update analytics: increment daily generation and template usage
      try {
        const today = new Date().toISOString().slice(0, 10);
        const tpl = presentation.template || 'modern-gradient';
        await GenerationStat.findOneAndUpdate(
          { date: today },
          { $inc: { total: 1, [`templateCounts.${tpl}`]: 1 } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } catch (analyticsErr) {
        console.warn('⚠️ Analytics update failed:', analyticsErr.message);
      }

      // Save chat history
      let chat;
      if (chatId) {
        chat = await ChatHistory.findById(chatId);
        if (chat) {
          chat.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: assistantSummary }
          );
          chat.presentationId = presentation._id;
          await chat.save();
        }
      }
      if (!chat) {
        chat = await ChatHistory.create({
          userId: req.user._id,
          presentationId: presentation._id,
          title: result.data.title,
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: assistantSummary },
          ],
        });
      }

      result.chatId = chat._id;
      result.presentationId = presentation._id;
    }

    // Clean up uploaded file
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.json(result);
  } catch (error) {
    // Clean up on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(error);
  }
};

export const chatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const result = await aiService.chat(message);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const chats = await ChatHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title createdAt messages');
    res.json({ chats });
  } catch (error) {
    next(error);
  }
};

export const getChatById = async (req, res, next) => {
  try {
    const chat = await ChatHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    next(error);
  }
};

async function fetchPixabayImage(query) {
  const key = process.env.PIXABAY_API_KEY;
  const baseUrl = (process.env.PIXABAY_API_URL || 'https://pixabay.com/api/').replace(/\/$/, '');
  const safeSearch = String(process.env.PIXABAY_SAFESEARCH || 'true').toLowerCase() !== 'false';
  const perPage = Math.max(3, Math.min(20, Number(process.env.PIXABAY_PER_PAGE || 8)));

  let searchText = (query || 'business presentation').trim();
  try {
    searchText = await pipeline.refineImagePrompt(searchText);
  } catch (err) {
    console.warn('⚠️ Image prompt refinement failed in controller:', err.message);
  }

  const seed = Math.abs(searchText.split('').reduce((a, b) => a + b.charCodeAt(0), 0));

  if (!key) {
    return `https://picsum.photos/seed/${seed}/800/450`;
  }

  try {
    const response = await axios.get(`${baseUrl}/`, {
      params: {
        key,
        q: searchText,
        image_type: 'photo',
        orientation: 'horizontal',
        safesearch: safeSearch,
        per_page: perPage,
      },
      timeout: 10000,
    });

    if (Array.isArray(response.data?.hits) && response.data.hits.length > 0) {
      const hit = response.data.hits[0];
      return hit.largeImageURL || hit.webformatURL || hit.previewURL;
    }
  } catch (e) {
    console.warn('⚠️ Pixabay request in controller failed:', e.message);
  }

  return `https://picsum.photos/seed/${seed}/800/450`;
}

// ============================================================================
// PIPELINE STEP 1 — Enhance Topic
// ============================================================================
export const enhanceTopic = async (req, res, next) => {
  try {
    const { message, slideCount, language } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Extract text context from file if uploaded
    let fileContext = '';
    if (req.file) {
      const filePath = req.file.path;
      const mime = req.file.mimetype;

      if (mime === 'text/plain' || mime === 'application/json') {
        fileContext = fs.readFileSync(filePath, 'utf-8');
      } else if (mime.startsWith('image/')) {
        fileContext = `[User uploaded an image: ${req.file.originalname}. Use this as visual context for the presentation.]`;
      } else if (mime === 'application/pdf' || mime.includes('word')) {
        fileContext = `[User uploaded a document: ${req.file.originalname}. The document content should inform the presentation structure and content.]`;
      }
    }

    // Fetch URL context if any URL is in the message
    const urlContext = await fetchUrlContext(message);

    console.log('🚀 Pipeline Step 1: Preparing topic brief...');
    let combinedMessage = message;
    if (fileContext) {
      combinedMessage = `${combinedMessage}\n\nAttached file context:\n${fileContext}`;
    }
    if (urlContext) {
      combinedMessage = `${combinedMessage}\n\nFetched context from URL:\n${urlContext}`;
    }

    const brief = await pipeline.enhanceTopic(combinedMessage, {
      slideCount: Number(slideCount) || 10,
      language: language || 'auto',
    });
    console.log('✅ Topic brief prepared:', brief.enhanced_topic);

    // Clean up uploaded file
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.json({ success: true, brief });
  } catch (error) {
    // Clean up on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('❌ Step 1 failed:', error?.response?.status || error.message);
    // If upstream service returned a status, forward appropriate status and message
    const upstreamStatus = error?.response?.status;
    if (upstreamStatus) {
      return res.status(upstreamStatus).json({ error: `Upstream AI service error (${upstreamStatus})` });
    }
    res.status(500).json({ error: `Pipeline Error: ${error.message}` });
  }
};

// ============================================================================
// PIPELINE STEP 2 — Suggest Templates
// ============================================================================
export const suggestTemplates = async (req, res, next) => {
  try {
    const { brief, query } = req.body;
    if (!brief || !brief.enhanced_topic) {
      return res.status(400).json({ error: 'Enhanced brief is required' });
    }

    console.log('🎨 Pipeline Step 2: Suggesting templates with query override:', query || 'none');
    const templates = await pipeline.suggestTemplates(brief, query);
    console.log(`✅ ${templates.length} templates suggested`);

    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Step 2 failed:', error.message);
    res.status(500).json({ error: `Pipeline Error: ${error.message}` });
  }
};

// ============================================================================
// PIPELINE STEP 3+4 — Generate Slides + Images
// ============================================================================
export const generatePipelineSlides = async (req, res, next) => {
  try {
    const { brief, template } = req.body;
    const {
      role, language, slideCount,
      tone, audience, structure, depth,
      presType, statsLevel,
      speakerNotes, visualHints, animHints, includeQA, includeKey
    } = req.body;

    if (!brief || !template) {
      return res.status(400).json({ error: 'Brief and template are required' });
    }

    console.log('📊 Pipeline Step 3+4: Generating full deck...');
    const result = await pipeline.generateFullDeck(brief, template, {
      role,
      language,
      slideCount,
      tone,
      audience,
      structure,
      depth,
      presType,
      statsLevel,
      speakerNotes,
      visualHints,
      animHints,
      includeQA,
      includeKey
    });
    console.log(`✅ Full deck generated: ${result.slides.length} slides`);

    // Map pipeline slide format to our DB-compatible format
    const toSlideSummary = (s, bullets) => {
      const directSummary = typeof s.subtitle === 'string' && s.subtitle.trim()
        ? s.subtitle.trim()
        : (typeof s.summary === 'string' && s.summary.trim() ? s.summary.trim() : '');
      const contentText = typeof s.content === 'string' ? s.content.trim() : '';
      if (directSummary) return directSummary;
      if (contentText && !bullets.includes(contentText) && contentText !== bullets.join('\n')) {
        return contentText;
      }
      return '';
    };

    const dbSlides = result.slides.map((s, i) => {
      let bullets = [];
      
      if (Array.isArray(s.content)) {
        bullets = s.content;
      } else if (Array.isArray(s.body_text)) {
        bullets = s.body_text;
      } else if (Array.isArray(s.bullets)) {
        bullets = s.bullets;
      } else {
        const contentStr = s.content || '';
        bullets = typeof contentStr === 'string'
          ? contentStr.split('\n').map(item => item.trim()).filter(Boolean)
          : [];
      }
      bullets = bullets.map(item => String(item || '').trim()).filter(Boolean);
      const contentStr = toSlideSummary(s, bullets);

      return {
        order: s.slideNumber || s.slide_number || i + 1,
        heading: s.title || s.heading || `Slide ${i + 1}`,
        content: contentStr,
        subtitle: s.subtitle || '',
        bullets: bullets,
        notes: s.speakerNotes || s.speaker_notes || s.notes || '',
        imageUrl: s.imageUrl || '',
        imageQuery: s.imageQuery || s.image_prompt || s.image_query || '',
        image_position: s.image_position || 'none',
        slide_type: s.slideType || s.slide_type || 'content',
        layout: s.layout || 'content',
        data_visual: {
          type: s.visualType || s.data_visual?.type || 'none',
          data: s.data_visual?.data || {},
          insight_label: s.keyTakeaway || s.data_visual?.insight_label || '',
        },
        design_notes: s.design_notes || { background_color: '', text_color: '', emphasis_word: '' },
      };
    });

    // Save presentation if user is authenticated
    let presentationId = null;
    let chatId = null;

    if (req.user) {
      const presentation = await Presentation.create({
        userId: req.user._id,
        title: result.title,
        language: result.language,
        template: template.export_template_id || template.template_id || 'modern-gradient',
        templateData: template,
        enhancedBrief: brief,
        slides: dbSlides,
        status: 'completed',
        pipelineVersion: 2,
        twoslidesJobId: result.twoslidesJobId || '',
        twoslidesFileLocalPath: result.twoslidesFileLocalPath || '',
      });
      presentationId = presentation._id;

      // Update analytics: increment daily generation and template usage
      try {
        const today = new Date().toISOString().slice(0, 10);
        const tpl = presentation.template || (template.export_template_id || template.template_id) || 'modern-gradient';
        await GenerationStat.findOneAndUpdate(
          { date: today },
          { $inc: { total: 1, [`templateCounts.${tpl}`]: 1 } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } catch (analyticsErr) {
        console.warn('⚠️ Analytics update failed:', analyticsErr.message);
      }

      // Save chat history
      const chat = await ChatHistory.create({
        userId: req.user._id,
        presentationId: presentation._id,
        title: result.title,
        messages: [
          { role: 'user', content: brief.enhanced_topic },
          { role: 'assistant', content: `Generated "${result.title}" with ${dbSlides.length} slides.` },
        ],
      });
      chatId = chat._id;
    }

    res.json({
      success: true,
      data: {
        title: result.title,
        language: result.language,
        slides: dbSlides,
        template: template,
      },
      presentationId,
      chatId,
    });
  } catch (error) {
    console.error('❌ Pipeline Step 3+4 failed:', error.message);
    res.status(500).json({ error: `Pipeline Error: ${error.message}` });
  }
};
