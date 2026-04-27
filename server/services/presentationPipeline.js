import axios from 'axios';
import { getTemplateCatalog, getTemplateById } from './templateCatalog.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureEnvLoaded() {
  const hasRapid = !!(process.env.RAPIDAPI_API_URL && process.env.RAPIDAPI_HOST && process.env.RAPIDAPI_KEY);
  if (hasRapid) return;

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];

  for (const envPath of candidates) {
    dotenv.config({ path: envPath });
    if (process.env.RAPIDAPI_API_URL && process.env.RAPIDAPI_HOST && process.env.RAPIDAPI_KEY) {
      break;
    }
  }
}

// ============================================================================
// STEP 1 — Prompt Enhancer
// ============================================================================
const ENHANCE_PROMPT = (userInput, options = {}) => `You are a professional presentation strategist and content architect.

A user wants to create a PowerPoint presentation. Your job is to enhance their rough topic/idea into a detailed, structured presentation brief.

User's raw input: "${userInput}"

Required slide count: ${options.slideCount || '10'}

Return a JSON object with this structure:
{
  "enhanced_topic": "A polished, specific version of the topic",
  "target_audience": "Who this presentation is for",
  "tone": "professional | academic | creative | corporate | storytelling",
  "key_message": "The single most important takeaway",
  "suggested_slide_count": 10,
  "sections": [
    {
      "section_title": "string",
      "purpose": "what this section achieves",
      "suggested_slides": 2
    }
  ],
  "data_points_to_include": ["list of statistics, facts, or comparisons to research"],
  "visual_themes": ["suggested visual directions e.g. minimalist, bold, data-heavy"],
  "color_mood": "e.g. corporate blue, warm earthy, vibrant tech"
}

Return ONLY the raw JSON object. Do not wrap in markdown or backticks.`;

// ============================================================================
// STEP 2 — Template Suggester
// ============================================================================
const TEMPLATE_RANK_PROMPT = (briefJSON, templateCatalog) => `You are a PowerPoint design expert.

Based on this presentation brief:
${JSON.stringify(briefJSON)}

Available real PPTX templates:
${JSON.stringify(templateCatalog.map(t => ({
  template_id: t.template_id,
  template_name: t.template_name,
  best_for: t.best_for,
  description: t.description,
  visual_style: t.visual_style,
  layout_pattern: t.layout_pattern,
})))}

Select exactly 4 template IDs that best match the brief.

Return a JSON array of template IDs only:
["modern-gradient", "ocean-breeze", "minimal-clean", "sunset-warm"]

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`;

// ============================================================================
// STEP 3 — Slide Content Generator
// ============================================================================
const SLIDE_CONTENT_PROMPT = (briefJSON, templateJSON, desiredCount) => `You are a professional presentation writer and visual designer.

Presentation Brief:
${JSON.stringify(briefJSON)}

Chosen Template:
${JSON.stringify(templateJSON)}

Generate a complete slide deck. Return a JSON array where each object is one slide:

[
  {
    "slide_number": 1,
    "slide_type": "title | content | data | image-focus | quote | section-divider | closing",
    "layout": "full-bleed-image | image-left-text-right | text-left-image-right | top-image-bottom-text | icon-grid | full-text | chart-left-text-right | split-stats",
    "title": "Slide headline (max 8 words, punchy)",
    "subtitle": "Optional subtitle or tagline (max 12 words)",
    "body_text": [
      "Bullet point or paragraph 1 (max 15 words)",
      "Bullet point or paragraph 2 (max 15 words)",
      "Bullet point or paragraph 3 (max 15 words)"
    ],
    "speaker_notes": "What the presenter should say on this slide (2-4 sentences)",
    "image_prompt": "A detailed image generation prompt for the visual on this slide. Be specific: style, subject, lighting, color palette, mood. No text in image.",
    "image_position": "left | right | top | bottom | background | none",
    "data_visual": {
      "type": "bar-chart | pie-chart | line-chart | stat-callout | comparison-table | none",
      "data": {},
      "insight_label": "One-line takeaway from the data"
    },
    "design_notes": {
      "background_color": "use template primary/secondary/accent",
      "text_color": "contrast color from template",
      "emphasis_word": "one word in title to bold/accent-color"
    }
  }
]

Rules:
- Generate EXACTLY ${desiredCount} slides
- Alternate image positions across slides (left → right → left) to create visual rhythm
- Every 3rd slide should be a data or stat slide
- Use the section-divider layout between major sections
- The closing slide must have a strong CTA or summary
- Keep body text SHORT — presentations are visual, not documents

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`;

class PresentationPipeline {
  constructor() {
    this._initialized = false;
    this.rapidConfig = null;
    this.rapidGeminiConfig = null;
    this.genAI = null;
  }

  _ensureInit() {
    if (this._initialized) return;
    this._initialized = true;

    ensureEnvLoaded();
    
    this.rapidConfig = {
      baseUrl: (process.env.RAPIDAPI_API_URL || '').replace(/\/$/, ''),
      host: process.env.RAPIDAPI_HOST || '',
      key: process.env.RAPIDAPI_KEY || '',
      model: process.env.RAPIDAPI_MODEL || 'conversationgpt4-2',
      timeoutMs: Number(process.env.RAPIDAPI_REQUEST_TIMEOUT || 60) * 1000,
    };

    this.rapidGeminiConfig = {
      baseUrl: (process.env.RAPIDAPI_GEMINI_API_URL || (process.env.RAPIDAPI_GEMINI_HOST ? `https://${process.env.RAPIDAPI_GEMINI_HOST}` : '')).replace(/\/$/, ''),
      host: process.env.RAPIDAPI_GEMINI_HOST || '',
      key: process.env.RAPIDAPI_GEMINI_KEY || process.env.RAPIDAPI_GEMINI_RAPIDAPI_KEY || '',
      model: process.env.RAPIDAPI_GEMINI_MODEL || 'gemini-1.5-pro',
      timeoutMs: Number(process.env.RAPIDAPI_REQUEST_TIMEOUT || 60) * 1000,
    };

    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (this.rapidConfig.baseUrl && this.rapidConfig.host && this.rapidConfig.key) {
      console.log(`🔗 PresentationPipeline: RapidAPI connected (${this.rapidConfig.host})`);
    } else {
      console.warn('⚠️  PresentationPipeline: RapidAPI env is incomplete.');
    }
  }

  _parseJSON(text) {
    let jsonStr = text.trim();
    // Strip markdown code fences if model accidentally wrapped it
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    
    // Fallback: aggressively extract from first bracket to last bracket
    const startObj = jsonStr.indexOf('{');
    const startArr = jsonStr.indexOf('[');
    let startIdx = -1;
    if (startObj !== -1 && startArr !== -1) startIdx = Math.min(startObj, startArr);
    else startIdx = Math.max(startObj, startArr);

    if (startIdx !== -1) {
      const endChar = jsonStr[startIdx] === '[' ? ']' : '}';
      const endIdx = jsonStr.lastIndexOf(endChar);
      if (endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON Parsing Error on string:\n", jsonStr.substring(0, 200) + "...");
      throw e;
    }
  }

  _extractTextFromRapidResponse(data) {
    if (!data) return '';

    if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    const candidates = [
      data.result,
      data.response,
      data.message,
      data.content,
      data.output,
      data.text,
      data.generated_text,
      data?.data?.result,
      data?.data?.message,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    return '';
  }

  _buildRapidEndpoints(config) {
    return [
      config.baseUrl,
      `${config.baseUrl}/chat/completions`,
      `${config.baseUrl}/chat`,
      `${config.baseUrl}/conversationgpt4`,
      `${config.baseUrl}/text`,
      `${config.baseUrl}/generate`,
    ];
  }

  async _postToRapidApiWithConfig(payload, config) {
    if (!config?.baseUrl || !config?.host || !config?.key) {
      throw new Error('RapidAPI config incomplete');
    }

    const endpoints = this._buildRapidEndpoints(config);

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const payloadWithModel = {
          ...payload,
          model: payload?.model || config.model,
        };

        const resp = await axios.post(endpoint, payloadWithModel, {
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': config.key,
            'x-rapidapi-host': config.host,
          },
          timeout: config.timeoutMs,
        });

        const text = this._extractTextFromRapidResponse(resp.data);
        if (text) return text;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('RapidAPI request failed');
  }

  async _postToRapidApi(payload) {
    let primaryError = null;

    try {
      return await this._postToRapidApiWithConfig(payload, this.rapidConfig);
    } catch (error) {
      primaryError = error;
    }

    const shouldUseGeminiRapidFallback =
      !!(this.rapidGeminiConfig?.baseUrl && this.rapidGeminiConfig?.host && this.rapidGeminiConfig?.key) &&
      [429, 402, 403].includes(Number(primaryError?.response?.status));

    if (shouldUseGeminiRapidFallback) {
      const fallbackPayload = {
        ...payload,
        model: this.rapidGeminiConfig.model,
      };

      try {
        console.warn('⚠️ Primary RapidAPI exhausted, retrying with RapidAPI Gemini host...');
        return await this._postToRapidApiWithConfig(fallbackPayload, this.rapidGeminiConfig);
      } catch {
        // fall through to existing fallback below
      }
    }

    throw primaryError || new Error('RapidAPI request failed');
  }

  async _generate(prompt) {
    this._ensureInit();
    if (!this.rapidConfig?.baseUrl || !this.rapidConfig?.host || !this.rapidConfig?.key) {
      this._initialized = false;
      this._ensureInit();
    }

    if (!this.rapidConfig?.baseUrl || !this.rapidConfig?.host || !this.rapidConfig?.key) {
      throw new Error('RapidAPI config missing (RAPIDAPI_API_URL, RAPIDAPI_HOST, RAPIDAPI_KEY)');
    }

    const payload = {
      model: this.rapidConfig.model,
      temperature: 0.55,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'Return only valid JSON unless user asks plain text.' },
        { role: 'user', content: prompt },
      ],
    };

    try {
      return await this._postToRapidApi(payload);
    } catch (error) {
      if (!this.genAI) {
        throw error;
      }

      console.warn('⚠️ RapidAPI failed, falling back to Gemini for pipeline:', error?.response?.status || error.message);
      const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  }

  // ============================================================================
  // STEP 1 — Enhance Topic
  // ============================================================================
  async enhanceTopic(userInput, options = {}) {
    const normalizedSlideCount = Math.max(4, Math.min(20, Number(options.slideCount) || 10));
    let brief;

    try {
      const text = await this._generate(ENHANCE_PROMPT(userInput, {
        slideCount: normalizedSlideCount,
        language: options.language || 'auto',
      }));
      brief = this._parseJSON(text);
    } catch (error) {
      console.warn('⚠️ Enhance topic fallback used:', error?.response?.status || error.message);
      brief = this._buildFallbackBrief(userInput, normalizedSlideCount);
    }

    if (!brief.enhanced_topic || !brief.sections || !Array.isArray(brief.sections)) {
      throw new Error('Invalid enhanced brief structure');
    }

    brief.suggested_slide_count = normalizedSlideCount;
    brief.language_preference = options.language || 'auto';
    brief.tone = brief.tone || 'professional';
    brief.target_audience = brief.target_audience || 'General audience';
    brief.visual_themes = brief.visual_themes || ['minimalist'];
    brief.color_mood = brief.color_mood || 'corporate blue';
    brief.data_points_to_include = brief.data_points_to_include || [];

    return brief;
  }

  // ============================================================================
  // STEP 2 — Suggest Real PPTX Templates
  // ============================================================================
  async suggestTemplates(enhancedBrief) {
    const catalog = getTemplateCatalog();
    let rankedIds = catalog.slice(0, 4).map(t => t.template_id);

    try {
      const text = await this._generate(TEMPLATE_RANK_PROMPT(enhancedBrief, catalog));
      const parsed = this._parseJSON(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rankedIds = parsed.filter(id => typeof id === 'string');
      }
    } catch (error) {
      console.warn('⚠️ Template ranking fallback used:', error.message);
    }

    const selected = [];
    for (const templateId of rankedIds) {
      const template = getTemplateById(templateId);
      if (template && !selected.find(t => t.template_id === template.template_id)) {
        selected.push(template);
      }
      if (selected.length === 4) break;
    }

    if (selected.length < 4) {
      for (const template of catalog) {
        if (!selected.find(t => t.template_id === template.template_id)) {
          selected.push(template);
        }
        if (selected.length === 4) break;
      }
    }

    return selected;
  }

  // ============================================================================
  // STEP 3 — Generate Slide Content
  // ============================================================================
  async generateSlideContent(enhancedBrief, selectedTemplate) {
    const desiredCount = Math.max(4, Math.min(20, Number(enhancedBrief?.suggested_slide_count) || 10));
    let slides = [];

    try {
      const text = await this._generate(SLIDE_CONTENT_PROMPT(enhancedBrief, selectedTemplate, desiredCount));
      slides = this._parseJSON(text);
      if (!Array.isArray(slides) || slides.length === 0) {
        throw new Error('Invalid slides response');
      }
    } catch (error) {
      console.warn('⚠️ Slide content fallback used:', error?.response?.status || error.message);
      slides = this._buildFallbackSlides(enhancedBrief, desiredCount);
    }

    const normalizedSlides = slides.slice(0, desiredCount);
    while (normalizedSlides.length < desiredCount) {
      normalizedSlides.push({
        slide_number: normalizedSlides.length + 1,
        slide_type: normalizedSlides.length === desiredCount - 1 ? 'closing' : 'content',
        layout: 'full-text',
        title: `Slide ${normalizedSlides.length + 1}`,
        subtitle: '',
        body_text: [],
        speaker_notes: '',
        image_prompt: enhancedBrief?.enhanced_topic || 'professional business presentation',
        image_position: 'none',
        data_visual: { type: 'none', data: {}, insight_label: '' },
        design_notes: { background_color: '', text_color: '', emphasis_word: '' },
      });
    }

    return normalizedSlides.map((s, i) => ({
      slide_number: s.slide_number || i + 1,
      slide_type: s.slide_type || 'content',
      layout: s.layout || 'full-text',
      title: s.title || `Slide ${i + 1}`,
      subtitle: s.subtitle || '',
      body_text: Array.isArray(s.body_text) ? s.body_text : [],
      speaker_notes: s.speaker_notes || '',
      image_prompt: s.image_prompt || '',
      image_position: s.image_position || 'none',
      data_visual: {
        type: s.data_visual?.type || 'none',
        data: s.data_visual?.data || {},
        insight_label: s.data_visual?.insight_label || '',
      },
      design_notes: {
        background_color: s.design_notes?.background_color || '',
        text_color: s.design_notes?.text_color || '',
        emphasis_word: s.design_notes?.emphasis_word || '',
      },
    }));
  }

  _buildFallbackBrief(userInput, slideCount) {
    const topic = userInput?.trim() || 'Presentation Topic';
    const sections = [
      { section_title: 'Introduction', purpose: 'Set context and define the topic scope.', suggested_slides: 1 },
      { section_title: 'Current Landscape', purpose: 'Explain background, trends, and key drivers.', suggested_slides: 2 },
      { section_title: 'Core Analysis', purpose: 'Present key ideas, insights, and practical implications.', suggested_slides: Math.max(2, Math.floor(slideCount / 3)) },
      { section_title: 'Recommendations', purpose: 'Provide clear, actionable next steps.', suggested_slides: 1 },
      { section_title: 'Conclusion', purpose: 'Summarize takeaways and close with impact.', suggested_slides: 1 },
    ];

    return {
      enhanced_topic: topic,
      target_audience: 'General professional audience',
      tone: 'professional',
      key_message: `A structured understanding of ${topic} helps improve decisions and outcomes.`,
      suggested_slide_count: slideCount,
      sections,
      data_points_to_include: [
        'Relevant market trend or growth statistic',
        'A before/after comparison',
        'A performance or impact KPI',
      ],
      visual_themes: ['minimalist', 'data-driven'],
      color_mood: 'corporate blue',
      language_preference: 'auto',
    };
  }

  _buildFallbackSlides(brief, desiredCount) {
    const topic = brief?.enhanced_topic || 'Presentation Topic';
    const titleSlide = {
      slide_number: 1,
      slide_type: 'title',
      layout: 'full-bleed-image',
      title: topic,
      subtitle: brief?.key_message || 'Professional presentation overview',
      body_text: [],
      speaker_notes: `Introduce ${topic} and explain the objective of this presentation.`,
      image_prompt: `${topic} professional business background`,
      image_position: 'background',
      data_visual: { type: 'none', data: {}, insight_label: '' },
      design_notes: { background_color: '', text_color: '', emphasis_word: '' },
    };

    const sectionNames = Array.isArray(brief?.sections) && brief.sections.length > 0
      ? brief.sections.map((s) => s.section_title)
      : ['Introduction', 'Analysis', 'Recommendations', 'Conclusion'];

    const slides = [titleSlide];
    for (let i = 2; i <= desiredCount; i++) {
      const isLast = i === desiredCount;
      const sectionTitle = sectionNames[(i - 2) % sectionNames.length];
      slides.push({
        slide_number: i,
        slide_type: isLast ? 'closing' : (i % 3 === 0 ? 'data' : 'content'),
        layout: i % 2 === 0 ? 'text-left-image-right' : 'image-left-text-right',
        title: isLast ? 'Conclusion & Next Steps' : `${sectionTitle}: Key Point ${i - 1}`,
        subtitle: isLast ? 'Action plan' : '',
        body_text: isLast
          ? ['Recap the most important insights', 'Define immediate next actions', 'Set measurable success criteria']
          : ['Clarify the main idea in one sentence', 'Provide one practical implication', 'Support with one clear example'],
        speaker_notes: isLast
          ? 'Summarize the presentation and propose concrete next steps.'
          : `Discuss how this point relates to ${topic} and why it matters.`,
        image_prompt: `${topic} ${sectionTitle} professional photo`,
        image_position: i % 2 === 0 ? 'right' : 'left',
        data_visual: {
          type: i % 3 === 0 ? 'stat-callout' : 'none',
          data: i % 3 === 0 ? { metric: 'KPI', value: 'Value' } : {},
          insight_label: i % 3 === 0 ? 'This metric highlights impact.' : '',
        },
        design_notes: { background_color: '', text_color: '', emphasis_word: '' },
      });
    }

    return slides;
  }

  // ============================================================================
  // STEP 4 — Extract Keywords & Search Pixabay
  // ============================================================================
  async refineImagePrompt(rawPrompt) {
    if (!rawPrompt || rawPrompt.trim() === '') return rawPrompt;
    try {
      const refined = await this._generate(`Extract 2 or 3 highly relevant search keywords from this presentation slide's image prompt. The keywords should be suitable for a Pixabay stock photo search.
      
      Prompt: "${rawPrompt}"
      Return ONLY the 2-3 keywords, separated by spaces. No punctuation.`);
      return refined.replace(/^["']|["']$/g, '').trim();
    } catch {
      return rawPrompt.split(' ').slice(0, 3).join(' ');
    }
  }

  async generateSlideImages(slides) {
    const pixabayKey = process.env.PIXABAY_API_KEY;
    const pixabayBase = (process.env.PIXABAY_API_URL || 'https://pixabay.com/api/').replace(/\/$/, '');
    const perPage = Math.max(3, Math.min(20, Number(process.env.PIXABAY_PER_PAGE || 8)));
    const safeSearch = String(process.env.PIXABAY_SAFESEARCH || 'true').toLowerCase() !== 'false';

    const results = await Promise.allSettled(
      slides.map(async (slide) => {
        if (!slide.image_prompt || slide.image_position === 'none') {
          return { ...slide, imageUrl: '' };
        }

        // Refine the prompt to 2-3 snappy keywords for Pixabay
        const searchKeywords = await this.refineImagePrompt(slide.image_prompt);
        const encodedQuery = encodeURIComponent(searchKeywords || 'business presentation');
        
        let imageUrl = '';
        try {
          if (!pixabayKey) {
            throw new Error('PIXABAY_API_KEY missing');
          }

          const resp = await axios.get(
            `${pixabayBase}/?key=${pixabayKey}&q=${encodedQuery}&image_type=photo&orientation=horizontal&safesearch=${safeSearch}&per_page=${perPage}`,
            { timeout: 10000 }
          );
          
          if (resp.data && resp.data.hits && resp.data.hits.length > 0) {
            // Grab the highest resolution preview available directly via URL
            imageUrl = resp.data.hits[0].largeImageURL || resp.data.hits[0].webformatURL;
          } else {
            console.warn(`⚠️ No Pixabay results for query: "${searchKeywords}"`);
            imageUrl = `https://picsum.photos/seed/${encodeURIComponent(searchKeywords)}/800/450`;
          }
        } catch (e) {
          console.warn('⚠️ Pixabay fallback failed:', e.message);
          imageUrl = `https://picsum.photos/seed/${encodeURIComponent(searchKeywords)}/800/450`;
        }

        // Convert the final URL to base64 buffer for PPTX reliability
        try {
          if (imageUrl.startsWith('http')) {
            const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
            const b64 = Buffer.from(imgResp.data).toString('base64');
            const mime = imgResp.headers['content-type'] || 'image/jpeg';
            imageUrl = `data:${mime};base64,${b64}`;
          }
        } catch (e) {
          console.warn('⚠️ Fetching image buffer failed:', e.message);
        }

        return { ...slide, imageUrl, refined_image_prompt: searchKeywords };
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(`⚠️ Image generation failed for slide ${i + 1}:`, r.reason?.message);
      return { ...slides[i], imageUrl: '' };
    });
  }

  // ============================================================================
  // Full Pipeline 
  // ============================================================================
  async generateFullDeck(enhancedBrief, selectedTemplate) {
    console.log('📝 Step 3: Generating slide content...');
    const slides = await this.generateSlideContent(enhancedBrief, selectedTemplate);
    console.log(`✅ Generated ${slides.length} slides`);

    console.log('🖼️ Step 4: Finding images via Pixabay...');
    const slidesWithImages = await this.generateSlideImages(
      slides
    );
    console.log('✅ Image search complete');

    return {
      title: enhancedBrief.enhanced_topic,
      language: this._detectLanguage(enhancedBrief.enhanced_topic),
      slides: slidesWithImages,
      template: selectedTemplate,
      brief: enhancedBrief,
    };
  }

  _detectLanguage(text) {
    const urduRegex = /[\u0600-\u06FF]/;
    return urduRegex.test(text) ? 'ur' : 'en';
  }
}

export default new PresentationPipeline();
