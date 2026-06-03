import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import twoSlidesService from './twoSlidesService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureEnvLoaded() {
  const hasPrimary = !!process.env.OPENAI_API_KEY;
  if (hasPrimary) return;

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];

  for (const envPath of candidates) {
    dotenv.config({ path: envPath });
    if (process.env.OPENAI_API_KEY) {
      break;
    }
  }
}

// System prompt for slide generation
const SLIDE_SYSTEM_PROMPT = `You are an expert Presentation Architect, Instructional Designer, Business Consultant, Graphic Designer, Data Storyteller, and Content Research Specialist.

Your responsibility is to generate COMPLETE professional presentations from a user's prompt, not merely summarize text.

Your task is to generate a high-quality presentation that looks like it was created by a professional consultant or designer.

---

## CRITICAL LANGUAGE RULES

### English Mode
Generate ALL content in English. Use professional business language. Use concise slide text. Avoid unnecessary paragraphs. Maintain presentation tone.

### Urdu Mode
CRITICAL: Think and write natively in Urdu from scratch. Do NOT write in English first and then translate. Every sentence must read as fluent, natural Urdu — the kind a professional Urdu columnist would write.
Avoid:
- Broken half-sentences or sentence fragments
- Mixing English words into Urdu text (e.g. "domestک" is WRONG)
- Generic filler like "یہ ایک اہم موضوع ہے"
- Repeating the same point in different words across slides

Require:
- Each bullet must be a complete, meaningful Urdu sentence with a concrete fact, insight, or recommendation
- For economic/country topics, include concrete angles: growth rate (شرح نمو), inflation (مہنگائی), fiscal deficit (مالی خسارہ), external accounts (بیرونی کھاتے), remittances (ترسیلات زر), sector performance (شعبہ جاتی کارکردگی), reforms (اصلاحات)
- Use proper Urdu economic vocabulary: GDP = مجموعی ملکی پیداوار, inflation = مہنگائی, exports = برآمدات, imports = درآمدات, budget = بجٹ, tax = ٹیکس, debt = قرض, interest rate = شرح سود, exchange rate = شرح تبادلہ, investment = سرمایہ کاری

Generate ALL content strictly in Urdu script. The correct Urdu translation for "Artificial Intelligence" is "مصنوعی ذہانت" (never translate it as "صنعتی ذہانت"). Do NOT use English words. Translate headings, bullet points, descriptions, image captions, charts, labels, and callouts. Never mix English and Urdu. Convert common acronyms like GDP, KPI, ROI, AI, ML, and API into Urdu equivalents. Every slide must remain in a single language. Keep imageQuery in English for stock photo search.

Example of a GOOD Urdu slide (for reference):
{
  "slideNumber": 2,
  "slideType": "content",
  "layout": "Two Column Layout",
  "title": "پاکستان کی معاشی صورتحال",
  "subtitle": "مجموعی ملکی پیداوار اور شرح نمو کا جائزہ",
  "content": [
    "پاکستان کی مجموعی ملکی پیداوار تقریباً 340 ارب ڈالر ہے جو جنوبی ایشیا میں پانچویں نمبر پر ہے",
    "مالی سال 2024 میں حقیقی شرح نمو 2.4 فیصد رہی جو گزشتہ سال کے منفی 0.2 فیصد سے بہتر ہے",
    "خدمات کا شعبہ مجموعی ملکی پیداوار کا 52 فیصد، صنعت 20 فیصد اور زراعت 23 فیصد حصہ رکھتی ہے",
    "فی کس آمدنی تقریباً 1,400 ڈالر ہے جو خطے کے دیگر ممالک سے کم ہے"
  ],
  "imageRequired": true,
  "imageQuery": "Pakistan economy GDP growth chart professional",
  "visualType": "stat-callout",
  "speakerNotes": "مجموعی ملکی پیداوار کے اعداد و شمار پیش کریں اور شرح نمو کے رجحان پر توجہ دلائیں۔",
  "keyTakeaway": "معاشی بحالی کے آثار نظر آ رہے ہیں مگر رفتار سست ہے"
}

---

## PRESENTATION GENERATION PHILOSOPHY
Do not create slides from a template. Create a unique presentation structure according to the Topic, Audience, Goal, Industry, and Complexity.
Different topics require different slide structures, e.g.:
- Startup Pitch: Problem → Solution → Market → Product → Revenue → Competitors → Roadmap
- Business Proposal: Overview → Current Situation → Solution → Benefits → Cost → Timeline
- Educational Topic: Introduction → Concepts → Examples → Applications → Summary
- Research Topic: Background → Methodology → Findings → Analysis → Conclusion

---

## CONTENT QUALITY RULES
Generate original content. Avoid generic AI phrases such as "In today's world", "Nowadays", "It is important to note", "In conclusion". Every slide should contain useful, highly specific information. Each slide should answer: "Why does this slide exist?". If it doesn't provide value, remove it.
Do not invent presenter names, dates, or placeholders like "Your Name" or "Date" unless the user explicitly provided them.
If the user provides a slide-by-slide outline (e.g., "Slide 1:" or "سلائیڈ 1:"), follow it closely, preserve the order and intent, and keep the provided titles/bullets with only light polishing. Do not add extra slides or dummy content.

For simple educational topics where the user only gives a topic name, create a complete teaching-style presentation, not a short executive summary. Use this general flow when suitable:
Title, introduction, definition, types/categories, how it works, important fields/components, everyday examples, domain uses, benefits, disadvantages/risks, future, conclusion, and thank-you/questions.
If the requested slide count is 10 or more, cover these sections across separate slides. If fewer slides are requested, merge related sections while keeping the learning flow. For Urdu educational decks, use complete Urdu sentences and 3-5 useful bullet points per content slide. Do not produce vague bullets like "اہم حقیقت", "عملی اثر", or "واضح مثال".

---

## PROFESSIONAL SLIDE COUNT
Generate slide decks according to these lengths:
- Short Presentation: 6-8 Slides
- Standard Presentation: 10-15 Slides
- Detailed Presentation: 15-25 Slides
- Executive Presentation: 8-12 Slides

---

## SLIDE DESIGN INTELLIGENCE & LAYOUTS
For every slide, determine the appropriate Slide Type, Layout Type, and Visual Requirement.
Possible Layouts:
1. Title Slide
2. Two Column Layout (Left: Text, Right: Image)
3. Image Left Layout (Left: Image, Right: Content)
4. Feature Grid
5. Comparison Layout
6. Timeline Layout
7. Statistics Layout
8. Process Flow Layout
9. SWOT Layout
10. Pyramid Layout
11. Roadmap Layout
12. Full Data Layout
13. Conclusion Layout

Do NOT use background images. Images must appear inside dedicated image containers. Prefer the "Text | Image" layout instead of image as background.

---

## IMAGE GENERATION STRATEGY
For every slide, determine if an image is needed. If needed, generate a specific, vivid stock photo imageQuery in English suitable for Pixabay (e.g., "Pakistani business team meeting", "modern AI technology office"). Never place images behind text. Use 50% text / 50% image or 60% text / 40% image layout.

---

## VISUAL HIERARCHY
Use the "content" array for bullet points only. Put a short context line in "subtitle"; do not repeat bullet text as a paragraph.
Each slide should contain: Title, Subtitle (optional), Main Content (bullets), Visual Element (if applicable), and Key Takeaway. Avoid dense paragraphs. Maximum 5 bullet points per slide, with a maximum of 12 words per bullet.
For Urdu educational presentations, bullets may be up to 22 Urdu words when needed for a complete sentence.

---

## MODERN DESIGN THEMES
Themes affect fonts, colors, icons, and layout:
- Corporate Blue | Modern Startup | Minimal White | Executive Dark | Education Clean | Technology Gradient | Financial Professional | Healthcare Modern | Marketing Creative

---

## ADVANCED CONTENT ENRICHMENT
Generate relevant statistics, market insights, examples, comparisons, case studies, timelines, frameworks, and best practices. Avoid fluff.

---

## PRESENTATION FLOW VALIDATION
Verify that the story flow is logical, slides are not repetitive, content is language-consistent, images support content, layouts are diversified, titles are unique, speaker notes exist, and key takeaways exist.

---

## RESPOND IN THIS EXACT JSON FORMAT (no markdown, no explanation, ONLY JSON):
{
  "title": "Compelling Presentation Title",
  "language": "en" or "ur",
  "slides": [
    {
      "slideNumber": 1,
      "slideType": "title | content | data | image-focus | quote | section-divider | closing",
      "layout": "Title Slide | Two Column Layout | Image Left Layout | Feature Grid | Comparison Layout | Timeline Layout | Statistics Layout | Process Flow Layout | SWOT Layout | Pyramid Layout | Roadmap Layout | Full Data Layout | Conclusion Layout",
      "title": "Slide title (max 8 words)",
      "subtitle": "Slide subtitle (optional)",
      "content": [
        "Bullet point 1 (max 12 words)",
        "Bullet point 2 (max 12 words)",
        "Bullet point 3 (max 12 words)"
      ],
      "imageRequired": true,
      "imageQuery": "specific vivid stock photo query in English only",
      "visualType": "bar-chart | pie-chart | line-chart | stat-callout | comparison-table | none",
      "speakerNotes": "Talking points for the presenter (2-3 sentences)",
      "keyTakeaway": "Key insight takeaway from this slide"
    }
  ]
}`;

// Role-specific system prompts to guide assistant behavior
const ROLE_PROMPTS = {
  Researcher: `You are a Researcher: gather accurate facts, cite sources when possible, prioritize verifiable data and statistics. Return concise references alongside facts.`,
  ContentWriter: `You are a Content Writer: produce concise, slide-ready copy. Use clear headings and short bullets suitable for presentation slides.`,
  SlideDesigner: `You are a Slide Designer: enforce 1 idea per slide, concise bullets (max 10 words), and suggest layouts and visuals for each slide.`,
  DataAnalyst: `You are a Data Analyst: propose charts, key metrics, and short interpretations. When given numbers, suggest the best visual (bar/line/pie).`,
  ImageSuggester: `You are an Image Suggester: produce vivid, specific imageQuery strings optimized for stock photo searches.`,
  Editor: `You are an Editor: tighten language to be clear, formal, and concise. Reduce redundancy and enforce slide constraints.`,
  PresenterCoach: `You are a Presenter Coach: write 2-3 sentence speaker notes focusing on delivery, emphasis, and transitions.`,
};

class AIService {
  constructor() {
    this.openaiConfig = this._getOpenAIConfig();
    this.providers = this._initProviders();
  }

  _refreshConfigIfNeeded() {
    ensureEnvLoaded();
    this.openaiConfig = this._getOpenAIConfig();

    const hasOpenAI = !!this.openaiConfig.apiKey;
    const shouldRefreshProviders =
      this.providers.length === 0 ||
      (hasOpenAI && !this.providers.find((p) => p.name === 'openai')) ||
      (!this.providers.find((p) => p.name === 'twoslides'));

    if (shouldRefreshProviders) {
      this.providers = this._initProviders();
    }
  }

  _getOpenAIConfig() {
    ensureEnvLoaded();

    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    return {
      apiKey,
      model,
    };
  }

  _initProviders() {
    const priorityStr =
      process.env.AI_PROVIDER_FAILOVER_ORDER ||
      process.env.AI_PROVIDER_PRIORITY ||
      'openai,twoslides';
    const priority = priorityStr.split(',').map(p => p.trim());
    const providers = [];

    for (const provider of priority) {
      if (provider === 'openai' && this.openaiConfig.apiKey) {
        providers.push({
          name: 'openai',
          generate: this._generateWithOpenAI.bind(this),
        });
      }

      if (provider === 'twoslides') {
        providers.push({
          name: 'twoslides',
          generate: twoSlidesService.generateSlides.bind(twoSlidesService),
        });
      }
    }

    if (providers.length === 0) {
      console.warn('⚠️  No AI providers configured. Add OPENAI_API_KEY to .env');
    } else {
      console.log(`🤖 AI Providers: ${providers.map(p => p.name).join(' → ')}`);
    }

    return providers;
  }

  async generateSlides(userMessage, chatHistory = [], file = null, options = {}) {
    this._refreshConfigIfNeeded();

    if (this.providers.length === 0) {
      throw new Error('AI Generation Service is not configured. Please add OPENAI_API_KEY to your environment.');
    }

    let lastError = null;
    for (const provider of this.providers) {
      try {
        console.log(`🔄 Trying ${provider.name}...`);
        const result = await provider.generate(userMessage, chatHistory, file, options);
        console.log(`✅ ${provider.name} succeeded`);
        return result;
      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    console.warn('⚠️ All AI providers failed. Using local fallback builder...');
    return this._getFallbackResponse(userMessage, options);
  }

  _buildSlidePrompt(userMessage, options = {}) {
    const requestedCount = Number(options.slideCount);
    const countInstruction = Number.isFinite(requestedCount) && requestedCount > 0
      ? `Generate exactly ${requestedCount} slides.`
      : 'Generate 8-12 slides.';
    const langInstruction = this._buildLanguageInstruction(options);

    return `${SLIDE_SYSTEM_PROMPT}\n\nAdditional requirement: ${countInstruction}\n${langInstruction}\n\nUser Request: ${userMessage}\n\nGenerate the presentation JSON:`;
  }

  _buildLanguageInstruction(options = {}) {
    const target = String(options.targetLanguage || '').trim().toLowerCase();
    if (target === 'ur') {
      return `Language requirement: Output ALL slide text fields (title, heading, content, bullets, notes, speakerNotes, keyTakeaway) strictly in Urdu script only.
CRITICAL: Do NOT think in English and translate. Write directly in Urdu as a native Urdu speaker would.
Do not use any English words or transliterations in visible slide text.
Convert all acronyms: GDP → مجموعی ملکی پیداوار, KPI → کلیدی کارکردگی پیمانہ, ROI → سرمایہ کاری پر منافع, AI → مصنوعی ذہانت, ML → مشین لرننگ.
Each bullet must be a complete, meaningful Urdu sentence — not a half-translated fragment.
Keep only imageQuery in English.`;
    }
    if (target === 'en') {
      return 'Language requirement: Output all slide text fields in English.';
    }
    return 'Language requirement: Auto-detect from user intent.';
  }

  _containsLatinScript(value) {
    return /[A-Za-z]/.test(String(value || ''));
  }

  _payloadHasLatinText(value) {
    if (value == null) return false;
    if (typeof value === 'string') return this._containsLatinScript(value);
    if (Array.isArray(value)) return value.some((item) => this._payloadHasLatinText(item));
    if (typeof value === 'object') return Object.values(value).some((item) => this._payloadHasLatinText(item));
    return false;
  }

  _visibleSlideTextHasLatinText(payload) {
    const slides = Array.isArray(payload?.slides) ? payload.slides : [];
    const deckFields = [payload?.title];

    const slideHasLatin = slides.some((slide) => {
      const visibleFields = [
        slide?.heading,
        slide?.title,
        slide?.subtitle,
        slide?.content,
        slide?.notes,
        slide?.speaker_notes,
        ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
        ...(Array.isArray(slide?.body_text) ? slide.body_text : []),
      ];

      return visibleFields.some((value) => this._payloadHasLatinText(value));
    });

    return deckFields.some((value) => this._payloadHasLatinText(value)) || slideHasLatin;
  }

  _replaceLatinTermsForUrdu(value) {
    if (typeof value !== 'string' || !this._containsLatinScript(value)) return value;

    const replacements = [
      [/artificial intelligence/gi, 'مصنوعی ذہانت'],
      [/machine learning/gi, 'مشین لرننگ'],
      [/deep learning/gi, 'گہری تعلیم'],
      [/\bAI\b/g, 'مصنوعی ذہانت'],
      [/\bML\b/g, 'مشین لرننگ'],
      [/\bKPI\b/g, 'اہم پیمانہ'],
      [/\bROI\b/g, 'سرمایہ کاری کا فائدہ'],
      [/\bAPI\b/g, 'اطلاقی رابطہ'],
      [/\bdata\b/gi, 'ڈیٹا'],
      [/\bdigital\b/gi, 'ڈیجیٹل'],
      [/\bonline\b/gi, 'آن لائن'],
      [/\bsmart\b/gi, 'ذہین'],
      [/\btechnology\b/gi, 'ٹیکنالوجی'],
      [/\btech\b/gi, 'ٹیکنالوجی'],
      [/\bbusiness\b/gi, 'کاروبار'],
      [/\bmarketing\b/gi, 'تشہیر'],
      [/\bsales\b/gi, 'فروخت'],
      [/\beducation\b/gi, 'تعلیم'],
      [/\bstudents?\b/gi, 'طلبہ'],
      [/\bteachers?\b/gi, 'اساتذہ'],
      [/\blearning\b/gi, 'سیکھنا'],
      [/\bframework\b/gi, 'فریم ورک'],
      [/\bcloud\b/gi, 'کلاؤڈ'],
      [/\bsoftware\b/gi, 'سافٹ ویئر'],
      [/\bteams?\b/gi, 'ٹیم'],
    ];

    let output = value;
    for (const [pattern, replacement] of replacements) {
      output = output.replace(pattern, replacement);
    }

    // Don't blindly replace remaining English words with 'اصطلاح' —
    // that creates broken mixed-script words like 'domestک'.
    // Instead, just clean up extra spaces and return.
    return output
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  _sanitizeUrduVisibleTextPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    return {
      ...payload,
      title: this._replaceLatinTermsForUrdu(payload.title),
      slides: Array.isArray(payload.slides)
        ? payload.slides.map((slide) => ({
          ...slide,
          heading: this._replaceLatinTermsForUrdu(slide.heading),
          title: this._replaceLatinTermsForUrdu(slide.title),
          subtitle: this._replaceLatinTermsForUrdu(slide.subtitle),
          content: this._replaceLatinTermsForUrdu(slide.content),
          bullets: Array.isArray(slide.bullets)
            ? slide.bullets.map((item) => this._replaceLatinTermsForUrdu(item))
            : slide.bullets,
          body_text: Array.isArray(slide.body_text)
            ? slide.body_text.map((item) => this._replaceLatinTermsForUrdu(item))
            : slide.body_text,
          notes: this._replaceLatinTermsForUrdu(slide.notes),
          speaker_notes: this._replaceLatinTermsForUrdu(slide.speaker_notes),
        }))
        : payload.slides,
    };
  }

  _buildUrduRepairPrompt(payload, userMessage) {
    return `Rewrite the following JSON so every visible text field is in Urdu script only.
Do not use English words in title, heading, subtitle, content, bullets, notes, or any presenter-facing text.
Preserve the JSON structure, keys, slide order, layout, slide_type, imageUrl, and machine-readable enum values.
Keep imageQuery in English.
Return only raw JSON.

User topic: ${userMessage}

JSON to rewrite:
${JSON.stringify(payload)}`;
  }

  async _generateWithOpenAI(userMessage, chatHistory = [], file = null, options = {}) {
    if (file?.path) {
      console.warn('OpenAI provider currently ignores file attachments and uses text context only.');
    }

    const openai = new OpenAI({
      apiKey: this.openaiConfig.apiKey,
    });
    const prompt = this._buildSlidePrompt(userMessage, options);
    const completion = await openai.chat.completions.create({
      model: this.openaiConfig.model,
      temperature: 0.7,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: `${ROLE_PROMPTS[options.role] || ''}\nReturn only valid JSON, without markdown formatting.` },
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    return this._parseAIResponse(text, userMessage, options);
  }

  _parseAIResponse(text, userMessage, options = {}) {
    // Extract JSON from response (handle markdown code blocks and alternative shapes)
    let jsonStr = String(text || '');
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

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
      const data = JSON.parse(jsonStr);

      // If the model returned an array (slides only), wrap into an object
      const payload = Array.isArray(data) ? { title: '', slides: data } : data;

      if (!payload.slides || !Array.isArray(payload.slides)) {
        throw new Error('Invalid response structure: slides array missing');
      }

      const normalizeSlide = (slide, index) => {
        // Accept multiple possible key names coming from different prompts/providers
        const heading = slide.title || slide.heading || slide.order_title || slide.headline || `Slide ${index + 1}`;
        
        let bullets = [];
        let contentStr = '';
        
        if (Array.isArray(slide.content)) {
          bullets = slide.content;
          contentStr = slide.content.join('\n');
        } else if (Array.isArray(slide.bullets)) {
          bullets = slide.bullets;
          contentStr = slide.content || slide.bullets.join('\n');
        } else if (Array.isArray(slide.body_text)) {
          bullets = slide.body_text;
          contentStr = slide.content || slide.body_text.join('\n');
        } else {
          contentStr = slide.content || '';
          bullets = typeof contentStr === 'string' ? contentStr.split('\n').filter(Boolean) : [];
        }

        const notes = slide.speakerNotes || slide.notes || slide.speaker_notes || '';
        const imageQuery = slide.imageQuery || slide.image_query || slide.image_prompt || slide.imagePrompt || userMessage;
        const layout = slide.layout || slide.slide_type || 'content';
        const slide_type = slide.slideType || slide.slide_type || 'content';
        
        // Handle visual type and takeaways
        const visualType = slide.visualType || (slide.data_visual && slide.data_visual.type) || 'none';
        const keyTakeaway = slide.keyTakeaway || (slide.data_visual && slide.data_visual.insight_label) || '';

        const normalizedBullets = Array.isArray(bullets)
          ? bullets.map(item => String(item || '').trim()).filter(Boolean)
          : (typeof bullets === 'string' ? bullets.split('\n').map(item => item.trim()).filter(Boolean) : []);
        const subtitleSummary = typeof slide.subtitle === 'string' ? slide.subtitle.trim() : '';
        const stringContent = typeof slide.content === 'string' ? slide.content.trim() : '';
        const summary = subtitleSummary || (
          stringContent && !normalizedBullets.includes(stringContent) && stringContent !== normalizedBullets.join('\n')
            ? stringContent
            : ''
        );

        return {
          order: slide.slideNumber || slide.order || slide.slide_number || index + 1,
          heading,
          content: summary,
          bullets: normalizedBullets,
          notes,
          imageQuery,
          imageUrl: '',
          layout,
          slide_type,
          data_visual: {
            type: visualType,
            data: (slide.data_visual && slide.data_visual.data) || {},
            insight_label: keyTakeaway,
          }
        };
      };

      const title = payload.title || payload.deck_title || payload.presentation_title || (payload.slides[0] && (payload.slides[0].title || payload.slides[0].heading)) || userMessage;

      const normalizedSlides = payload.slides.map((s, i) => normalizeSlide(s, i));
      const resolvedLanguage = this._resolveOutputLanguage(payload.language, options, userMessage);
      const appendThankYou = options.includeQA !== false;
      const hasThankYou = normalizedSlides.some((slide) => {
        const heading = String(slide?.heading || '').toLowerCase();
        return heading.includes('thank') || heading.includes('شکریہ');
      });

      if (appendThankYou && !hasThankYou) {
        const thankHeading = resolvedLanguage === 'ur' ? 'شکریہ' : 'Thank You';
        const thankSubtitle = resolvedLanguage === 'ur' ? 'کوئی سوال؟' : 'Any questions?';
        normalizedSlides.push({
          order: normalizedSlides.length + 1,
          heading: thankHeading,
          content: thankSubtitle,
          bullets: [],
          notes: resolvedLanguage === 'ur'
            ? 'سامعین سے سوالات کی دعوت دیں اور شکریہ ادا کریں۔'
            : 'Invite questions and close with thanks.',
          imageQuery: '',
          imageUrl: '',
          layout: 'content',
          slide_type: 'closing',
          data_visual: { type: 'none', data: {}, insight_label: '' },
        });
      }

      return {
        success: true,
        provider: 'ai',
        data: {
          title,
          language: resolvedLanguage,
          slides: normalizedSlides,
        },
      };
    } catch (parseError) {
      console.error('JSON parse error in AI response:', parseError.message);
      console.error('Raw AI response excerpt:', String(text || '').substring(0, 800));
      throw new Error(`JSON Parse Error: ${parseError.message}`);
    }
  }

  _resolveOutputLanguage(modelLanguage, options = {}, userMessage = '') {
    const target = String(options.targetLanguage || '').trim().toLowerCase();
    if (target === 'ur' || target === 'en') {
      return target;
    }

    const normalizedModelLang = String(modelLanguage || '').trim().toLowerCase();
    if (normalizedModelLang === 'ur' || normalizedModelLang === 'en') {
      return normalizedModelLang;
    }

    const urduRegex = /[\u0600-\u06FF]/;
    return urduRegex.test(userMessage) ? 'ur' : 'en';
  }

  _urduFallbackTopic() {
    return 'پریزنٹیشن کا موضوع';
  }

  _normalizeTopicLabel(userMessage) {
    const cleaned = String(userMessage || '').replace(/\s+/g, ' ').trim();
    return cleaned || 'Presentation Topic';
  }

  _topicKeywords(userMessage) {
    return String(userMessage || '')
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 3)
      .slice(0, 5);
  }

  _getFallbackResponse(userMessage, options = {}) {
    // Detect language
    const target = String(options.targetLanguage || '').trim().toLowerCase();
    const urduRegex = /[\u0600-\u06FF]/;
    const isUrdu = target === 'ur' ? true : target === 'en' ? false : urduRegex.test(userMessage);
    const lang = isUrdu ? 'ur' : 'en';
    const urduTopic = this._urduFallbackTopic();
    const topicLabel = this._normalizeTopicLabel(userMessage);
    const visibleTopicLabel = isUrdu ? urduTopic : topicLabel;
    const topicKeywords = this._topicKeywords(userMessage);
    const primaryKeyword = topicKeywords[0] || topicLabel;

    const slides = isUrdu ? [
      { order: 1, heading: urduTopic, content: `${visibleTopicLabel} ایک اہم اور تیزی سے بدلتا ہوا موضوع ہے`, bullets: ['یہ موضوع مختلف شعبوں کو متاثر کرتا ہے', 'اس کے عملی اثرات واضح اور قابلِ پیمائش ہیں', 'توجہ اس کے استعمال اور نتائج پر مرکوز ہے'], notes: '', imageQuery: userMessage, imageUrl: '', layout: 'title' },
      { order: 2, heading: 'سیاق اور سمت', content: `${visibleTopicLabel} کا موجودہ منظرنامہ رفتار اور تبدیلی دونوں دکھاتا ہے`, bullets: ['حالیہ رجحانات نمایاں ہیں', 'اطلاق کے مواقع بڑھ رہے ہیں', 'حقیقی اثرات پہلے ہی نظر آ رہے ہیں'], notes: '', imageQuery: `${userMessage} professional context`, imageUrl: '', layout: 'content' },
      { order: 3, heading: 'کلیدی زاویہ', content: `${visibleTopicLabel} کے مرکزی عناصر ایک واضح تصویر پیش کرتے ہیں`, bullets: ['اہم حقیقت', 'عملی اثر', 'واضح مثال'], notes: '', imageQuery: `${userMessage} key insight`, imageUrl: '', layout: 'bullets' },
      { order: 4, heading: 'اثر اور مواقع', content: `${visibleTopicLabel} نتائج، کارکردگی، اور فیصلوں پر اثر ڈالتا ہے`, bullets: ['فوائد', 'چیلنجز', 'مواقع'], notes: '', imageQuery: `${userMessage} impact opportunities`, imageUrl: '', layout: 'image-right' },
      { order: 5, heading: 'اختتامی نقطہ', content: `${visibleTopicLabel} کے حوالے سے سب سے اہم بات عملی اطلاق ہے`, bullets: ['اہم نتیجہ', 'مرکزی اشارہ', 'آگے کی سمت'], notes: '', imageQuery: `${userMessage} conclusion action plan`, imageUrl: '', layout: 'content' },
    ] : [
      { order: 1, heading: topicLabel, content: `${topicLabel} is a practical topic with visible impact`, bullets: ['It affects decisions and outcomes', 'It reshapes how teams work', 'It creates measurable value when applied well'], notes: '', imageQuery: userMessage, imageUrl: '', layout: 'title' },
      { order: 2, heading: 'Context and Momentum', content: `${topicLabel} is moving from concept to real-world adoption`, bullets: ['Momentum is building', 'Use cases are expanding', 'The practical case is stronger now'], notes: '', imageQuery: `${userMessage} professional context`, imageUrl: '', layout: 'content' },
      { order: 3, heading: 'Key Themes', content: `The most important patterns around ${topicLabel} are becoming clear`, bullets: ['A defining pattern', 'A measurable effect', 'A concrete example', 'A strategic takeaway'], notes: '', imageQuery: `${userMessage} key themes visual`, imageUrl: '', layout: 'bullets' },
      { order: 4, heading: 'Practical Impact', content: `${topicLabel} changes how work is done and how results are measured`, bullets: ['Faster execution', 'Better consistency', 'Higher confidence'], notes: '', imageQuery: `${userMessage} implications strategy`, imageUrl: '', layout: 'image-right' },
      { order: 5, heading: 'Strategic View', content: `The strongest value from ${topicLabel} appears when it is integrated into core workflows`, bullets: ['Near-term gain', 'Medium-term scale', 'Long-term advantage'], notes: '', imageQuery: `${userMessage} recommendations planning`, imageUrl: '', layout: 'two-column' },
      { order: 6, heading: 'Closing View', content: `The main takeaway is clear: ${topicLabel} matters because it changes outcomes`, bullets: ['Core insight', 'Decision point', 'Forward direction'], notes: '', imageQuery: `${userMessage} conclusion future`, imageUrl: '', layout: 'content' },
    ];

    return {
      success: true,
      provider: 'fallback',
      data: { title: isUrdu ? urduTopic : userMessage, language: lang, slides },
    };
  }

  // Chat response (non-slide conversation)
  async chat(userMessage, chatHistory = []) {
    this._refreshConfigIfNeeded();

    if (this.providers.length === 0) {
      return { reply: 'I can help you create presentations! Please provide a topic and I will generate slides for you. You can write in English or Urdu.' };
    }

    for (const provider of this.providers) {
      try {
        if (provider.name === 'openai') {
          const openai = new OpenAI({
            apiKey: this.openaiConfig.apiKey,
          });
          const completion = await openai.chat.completions.create({
            model: this.openaiConfig.model,
            messages: [
              { role: 'system', content: 'You are SlideEdge AI chatbot. Help users create presentations. Be helpful, concise, friendly. Support English and Urdu. Keep responses under 100 words.' },
              ...chatHistory.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage },
            ],
            max_tokens: 200,
          });
          return { reply: completion.choices[0].message.content };
        }
      } catch (error) {
        continue;
      }
    }
    return { reply: 'I can help you create presentations! Tell me your topic in English or Urdu.' };
  }
}

export default new AIService();
