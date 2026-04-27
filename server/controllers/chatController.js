import ChatHistory from '../models/ChatHistory.js';
import Presentation from '../models/Presentation.js';
import aiService from '../services/openaiService.js';
import pipeline from '../services/presentationPipeline.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Use images, PDFs, or Word docs.'));
    }
  },
});

export const generateSlides = async (req, res, next) => {
  try {
    const { message, chatId, template, language } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build user prompt with language preference
    let userPrompt = message;
    if (language === 'ur') {
      userPrompt = `[Generate this presentation in Urdu language with RTL support] ${message}`;
    } else if (language === 'en') {
      userPrompt = `[Generate this presentation in English] ${message}`;
    }

    // If file is uploaded, extract text context from it
    let fileContext = '';
    if (req.file) {
      const filePath = req.file.path;
      const mime = req.file.mimetype;

      if (mime === 'text/plain') {
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

    const result = await aiService.generateSlides(userPrompt, [], fileForAI);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to generate slides' });
    }

    // Generate images for each slide using Gemini text model
    const slidesWithImages = await Promise.all(
      result.data.slides.map(async (slide) => {
        try {
          const imageUrl = await generateImageWithGemini(slide.imageQuery);
          return { ...slide, imageUrl };
        } catch {
          return slide;
        }
      })
    );
    result.data.slides = slidesWithImages;

    // Save presentation if user is authenticated
    let presentation = null;
    if (req.user) {
      presentation = await Presentation.create({
        userId: req.user._id,
        title: result.data.title,
        language: result.data.language,
        template: template || 'modern-gradient',
        slides: result.data.slides,
      });

      // Save chat history
      let chat;
      if (chatId) {
        chat = await ChatHistory.findById(chatId);
        if (chat) {
          chat.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: JSON.stringify(result.data) }
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
            { role: 'assistant', content: JSON.stringify(result.data) },
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

// Generate image using Gemini text model with image output capability
async function generateImageWithGemini(query) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return fetchUnsplashImage(query);
  }

  // Try multiple Gemini models that support image generation (in priority order)
  const imageModels = [
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash-preview-04-17',
  ];

  const genAI = new GoogleGenerativeAI(geminiKey);

  for (const modelName of imageModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const prompt = `Generate a high-quality, professional, photorealistic image for a presentation slide about: "${query}". 
The image should be:
- Landscape orientation (16:9 aspect ratio)
- Clean, modern, corporate/business style
- Suitable for professional presentations
- Vivid colors with good contrast
- NO text, NO watermarks, NO logos in the image
Just generate the image, no explanation needed.`;

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Extract image from response parts
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log(`✅ Image generated with ${modelName} for: "${query.substring(0, 40)}..."`);
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${modelName} image generation failed:`, error.message?.substring(0, 80));
      continue;
    }
  }

  console.warn('⚠️ All Gemini image models failed, falling back to Unsplash.');
  return fetchUnsplashImage(query);
}

// Unsplash fallback for images
async function fetchUnsplashImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || accessKey === 'your_unsplash_access_key_here') {
    // Use picsum.photos as a reliable fallback (no API key needed)
    const seed = Math.abs(query.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
    return `https://picsum.photos/seed/${seed}/800/450`;
  }
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    }
  } catch { /* fallback */ }
  const seed = Math.abs(query.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  return `https://picsum.photos/seed/${seed}/800/450`;
}

// ============================================================================
// PIPELINE STEP 1 — Enhance Topic
// ============================================================================
export const enhanceTopic = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🚀 Pipeline Step 1: Enhancing topic...');
    const brief = await pipeline.enhanceTopic(message);
    console.log('✅ Topic enhanced:', brief.enhanced_topic);

    res.json({ success: true, brief });
  } catch (error) {
    console.error('❌ Step 1 failed:', error.message);
    res.status(500).json({ error: `Pipeline Error: ${error.message}` });
  }
};

// ============================================================================
// PIPELINE STEP 2 — Suggest Templates
// ============================================================================
export const suggestTemplates = async (req, res, next) => {
  try {
    const { brief } = req.body;
    if (!brief || !brief.enhanced_topic) {
      return res.status(400).json({ error: 'Enhanced brief is required' });
    }

    console.log('🎨 Pipeline Step 2: Suggesting templates...');
    const templates = await pipeline.suggestTemplates(brief);
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
    if (!brief || !template) {
      return res.status(400).json({ error: 'Brief and template are required' });
    }

    console.log('📊 Pipeline Step 3+4: Generating full deck...');
    const result = await pipeline.generateFullDeck(brief, template);
    console.log(`✅ Full deck generated: ${result.slides.length} slides`);

    // Map pipeline slide format to our DB-compatible format
    const dbSlides = result.slides.map((s, i) => ({
      order: s.slide_number || i + 1,
      heading: s.title || `Slide ${i + 1}`,
      content: (s.body_text || []).join('\n'),
      subtitle: s.subtitle || '',
      bullets: s.body_text || [],
      notes: s.speaker_notes || '',
      imageUrl: s.imageUrl || '',
      imageQuery: s.image_prompt || '',
      image_position: s.image_position || 'none',
      slide_type: s.slide_type || 'content',
      layout: s.layout || 'content',
      data_visual: s.data_visual || { type: 'none', data: {}, insight_label: '' },
      design_notes: s.design_notes || { background_color: '', text_color: '', emphasis_word: '' },
    }));

    // Save presentation if user is authenticated
    let presentationId = null;
    let chatId = null;

    if (req.user) {
      const presentation = await Presentation.create({
        userId: req.user._id,
        title: result.title,
        language: result.language,
        template: template.template_name || 'custom',
        templateData: template,
        enhancedBrief: brief,
        slides: dbSlides,
        status: 'completed',
        pipelineVersion: 2,
      });
      presentationId = presentation._id;

      // Save chat history
      const chat = await ChatHistory.create({
        userId: req.user._id,
        presentationId: presentation._id,
        title: result.title,
        messages: [
          { role: 'user', content: brief.enhanced_topic },
          { role: 'assistant', content: JSON.stringify({ title: result.title, slideCount: dbSlides.length }) },
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

