import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { getTemplateCatalog, getTemplateById } from './templateCatalog.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import twoSlidesService from './twoSlidesService.js';

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

// Role prompts for pipeline-level generators
const ROLE_PROMPTS_PIPELINE = {
  Researcher: 'You are a Researcher: provide concise, verifiable facts and relevant stats.',
  ContentWriter: 'You are a Content Writer: produce slide-ready headings and short bullets.',
  SlideDesigner: 'You are a Slide Designer: enforce one idea per slide and concise bullets.',
  DataAnalyst: 'You are a Data Analyst: suggest charts and short interpretations for data.',
  ImageSuggester: 'You are an Image Suggester: output specific image search queries in English.',
  Editor: 'You are an Editor: tighten language, remove filler, enforce constraints.',
  PresenterCoach: 'You are a Presenter Coach: write concise speaker notes focused on delivery.',
};

// ============================================================================
// STEP 1 — Prompt Enhancer
// ============================================================================
const ENHANCE_PROMPT = (userInput, options = {}) => `You are a professional presentation strategist and content architect.

A user wants to create a PowerPoint presentation. Your job is to enhance their rough topic/idea into a detailed, structured presentation brief.

User's raw input: "${userInput}"

Required slide count: ${options.slideCount || '10'}

Target output language: ${options.language || 'auto'}
Language rule:
- If target output language is "urdu", write all textual fields in Urdu script only, even if the raw input is English.
- The correct Urdu translation for "Artificial Intelligence" is "مصنوعی ذہانت" (never translate it as "صنعتی ذہانت").
- Do not use English words or transliterations in titles, subtitles, section titles, body text, speaker notes, or bullet points.
- If target output language is "english", write all textual fields in English.
- If "auto", infer from user input.

Return a JSON object with this structure:
{
  "enhanced_topic": "A polished, specific version of the topic",
  "target_audience": "Who this presentation is for",
  "tone": "professional | academic | creative | corporate | storytelling",
  "key_message": "The single most important takeaway",
  "suggested_slide_count": 10,
  "language_preference": "${options.language || 'auto'}",
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
// STEP 3 — Slide Content Generator with PRD Controls
// ============================================================================

// Build tone instruction based on selected tone
const _buildToneInstruction = (tone) => {
  const toneGuides = {
    professional: 'Tone: Corporate, polished, metrics-driven. Use formal language and authoritative language. Each slide is a professional communication artifact.',
    conversational: 'Tone: Casual, friendly, approachable. Use conversational language and relatable examples. Make it feel like a chat with an expert.',
    academic: 'Tone: Scholarly, research-backed, definition-focused. Support claims with academic framing and references where appropriate.',
    persuasive: 'Tone: Compelling, benefit-focused, action-oriented. Every slide should lead toward a specific action or belief.',
    inspirational: 'Tone: Motivational, aspirational, future-focused. Use inspirational examples, big-picture vision, and calls to excellence.',
    storytelling: 'Tone: Narrative-driven, hero\'s-journey framing, emotional resonance. Build a story arc where the topic is the central transformation.',
  };
  return toneGuides[tone] || toneGuides.professional;
};

// Build audience instruction based on audience type
const _buildAudienceInstruction = (audience) => {
  const audienceGuides = {
    generalProfessionals: 'Audience: Busy professionals from diverse fields. Assume mid-level technical knowledge. Focus on practical value and ROI.',
    executives: 'Audience: C-level executives. Keep slides strategic, metrics-focused, and action-ready. No unnecessary jargon or detail.',
    studentsAcademics: 'Audience: Students and academics. Define concepts clearly. Include theory, examples, and implications. Encourage critical thinking.',
    investors: 'Audience: Investors and stakeholders. Focus on market size, traction, team, and ROI. Show defensibility and scalability.',
    technicalEngineers: 'Audience: Engineers and technical specialists. Include architecture, specs, and technical depth. Assume strong domain knowledge.',
    generalPublic: 'Audience: Non-experts, general population. Explain concepts using analogies. Avoid jargon. Focus on relevance to everyday life.',
    salesTeams: 'Audience: Sales professionals. Highlight competitive advantages, objection handling, and customer benefits. Use proof points.',
  };
  return audienceGuides[audience] || audienceGuides.generalProfessionals;
};

// Build structure instruction based on framework
const _buildStructureInstruction = (structure) => {
  const structureGuides = {
    problemSolution: 'Structure: Problem → Solution → Benefit. Start with a compelling problem, present your solution, close with clear benefits.',
    hookStory: 'Structure: Hook → Story → Lessons → CTA. Open with an attention-grabbing hook, develop a narrative, extract lessons, call to action.',
    overview: 'Structure: Overview → Deep Dive → Summary. Begin with a high-level view, dive into details and nuances, summarize conclusions.',
    timeline: 'Structure: Past → Present → Future. Open with historical context, discuss current state, project forward vision and strategy.',
    whyHow: 'Structure: What → Why → How → Next Steps. Define concept, justify importance, explain implementation, outline next actions.',
    dataDriver: 'Structure: Data-Driven Analysis. Lead with data and metrics. Each section should build a data-backed argument toward conclusions.',
  };
  return structureGuides[structure] || structureGuides.problemSolution;
};

// Build depth instruction
const _buildDepthInstruction = (depth) => {
  const depthGuides = {
    concise: 'Depth: Concise. Keep each slide to 1-2 key points. Aim for minimal text, maximum clarity. Every word must earn its place.',
    standard: 'Depth: Standard. Include 2-4 supporting points per slide. Balance depth with readability. Include enough detail for understanding.',
    detailed: 'Depth: Detailed. Provide comprehensive information (4-5 points per slide). Include examples, context, and nuanced explanations.',
  };
  return depthGuides[depth] || depthGuides.standard;
};

// Build stats level instruction
const _buildStatsInstruction = (statsLevel) => {
  const statsGuides = {
    includeStats: 'Stats Level: Include relevant statistics and metrics where appropriate. Support key claims with 1-2 data points per section.',
    heavyData: 'Stats Level: Data-heavy. Prioritize quantitative metrics, charts, and statistical evidence. Dedicate multiple slides to data visualization.',
    minimalStats: 'Stats Level: Minimal stats. Use only the most impactful metrics. Focus on narrative and concepts over numbers.',
    caseStudies: 'Stats Level: Case studies and examples. Include real-world success stories, before-and-after scenarios, and proof.',
  };
  return statsGuides[statsLevel] || statsGuides.includeStats;
};

// Build presentation type instruction
const _buildPresTypeInstruction = (presType) => {
  const typeGuides = {
    informational: 'Type: Informational. Educate the audience on a topic. Structure around key concepts and categories.',
    pitchDeck: 'Type: Pitch Deck. Convince investors or stakeholders. Lead with opportunity, show traction, close with vision and ask.',
    training: 'Type: Training. Teach a skill or process. Include learning objectives, step-by-step instructions, and practice examples.',
    productDemo: 'Type: Product Demo. Showcase product features and benefits. Lead with use cases, demonstrate capabilities, and call to action.',
    research: 'Type: Research-focused. Present findings, methodology, and implications. Include bibliography and technical depth.',
    businessProposal: 'Type: Business Proposal. Recommend action and budget. Include problem, solution, ROI, timeline, and next steps.',
  };
  return typeGuides[presType] || typeGuides.informational;
};

const SLIDE_CONTENT_PROMPT = (briefJSON, templateJSON, desiredCount, options = {}) => {
  const tone = options.tone || 'professional';
  const audience = options.audience || 'generalProfessionals';
  const structure = options.structure || 'problemSolution';
  const depth = options.depth || 'standard';
  const presType = options.presType || 'informational';
  const statsLevel = options.statsLevel || 'includeStats';

  const exemplar = (briefJSON?.tone || '').toLowerCase() === 'impressive' ? `
Example of desired slide (presentation copy, polished executive tone):
{
  "slideNumber": 2,
  "slideType": "content",
  "layout": "Two Column Layout",
  "title": "Superior Predictions Drive Better Decisions",
  "subtitle": "High‑impact ML use cases",
  "content": [
    "Predictive models reduce forecast error by 20% in pilot projects",
    "Anomaly detection highlights 3x more operational issues before escalation",
    "Automated personalization increases conversion while lowering cost"
  ],
  "imageRequired": true,
  "imageQuery": "professional data team reviewing clean charts and KPI dashboards on a large monitor, modern office, cinematic lighting",
  "visualType": "stat-callout",
  "speakerNotes": "Summarize the measurable business improvements and point to a concise KPI to track during pilots.",
  "keyTakeaway": "Pilot improved forecast accuracy"
}` : '';

  return `You are an expert Presentation Architect, Instructional Designer, Business Consultant, Graphic Designer, Data Storyteller, and Content Research Specialist.

Your responsibility is to generate COMPLETE professional presentations from a user's prompt, not merely summarize text.

Your task is to generate a high-quality presentation that looks like it was created by a professional consultant or designer.

PRESENTATION BRIEF:
${JSON.stringify(briefJSON)}

TEMPLATE DETAILS:
${JSON.stringify(templateJSON)}

===== TONE & AUDIENCE CONTEXT =====
${_buildToneInstruction(tone)}
${_buildAudienceInstruction(audience)}

===== STRUCTURE FRAMEWORK =====
${_buildStructureInstruction(structure)}

===== CONTENT DEPTH & STATS =====
${_buildDepthInstruction(depth)}
${_buildStatsInstruction(statsLevel)}

===== PRESENTATION TYPE =====
${_buildPresTypeInstruction(presType)}

---

## CRITICAL LANGUAGE RULES

### English Mode
Generate ALL content in English if language_preference is "english". Use professional business language. Use concise slide text. Avoid unnecessary paragraphs. Maintain presentation tone.

### Urdu Mode
CRITICAL: Think and write natively in Urdu from scratch. Do NOT write in English first and then translate. Every sentence must read as fluent, natural Urdu — the kind a professional Urdu columnist would write.
Avoid:
- Broken half-sentences or sentence fragments
- Mixing English words into Urdu text (e.g. "domestک" is WRONG)
- Generic filler like "یہ ایک اہم موضوع ہے" or "آج کی دنیا میں"
- Repeating the same point in different words across slides
Require:
- Each bullet must be a complete, meaningful Urdu sentence with a concrete fact, insight, or recommendation
- For economic/country topics, include: growth rate (شرح نمو), inflation (مہنگائی), fiscal deficit (مالی خسارہ), external accounts (بیرونی کھاتے), remittances (ترسیلات زر), sectors (شعبہ جات), reforms (اصلاحات)
- Use proper Urdu vocabulary: GDP = مجموعی ملکی پیداوار, inflation = مہنگائی, exports = برآمدات, imports = درآمدات, budget = بجٹ, tax = ٹیکس, debt = قرض, interest rate = شرح سود
Generate ALL content strictly in Urdu script if language_preference is "urdu". The correct Urdu translation for "Artificial Intelligence" is "مصنوعی ذہانت" (never translate it as "صنعتی ذہانت"). Do NOT use English words. Convert all acronyms into Urdu. Keep imageQuery in English for stock photo search.

Example of a GOOD Urdu slide:
{
  "slideNumber": 3,
  "slideType": "content",
  "layout": "Two Column Layout",
  "title": "مہنگائی اور عوامی دباؤ",
  "subtitle": "قیمتوں میں اضافے کا عوامی زندگی پر اثر",
  "content": [
    "مالی سال 2024 میں اوسط مہنگائی کی شرح 25 فیصد رہی جو خوراک اور توانائی کی قیمتوں سے چلی",
    "اسٹیٹ بینک نے شرح سود 22 فیصد پر برقرار رکھی جس سے کاروباری قرض مہنگا ہوا",
    "عوام کی قوت خرید میں 15 فیصد کمی آئی اور غریبی کی شرح بڑھی",
    "خوراکی اشیاء میں آٹے اور دالوں کی قیمتوں میں 40 فیصد تک اضافہ ہوا"
  ],
  "imageRequired": true,
  "imageQuery": "Pakistan inflation food prices market economy",
  "speakerNotes": "مہنگائی کے اعداد و شمار پیش کریں اور عوامی زندگی پر اثر کی وضاحت کریں۔"
}

---

## PRESENTATION GENERATION PHILOSOPHY
Do not create slides from a template. Create a unique presentation structure according to the Topic, Audience, Goal, Industry, and Complexity.
Each slide must introduce a new angle, insight, stat, process step, comparison, implication, or recommendation grounded in the brief's actual topic. Avoid generic filler.

---

## CONTENT QUALITY RULES
Generate original content. Avoid generic AI phrases such as "In today's world", "Nowadays", "It is important to note", "In conclusion". Every slide should contain useful, highly specific information.

For simple educational topics where the user only gives a topic name, create a complete teaching-style presentation, not a short executive summary. Use a natural learning flow:
1. Title slide with topic only; do not invent presenter names, dates, or placeholders unless the user provided them
2. Introduction and why the topic matters
3. Clear definition in simple language
4. Main types or categories
5. How it works or key process
6. Important fields, components, or concepts
7. Everyday examples or real-life uses
8. Use in education, health, business, society, or other relevant domains
9. Benefits and opportunities
10. Limitations, risks, or disadvantages
11. Future outlook
12. Conclusion
13. Thank-you / questions slide

If the user provides an explicit slide-by-slide outline (e.g., "Slide 1:" or "سلائیڈ 1:"), follow it closely and preserve the order and intent. Keep the provided slide titles and bullets, only polish for clarity. Do not add extra slides or placeholder names, dates, or dummy data.

If the requested slide count is 10 or more, cover these sections across separate slides. If the requested slide count is lower, merge related sections without removing the learning flow. For Urdu educational decks, use complete Urdu sentences and 3-5 useful bullet points per content slide. Do not produce vague bullets like "اہم حقیقت" or "عملی اثر".

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
For every content or data slide that includes an image, choose a side-by-side layout first. Use "Two Column Layout" or "Image Left Layout" as the default visual pattern, and alternate them across the deck for rhythm. Only use text-only layouts for title slides, section dividers, or slides without images.
Keep content slides visually spacious: one clear heading, 3 to 5 short bullets, and one dedicated image block beside the text.

---

## IMAGE GENERATION STRATEGY
For every slide, determine if an image is needed (imageRequired = true/false). If needed, generate a specific, vivid stock photo imageQuery in English suitable for Pixabay (e.g., "Pakistani business team meeting", "modern AI technology office"). Never place images behind text.

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
Generate relevant statistics, market insights, comparisons, case studies, timelines, frameworks, and best practices. Avoid fluff.

---

## PRESENTATION FLOW VALIDATION
Verify that the story flow is logical, slides are not repetitive, content is language-consistent, images support content, layouts are diversified, titles are unique, speaker notes exist, and key takeaways exist.

${exemplar}

Generate a complete slide deck. Return a JSON array where each object is one slide:

[
  {
    "slideNumber": 1,
    "slideType": "title | content | data | image-focus | quote | section-divider | closing",
    "layout": "Title Slide | Two Column Layout | Image Left Layout | Feature Grid | Comparison Layout | Timeline Layout | Statistics Layout | Process Flow Layout | SWOT Layout | Pyramid Layout | Roadmap Layout | Full Data Layout | Conclusion Layout",
    "title": "Slide headline (max 8 words, punchy)",
    "subtitle": "Optional subtitle or tagline (max 12 words)",
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

Rules:
- Generate EXACTLY ${desiredCount} slides
- Make most content slides side-by-side with text and images next to each other
- Alternate "Two Column Layout" and "Image Left Layout" on content slides whenever possible
- The closing slide must have a strong CTA or summary

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`;
};

class PresentationPipeline {
  constructor() {
    this._initialized = false;
    this.openaiConfig = null;
    this.openaiClient = null;
  }

  _normalizeLanguage(language) {
    if (!language || language === 'auto') return 'auto';
    if (language === 'ur') return 'urdu';
    if (language === 'en') return 'english';
    return String(language).trim().toLowerCase();
  }

  _ensureInit() {
    if (this._initialized) return;
    this._initialized = true;

    ensureEnvLoaded();

    const openaiApiKey = process.env.OPENAI_API_KEY || '';
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    this.openaiConfig = { apiKey: openaiApiKey, model: openaiModel };

    if (this.openaiConfig.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.openaiConfig.apiKey,
      });
      console.log(`🔗 PresentationPipeline: OpenAI connected (${this.openaiConfig.model})`);
    }

    if (!this.openaiClient) {
      console.warn('⚠️  PresentationPipeline: OPENAI_API_KEY is missing.');
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

  _visibleSlideTextHasLatinText(slides) {
    if (!Array.isArray(slides)) return false;

    return slides.some((slide) => {
      const visibleFields = [
        slide?.title,
        slide?.subtitle,
        slide?.speaker_notes,
        slide?.visual_suggestion,
        slide?.animation_hint,
        slide?.data_visual?.insight_label,
        slide?.design_notes?.emphasis_word,
        ...(Array.isArray(slide?.body_text) ? slide.body_text : []),
      ];

      const dataValues = slide?.data_visual?.data && typeof slide.data_visual.data === 'object'
        ? Object.values(slide.data_visual.data)
        : [];

      return [...visibleFields, ...dataValues].some((value) => this._payloadHasLatinText(value));
    });
  }

  _replaceLatinTermsForUrdu(value) {
    if (typeof value !== 'string' || !this._containsLatinScript(value)) return value;

    const replacements = [
      [/gross domestic product/gi, 'مجموعی گھریلو پیداوار'],
      [/GDP/g, 'مجموعی گھریلو پیداوار'],
      [/artificial intelligence/gi, 'مصنوعی ذہانت'],
      [/machine learning/gi, 'مشین لرننگ'],
      [/deep learning/gi, 'گہری تعلیم'],
      [/\bAI\b/g, 'مصنوعی ذہانت'],
      [/\bML\b/g, 'مشین لرننگ'],
      [/KPI/g, 'اہم کارکردگی پیمانہ'],
      [/ROI/g, 'سرمایہ کاری پر منافع'],
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

  _sanitizeUrduSlideVisibleText(slides) {
    if (!Array.isArray(slides)) return slides;

    return slides.map((slide) => {
      const data = slide?.data_visual?.data && typeof slide.data_visual.data === 'object'
        ? Object.fromEntries(
          Object.entries(slide.data_visual.data).map(([key, value]) => [
            key,
            typeof value === 'string' ? this._replaceLatinTermsForUrdu(value) : value,
          ])
        )
        : slide?.data_visual?.data;

      return {
        ...slide,
        title: this._replaceLatinTermsForUrdu(slide?.title),
        subtitle: this._replaceLatinTermsForUrdu(slide?.subtitle),
        body_text: Array.isArray(slide?.body_text)
          ? slide.body_text.map((item) => this._replaceLatinTermsForUrdu(item))
          : slide?.body_text,
        speaker_notes: this._replaceLatinTermsForUrdu(slide?.speaker_notes),
        visual_suggestion: this._replaceLatinTermsForUrdu(slide?.visual_suggestion),
        animation_hint: this._replaceLatinTermsForUrdu(slide?.animation_hint),
        data_visual: slide?.data_visual ? {
          ...slide.data_visual,
          data,
          insight_label: this._replaceLatinTermsForUrdu(slide.data_visual.insight_label),
        } : slide?.data_visual,
        design_notes: slide?.design_notes ? {
          ...slide.design_notes,
          emphasis_word: this._replaceLatinTermsForUrdu(slide.design_notes.emphasis_word),
        } : slide?.design_notes,
      };
    });
  }

  _buildUrduRepairPrompt(payload, userMessage) {
    return `Rewrite the following presentation JSON so every visible text field is in Urdu script only.
Do not use English words in title, subtitle, body_text, speaker_notes, visual_suggestion, animation_hint, data_visual labels, or any other presenter-facing text.
Preserve the JSON structure, keys, slide order, layout, slide_type, image_position, imageUrl, image_prompt, and machine-readable enum values such as data_visual.type.
Keep image_prompt in English for image search.
Return only raw JSON.

User topic: ${userMessage}

JSON to rewrite:
${JSON.stringify(payload)}`;
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

  async _generate(prompt, options = {}) {
    this._ensureInit();

    const rolePrefix = options.role && ROLE_PROMPTS_PIPELINE[options.role]
      ? `${ROLE_PROMPTS_PIPELINE[options.role]}\n\n`
      : '';

    const messages = [
      { role: 'system', content: 'Return only valid JSON unless user asks plain text.' },
      { role: 'user', content: rolePrefix + prompt },
    ];

    const errors = [];

    if (this.openaiClient) {
      try {
        console.log(`🤖 PresentationPipeline: Trying OpenAI API (${this.openaiConfig.model})...`);
        const completion = await this.openaiClient.chat.completions.create({
          model: this.openaiConfig.model,
          messages,
        });

        const text = completion.choices[0]?.message?.content || '';
        if (text) {
          if (options.expectJSON) {
            // Validate that it parses as JSON
            this._parseJSON(text);
          }
          return text;
        }
        throw new Error('OpenAI returned an empty response');
      } catch (error) {
        errors.push(`OpenAI: ${error.message}`);
        console.warn('Pipeline OpenAI failed:', error.message);
      }
    }

    throw new Error(errors.length ? `All AI providers failed (${errors.join('; ')})` : 'AI provider config incomplete');
  }

  // ============================================================================
  // STEP 1 - Build Topic Brief
  // ============================================================================
  async enhanceTopic(userInput, options = {}) {
    const normalizedSlideCount = Math.max(1, Math.min(20, Number(options.slideCount) || 10));
    const normalizedLanguage = this._normalizeLanguage(options.language);
    const brief = this._buildFallbackBrief(userInput, normalizedSlideCount, normalizedLanguage);

    if (brief && typeof brief === 'object') {
      brief.language_preference = normalizedLanguage !== 'auto'
        ? normalizedLanguage
        : (brief.language_preference || 'auto');
    }

    // If user selected Urdu but the topic is non-Urdu, normalize it.
    if (brief.language_preference === 'urdu') {
      const urduRegex = /[\u0600-\u06FF]/;
      if (urduRegex.test(userInput || '')) {
        brief.enhanced_topic = userInput.trim();
        brief.source_topic = userInput.trim();
        if (/پاکستان.*معیشت|معیشت.*پاکستان/u.test(userInput || '')) {
          brief.key_message = 'پاکستان کی معیشت کو سمجھنے کے لیے نمو، مہنگائی، قرض، بیرونی کھاتے، شعبہ جاتی کارکردگی، اور اصلاحات کو ایک ساتھ دیکھنا ضروری ہے۔';
          brief.sections = [
            { section_title: 'معاشی تصویر', purpose: 'شرح نمو، فی کس آمدنی، اور مجموعی سمت واضح کریں۔', suggested_slides: 1 },
            { section_title: 'مہنگائی اور عوامی دباؤ', purpose: 'مہنگائی، شرح سود، قوت خرید، اور روزمرہ اخراجات کا اثر بیان کریں۔', suggested_slides: 2 },
            { section_title: 'قرض، خسارہ، اور مالیاتی گنجائش', purpose: 'بجٹ خسارہ، ٹیکس آمدن، قرض کی لاگت، اور پالیسی حدود سمجھائیں۔', suggested_slides: 2 },
            { section_title: 'بیرونی کھاتے', purpose: 'برآمدات، درآمدات، ترسیلات، زر مبادلہ، اور کرنسی دباؤ کا جائزہ دیں۔', suggested_slides: 2 },
            { section_title: 'شعبے اور اصلاحات', purpose: 'زراعت، صنعت، خدمات، توانائی، سرمایہ کاری، اور اصلاحات کا راستہ دکھائیں۔', suggested_slides: 2 },
          ];
          brief.data_points_to_include = [
            'حقیقی شرح نمو اور فی کس آمدنی',
            'مہنگائی اور شرح سود',
            'مالیاتی خسارہ، قرض، اور ٹیکس آمدن',
            'برآمدات، درآمدات، ترسیلات، اور زر مبادلہ',
            'زراعت، صنعت، خدمات، توانائی، اور روزگار',
          ];
        }
      }
      if (!urduRegex.test(brief.enhanced_topic || '')) {
        brief.enhanced_topic = 'پریزنٹیشن کا موضوع';
      }
    }

    const isUrduBrief = brief.language_preference === 'urdu';
    const urduRegex = /[\u0600-\u06FF]/;
    const hasUrdu = (value) => urduRegex.test(String(value || ''));

    if (isUrduBrief) {
      brief.tone = hasUrdu(brief.tone) ? brief.tone : 'پیشہ ورانہ';
      brief.target_audience = hasUrdu(brief.target_audience) ? brief.target_audience : 'عام سامعین';
      brief.visual_themes = Array.isArray(brief.visual_themes) && brief.visual_themes.some(hasUrdu)
        ? brief.visual_themes.map((theme, index) => (hasUrdu(theme) ? theme : ['سادہ', 'اعداد و شمار پر مبنی'][index % 2]))
        : ['سادہ', 'اعداد و شمار پر مبنی'];
      brief.color_mood = hasUrdu(brief.color_mood) ? brief.color_mood : 'پیشہ ورانہ نیلا';
      brief.data_points_to_include = Array.isArray(brief.data_points_to_include) && brief.data_points_to_include.some(hasUrdu)
        ? brief.data_points_to_include.map((point, index) => (hasUrdu(point) ? point : ['متعلقہ رجحان', 'تقابلی جائزہ', 'اثر کا پیمانہ'][index % 3]))
        : ['متعلقہ رجحان', 'تقابلی جائزہ', 'اثر کا پیمانہ'];
      brief.sections = Array.isArray(brief.sections) && brief.sections.length > 0
        ? brief.sections.map((section, index) => ({
          ...section,
          section_title: hasUrdu(section?.section_title)
            ? section.section_title
            : ['تعارف', 'موجودہ منظرنامہ', 'بنیادی تجزیہ', 'سفارشات', 'نتیجہ'][index % 5],
          purpose: hasUrdu(section?.purpose)
            ? section.purpose
            : ['تناظر واضح کریں۔', 'اہم رجحانات بیان کریں۔', 'بنیادی نکات پیش کریں۔', 'عملی اقدامات دیں۔', 'مؤثر اختتام دیں۔'][index % 5],
        }))
        : [
          { section_title: 'تعارف', purpose: 'تناظر واضح کریں۔', suggested_slides: 1 },
          { section_title: 'موجودہ منظرنامہ', purpose: 'اہم رجحانات بیان کریں۔', suggested_slides: 2 },
          { section_title: 'بنیادی تجزیہ', purpose: 'بنیادی نکات پیش کریں۔', suggested_slides: 2 },
          { section_title: 'نتیجہ', purpose: 'مؤثر اختتام دیں۔', suggested_slides: 1 },
        ];
    } else {
      brief.tone = brief.tone || 'professional';
      brief.target_audience = brief.target_audience || 'General audience';
      brief.visual_themes = brief.visual_themes || ['minimalist'];
      brief.color_mood = brief.color_mood || 'corporate blue';
      brief.data_points_to_include = brief.data_points_to_include || [];
    }

    return brief;
  }

  // ============================================================================
  // STEP 2 — Suggest Real PPTX Templates
  // ============================================================================
  async suggestTemplates(enhancedBrief, overrideQuery = null) {
    const selected = [];

    // Try fetching dynamic templates from 2Slides search API first
    try {
      const searchTopic = overrideQuery || 
                          enhancedBrief?.source_topic || 
                          enhancedBrief?.enhanced_topic || 
                          (enhancedBrief?.visual_themes && enhancedBrief.visual_themes[0]) || 
                          'business';

      let cleanTopic = searchTopic.trim();
      if (!overrideQuery) {
        const cleaned = searchTopic
          .replace(/create a presentation about|presentation on|pitch deck for|slides about|write a presentation/gi, '')
          .trim();
        cleanTopic = cleaned.split(/\s+/).slice(0, 2).join(' ');
      }

      console.log(`🎨 Attempting to fetch real 2Slides templates for query: "${cleanTopic}"`);
      const twoslidesThemes = await twoSlidesService.searchThemes(cleanTopic, 4);

      if (Array.isArray(twoslidesThemes) && twoslidesThemes.length > 0) {
        console.log(`✅ Successfully loaded ${twoslidesThemes.length} templates from 2Slides API!`);
        for (const t of twoslidesThemes) {
          selected.push(t);
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch dynamic 2Slides templates, falling back to local catalog:', err.message);
    }

    // Fallback: If 2Slides search yielded fewer than 4 templates, fill/back up using the catalog
    if (selected.length < 4) {
      const catalog = getTemplateCatalog();
      let rankedIds = catalog.slice(0, 4).map(t => t.template_id);

      try {
        const text = await this._generate(TEMPLATE_RANK_PROMPT(enhancedBrief, catalog), { expectJSON: true });
        const parsed = this._parseJSON(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rankedIds = parsed.filter(id => typeof id === 'string');
        }
      } catch (error) {
        console.warn('⚠️ Local template ranking fallback used:', error.message);
      }

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
    }

    return selected;
  }

  // ============================================================================
  // STEP 3 — Generate Slide Content
  // ============================================================================
  async generateSlideContent(enhancedBrief, selectedTemplate) {
    const options = enhancedBrief?._options || {};
    const desiredCount = Math.max(1, Math.min(20, Number(enhancedBrief?.suggested_slide_count) || 10));
    const targetLanguage = this._normalizeLanguage(options.language || enhancedBrief?.language_preference || 'auto');
    if (targetLanguage !== 'auto') {
      enhancedBrief.language_preference = targetLanguage;
    }
    let slides = [];

    try {
      const text = await this._generate(SLIDE_CONTENT_PROMPT(enhancedBrief, selectedTemplate, desiredCount, options), { ...options, expectJSON: true });
      slides = this._parseJSON(text);
      if (!Array.isArray(slides) || slides.length === 0) {
        throw new Error('Upstream AI generated an invalid or empty slide structure.');
      }
    } catch (error) {
      console.warn('⚠️ Slide content generation failed, falling back to local builder:', error.message);
      slides = this._buildFallbackSlides(enhancedBrief, desiredCount);
    }

    if (targetLanguage === 'urdu' && this._visibleSlideTextHasLatinText(slides)) {
      try {
        const repairPrompt = this._buildUrduRepairPrompt(slides, enhancedBrief?.source_topic || enhancedBrief?.enhanced_topic || 'presentation topic');
        const repairedText = await this._generate(repairPrompt, { role: 'Editor', expectJSON: true });
        const repairedSlides = this._parseJSON(repairedText);
        if (Array.isArray(repairedSlides) && repairedSlides.length > 0) {
          slides = repairedSlides;
        }
      } catch (repairError) {
        console.warn('⚠️ Urdu slide repair failed:', repairError.message);
      }

      if (this._visibleSlideTextHasLatinText(slides)) {
        console.debug('Urdu visible text sanitized after AI repair.');
        slides = this._sanitizeUrduSlideVisibleText(slides);
      }
    }

    const normalizedSlides = slides.slice(0, desiredCount);
    while (normalizedSlides.length < desiredCount) {
      normalizedSlides.push({
        slideNumber: normalizedSlides.length + 1,
        slideType: normalizedSlides.length === desiredCount - 1 ? 'closing' : 'content',
        layout: 'Title Slide',
        title: targetLanguage === 'urdu' ? `سلائیڈ ${normalizedSlides.length + 1}` : `Slide ${normalizedSlides.length + 1}`,
        subtitle: '',
        content: [],
        speakerNotes: '',
        imageQuery: enhancedBrief?.enhanced_topic || 'professional business presentation',
        imageRequired: false,
        visualType: 'none',
        keyTakeaway: '',
      });
    }

    const appendThankYou = options.includeQA !== false;
    const hasThankYou = normalizedSlides.some((slide) => {
      const title = String(slide?.title || '').toLowerCase();
      return title.includes('thank') || title.includes('شکریہ');
    });

    if (appendThankYou && !hasThankYou) {
      const thankTitle = targetLanguage === 'urdu' ? 'شکریہ' : 'Thank You';
      const thankSubtitle = targetLanguage === 'urdu' ? 'کوئی سوال؟' : 'Any questions?';
      normalizedSlides.push({
        slideNumber: normalizedSlides.length + 1,
        slideType: 'closing',
        layout: 'Conclusion Layout',
        title: thankTitle,
        subtitle: thankSubtitle,
        content: [],
        speakerNotes: targetLanguage === 'urdu'
          ? 'سامعین سے سوالات کی دعوت دیں اور شکریہ ادا کریں۔'
          : 'Invite questions and close with thanks.',
        imageQuery: '',
        imageRequired: false,
        visualType: 'none',
        keyTakeaway: '',
      });
    }

    return normalizedSlides.map((s, i) => {
      const slideNumber = s.slideNumber || s.slide_number || i + 1;
      const slideType = s.slideType || s.slide_type || 'content';
      const imageRequired = s.imageRequired !== undefined ? s.imageRequired : (slideType === 'content' || slideType === 'data');
      const layout = s.layout || (slideType === 'title'
        ? 'Title Slide'
        : slideType === 'closing'
          ? 'Conclusion Layout'
          : imageRequired
            ? (i % 2 === 0 ? 'Two Column Layout' : 'Image Left Layout')
            : 'Feature Grid');
      const title = s.title || s.heading || (targetLanguage === 'urdu' ? `سلائیڈ ${i + 1}` : `Slide ${i + 1}`);
      const subtitle = s.subtitle || '';
      
      let contentArray = [];
      if (Array.isArray(s.content)) {
        contentArray = s.content;
      } else if (Array.isArray(s.body_text)) {
        contentArray = s.body_text;
      } else if (Array.isArray(s.bullets)) {
        contentArray = s.bullets;
      } else if (typeof s.content === 'string') {
        contentArray = s.content.split('\n').filter(Boolean);
      } else if (typeof s.body_text === 'string') {
        contentArray = s.body_text.split('\n').filter(Boolean);
      }

      const speakerNotes = s.speakerNotes || s.speaker_notes || s.notes || '';
      const imageQuery = s.imageQuery || s.image_prompt || s.image_query || '';
      const visualType = s.visualType || s.data_visual?.type || 'none';
      const keyTakeaway = s.keyTakeaway || s.data_visual?.insight_label || '';
      
      const imagePosition = s.image_position || (layout.includes('Left') || layout === 'image-left' ? 'left' : layout.includes('Right') || layout === 'image-right' || layout.includes('Two Column') ? 'right' : 'none');

      return {
        slideNumber,
        slideType,
        layout,
        title,
        subtitle,
        content: contentArray,
        speakerNotes,
        imageQuery,
        imageRequired,
        visualType,
        keyTakeaway,
        image_position: imagePosition,
        data_visual: {
          type: visualType,
          data: s.data_visual?.data || {},
          insight_label: keyTakeaway,
        },
        design_notes: {
          background_color: s.design_notes?.background_color || '',
          text_color: s.design_notes?.text_color || '',
          emphasis_word: s.design_notes?.emphasis_word || '',
        }
      };
    });
  }

  _buildFallbackBrief(userInput, slideCount, languagePreference = 'auto') {
    const rawTopic = userInput?.trim() || 'Presentation Topic';
    const isUrdu = languagePreference === 'urdu';
    const topic = isUrdu ? 'پریزنٹیشن کا موضوع' : rawTopic;
    const sections = isUrdu
      ? [
        { section_title: 'تعارف', purpose: 'موضوع کا تناظر اور دائرہ واضح کریں۔', suggested_slides: 1 },
        { section_title: 'موجودہ منظرنامہ', purpose: 'پس منظر، رجحانات، اور اہم عوامل بیان کریں۔', suggested_slides: 2 },
        { section_title: 'بنیادی تجزیہ', purpose: 'اہم خیالات، بصیرت، اور عملی اثرات پیش کریں۔', suggested_slides: Math.max(2, Math.floor(slideCount / 3)) },
        { section_title: 'سفارشات', purpose: 'واضح اور قابلِ عمل اگلے اقدامات دیں۔', suggested_slides: 1 },
        { section_title: 'نتیجہ', purpose: 'اہم نکات کو سمیٹ کر مؤثر اختتام دیں۔', suggested_slides: 1 },
      ]
      : [
        { section_title: 'Introduction', purpose: 'Set context and define the topic scope.', suggested_slides: 1 },
        { section_title: 'Current Landscape', purpose: 'Explain background, trends, and key drivers.', suggested_slides: 2 },
        { section_title: 'Core Analysis', purpose: 'Present key ideas, insights, and practical implications.', suggested_slides: Math.max(2, Math.floor(slideCount / 3)) },
        { section_title: 'Recommendations', purpose: 'Provide clear, actionable next steps.', suggested_slides: 1 },
        { section_title: 'Conclusion', purpose: 'Summarize takeaways and close with impact.', suggested_slides: 1 },
      ];

    return {
      enhanced_topic: topic,
      source_topic: rawTopic,
      subtopic: isUrdu ? 'بنیادی نکات' : 'Core overview',
      target_audience: isUrdu ? 'عام پیشہ ور سامعین' : 'General professional audience',
      tone: isUrdu ? 'پیشہ ورانہ' : 'professional',
      key_message: isUrdu
        ? 'اس موضوع کی واضح سمجھ بہتر فیصلوں اور نتائج میں مدد دیتی ہے۔'
        : `A clear understanding of ${topic} supports better decisions and outcomes.`,
      suggested_slide_count: slideCount,
      sections,
      data_points_to_include: isUrdu
        ? [
          'متعلقہ رجحان یا ترقی کا اشارہ',
          'پہلے اور بعد کا تقابلی جائزہ',
          'کارکردگی یا اثر کا پیمانہ',
        ]
        : [
          'Relevant market trend or growth statistic',
          'A before/after comparison',
          'A performance or impact KPI',
        ],
      visual_themes: isUrdu ? ['سادہ', 'اعداد و شمار پر مبنی'] : ['minimalist', 'data-driven'],
      color_mood: isUrdu ? 'پیشہ ورانہ نیلا' : 'corporate blue',
      language_preference: languagePreference,
    };
  }

  _buildFallbackSlides(brief, desiredCount) {
    const preferredLang = String(brief?.language_preference || 'auto').toLowerCase();
    const isUrdu = preferredLang === 'urdu' || preferredLang === 'ur';
    const urduRegex = /[\u0600-\u06FF]/;
    const rawTopic = brief?.enhanced_topic || 'Presentation Topic';
    const topic = isUrdu && !urduRegex.test(rawTopic) ? 'پریزنٹیشن کا موضوع' : rawTopic;
    const sourceTopic = brief?.source_topic || rawTopic;
    const fallbackUrduDataPoints = [
      'متعلقہ رجحان یا ترقی کا اشارہ',
      'پہلے اور بعد کا تقابلی جائزہ',
      'کارکردگی یا اثر کا پیمانہ',
    ];
    const rawDataPoints = Array.isArray(brief?.data_points_to_include)
      ? brief.data_points_to_include.filter(Boolean)
      : [];
    const sectionDataPoints = isUrdu
      ? (rawDataPoints.length > 0 ? rawDataPoints : fallbackUrduDataPoints).map((point, index) => (
        urduRegex.test(String(point || '')) ? point : fallbackUrduDataPoints[index % fallbackUrduDataPoints.length]
      ))
      : rawDataPoints;
    const sectionThemes = Array.isArray(brief?.visual_themes) && brief.visual_themes.length > 0
      ? brief.visual_themes
      : ['minimalist'];
    const rawKeyMessage = brief?.key_message || '';
    const keyMessage = isUrdu
      ? (urduRegex.test(rawKeyMessage) ? rawKeyMessage : 'یہ موضوع بہتر فیصلوں اور واضح سمت کے لیے اہم ہے۔')
      : (rawKeyMessage || `A clear understanding of ${topic} supports better decisions and outcomes.`);
      
    const titleSlide = {
      slideNumber: 1,
      slideType: 'title',
      layout: 'Title Slide',
      title: topic,
      subtitle: keyMessage,
      content: [],
      speakerNotes: isUrdu
        ? `${topic} کا تعارف دیں، کلیدی پیغام واضح کریں، اور دکھائیں کہ یہ موضوع سامعین کے لیے کیوں اہم ہے۔`
        : `Introduce ${topic}, state the core message, and explain why it matters to the audience.`,
      imageQuery: `${sourceTopic} professional presentation cover photo with ${sectionThemes[0]} style`,
      imageRequired: true,
      visualType: 'none',
      keyTakeaway: '',
      image_position: 'background',
      data_visual: { type: 'none', data: {}, insight_label: '' },
      design_notes: { background_color: '', text_color: '', emphasis_word: '' },
    };

    const fallbackUrduSectionNames = ['سیاق و منظر', 'اہم عوامل', 'عملی اثرات', 'سفارشات', 'اختتامی نکتہ'];
    const rawSectionNames = Array.isArray(brief?.sections) && brief.sections.length > 0
      ? brief.sections.map((s) => s.section_title)
      : (isUrdu ? fallbackUrduSectionNames : ['Context & Framing', 'Key Drivers', 'Practical Impact', 'Closing View']);
    const sectionNames = isUrdu
      ? rawSectionNames.map((name, index) => (
        urduRegex.test(String(name || '')) ? name : fallbackUrduSectionNames[index % fallbackUrduSectionNames.length]
      ))
      : rawSectionNames;

    const slides = [titleSlide];
    for (let i = 2; i <= desiredCount; i++) {
      const isLast = i === desiredCount;
      const sectionTitle = sectionNames[(i - 2) % sectionNames.length];
      const sectionPurpose = Array.isArray(brief?.sections) && brief.sections.length > 0
        ? brief.sections[(i - 2) % brief.sections.length]?.purpose || ''
        : '';
      const dataPoint = sectionDataPoints[(i - 2) % Math.max(sectionDataPoints.length, 1)] || '';
      
      slides.push({
        slideNumber: i,
        slideType: isLast ? 'closing' : (i % 3 === 0 ? 'data' : 'content'),
        layout: i % 2 === 0 ? 'Two Column Layout' : 'Image Left Layout',
        title: isLast
          ? (isUrdu ? 'نتیجہ' : 'Closing View')
          : sectionTitle,
        subtitle: isLast
          ? (isUrdu ? 'اہم نتائج اور حتمی اشارے' : `A concise close on ${topic}`)
          : (isUrdu ? `${topic} کے تناظر میں ایک اہم زاویہ` : `A focused view of ${topic}`),
        content: isLast
          ? (isUrdu
            ? [
              `${topic} کا خلاصہ ایک واضح نتیجے میں تبدیل کریں`,
              'سب سے مضبوط مشاہدات کو جوڑ کر پیش کریں',
              'اختتامی پیغام کو ایک مضبوط جملے میں بند کریں',
            ]
            : [
              `Summarize the strongest ${topic.toLowerCase()} insights`,
              'Connect the findings into one clear takeaway',
              'Leave the audience with a decisive closing point',
            ])
          : (isUrdu
            ? [
              `${topic} عملی استعمال کے مرحلے میں داخل ہو رہا ہے`,
              dataPoint ? `${dataPoint} اس رجحان کی سمت واضح کرتا ہے` : 'رفتار، معیار، اور اعتماد ایک ساتھ بہتر ہوتے ہیں',
              `یہ زاویہ ${sectionTitle} کو حقیقی اثر سے جوڑتا ہے`,
            ]
            : [
              ` ${topic} is moving from concept to practical use`,
              dataPoint ? `${dataPoint} reinforces the direction of change` : 'Speed, quality, and confidence improve together',
              `This view connects ${sectionTitle} to measurable impact`,
            ]),
        speakerNotes: isLast
          ? (isUrdu ? 'اختتامی پیغام کو مضبوط اور یادگار بنائیں۔' : `Close with a decisive summary of ${topic}.`)
          : (isUrdu ? `${sectionTitle} اور ${topic} کے عملی اثر کو نمایاں کریں۔` : `Frame the practical impact of ${sectionTitle} in the context of ${topic}.`),
        imageQuery: `${sourceTopic} ${sectionTitle} professional photo`,
        imageRequired: true,
        visualType: i % 3 === 0 ? 'stat-callout' : 'none',
        keyTakeaway: i % 3 === 0
          ? (isUrdu ? 'یہ نکتہ موضوع کے اثر کو نمایاں کرتا ہے۔' : `This metric highlights a specific ${topic.toLowerCase()} impact.`)
          : '',
        image_position: i % 2 === 0 ? 'right' : 'left',
        data_visual: {
          type: i % 3 === 0 ? 'stat-callout' : 'none',
          data: i % 3 === 0 ? { metric: dataPoint || topic, value: isUrdu ? 'اہم قدر' : 'Value' } : {},
          insight_label: i % 3 === 0
            ? (isUrdu ? 'یہ نکتہ موضوع کے اثر کو نمایاں کرتا ہے۔' : `This metric highlights a specific ${topic.toLowerCase()} impact.`)
            : '',
        },
        design_notes: {
          background_color: String(brief?.color_mood || ''),
          text_color: '',
          emphasis_word: sectionTitle,
        },
      });
    }

    return slides;
  }

  _looksGenericDeck(slides, brief) {
    if (!Array.isArray(slides) || slides.length === 0) return true;

    const titlePool = slides.map((slide) => String(slide?.title || '').trim().toLowerCase()).filter(Boolean);
    const uniqueTitles = new Set(titlePool);
    if (uniqueTitles.size <= Math.max(2, Math.ceil(slides.length * 0.5))) {
      return true;
    }

    const topic = String(brief?.enhanced_topic || brief?.source_topic || '').toLowerCase();
    const topicTokens = topic.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 3);
    const genericPatterns = [
      /^(introduction|overview|analysis|conclusion|summary|key concepts|key points|impact & benefits)$/,
      /presentation title slide/i,
      /topic overview/i,
      /detailed analysis/i,
      /future outlook/i,
      /why this matters/i,
      /^(explain|discuss|provide|clarify|set context|introduce|summarize)\b/i,
    ];

    const genericCount = slides.filter((slide) => {
      const fields = [
        slide?.title, 
        slide?.subtitle, 
        slide?.speaker_notes, 
        slide?.speakerNotes, 
        ...(Array.isArray(slide?.body_text) ? slide.body_text : []),
        ...(Array.isArray(slide?.content) ? slide.content : [])
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      if (fields.length === 0) return true;

      const combined = fields.join(' ').toLowerCase();
      if (genericPatterns.some((pattern) => pattern.test(combined))) return true;
      if (!topicTokens.length) return false;

      const matchedTokens = topicTokens.filter((token) => combined.includes(token));
      return matchedTokens.length === 0 && fields.every((field) => field.length < 80);
    }).length;

    return genericCount >= Math.ceil(slides.length * 0.5);
  }

  // ============================================================================
  // STEP 4 — Extract Keywords & Search Pixabay
  // ============================================================================
  async refineImagePrompt(rawPrompt) {
    if (!rawPrompt || rawPrompt.trim() === '') return rawPrompt;
    try {
      const refined = await this._generate(`Extract 2 or 3 highly relevant search keywords in English from this presentation slide's image prompt. The keywords should be suitable for a Pixabay stock photo search. Even if the prompt is in Urdu or another language, translate the concepts to standard English search terms.
      
      Prompt: "${rawPrompt}"
      Return ONLY the 2-3 English keywords, separated by spaces. No punctuation.`, { role: 'ImageSuggester' });
      
      const cleanRefined = refined.replace(/^["']|["']$/g, '').trim();
      const urduRegex = /[\u0600-\u06FF]/;
      if (urduRegex.test(cleanRefined) || cleanRefined === '') {
        return 'business presentation';
      }
      return cleanRefined;
    } catch {
      const urduRegex = /[\u0600-\u06FF]/;
      if (urduRegex.test(rawPrompt)) {
        return 'business presentation';
      }
      return rawPrompt.split(' ').slice(0, 3).join(' ');
    }
  }

  async generateSlideImages(slides) {
    const key = process.env.PIXABAY_API_KEY;
    const baseUrl = (process.env.PIXABAY_API_URL || 'https://pixabay.com/api/').replace(/\/$/, '');
    const safeSearch = String(process.env.PIXABAY_SAFESEARCH || 'true').toLowerCase() !== 'false';
    const perPage = Math.max(3, Math.min(20, Number(process.env.PIXABAY_PER_PAGE || 8)));

    const processedSlides = await Promise.all(
      slides.map(async (slide) => {
        if (!slide.imageRequired || !slide.imageQuery) {
          return {
            ...slide,
            imageUrl: '',
            image_prompt: '',
            refined_image_prompt: '',
            image_alt: ''
          };
        }

        let refinedPrompt = slide.imageQuery;
        try {
          refinedPrompt = await this.refineImagePrompt(slide.imageQuery);
        } catch (err) {
          console.warn('⚠️ Image prompt refinement failed in pipeline:', err.message);
        }

        const seed = Math.abs(refinedPrompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
        let imageUrl = `https://picsum.photos/seed/${seed}/800/450`;

        if (key) {
          try {
            console.log(`🖼️ Searching Pixabay for query: "${refinedPrompt}"`);
            const response = await axios.get(`${baseUrl}/`, {
              params: {
                key,
                q: refinedPrompt,
                image_type: 'photo',
                orientation: 'horizontal',
                safesearch: safeSearch,
                per_page: perPage,
              },
              timeout: 10000,
            });

            if (Array.isArray(response.data?.hits) && response.data.hits.length > 0) {
              const hit = response.data.hits[0];
              imageUrl = hit.largeImageURL || hit.webformatURL || hit.previewURL;
            } else {
              console.warn(`⚠️ Pixabay returned 0 hits for query: "${refinedPrompt}". Using placeholder.`);
            }
          } catch (e) {
            console.warn(`⚠️ Pixabay request failed for query: "${refinedPrompt}". Error: ${e.message}`);
          }
        }

        return {
          ...slide,
          imageUrl,
          image_prompt: slide.imageQuery,
          refined_image_prompt: refinedPrompt,
          image_alt: slide.image_alt || `Stock photo representing ${refinedPrompt}`
        };
      })
    );

    return processedSlides;
  }

  // ============================================================================
  // Full Pipeline 
  // ============================================================================
  async generateFullDeck(enhancedBrief, selectedTemplate, options = {}) {
    console.log('📝 Step 3: Generating slide content...');
    const targetLanguage = this._normalizeLanguage(options.language || enhancedBrief?.language_preference || 'auto');
    const deckOptions = { ...options, language: targetLanguage };
    const deckBrief = {
      ...enhancedBrief,
      language_preference: targetLanguage !== 'auto'
        ? targetLanguage
        : (enhancedBrief?.language_preference || 'auto'),
      _options: deckOptions,
    };

    const isTwoSlidesTemplate = selectedTemplate && (
      String(selectedTemplate.template_id).startsWith('twoslides_') ||
      selectedTemplate.twoslides_theme_id
    );

    if (isTwoSlidesTemplate) {
      console.log('🎨 TwoSlides template selected. Directing generation to 2Slides API...');
      try {
        // Safely extract the raw themeId (e.g. twoslides_theme-123 -> theme-123)
        let resolvedThemeId = selectedTemplate.twoslides_theme_id || selectedTemplate.template_id;
        if (typeof resolvedThemeId === 'string' && resolvedThemeId.startsWith('twoslides_')) {
          resolvedThemeId = resolvedThemeId.replace('twoslides_', '');
        }

        const twoSlidesResult = await twoSlidesService.generateSlides(
          deckBrief.enhanced_topic || deckBrief.source_topic || 'Presentation',
          [],
          null,
          {
            slideCount: deckBrief.suggested_slide_count || options.slideCount || 8,
            targetLanguage: targetLanguage === 'urdu' ? 'ur' : (targetLanguage === 'english' ? 'en' : 'Auto'),
            themeId: resolvedThemeId,
            themeName: selectedTemplate.template_name || selectedTemplate.name,
            colors: selectedTemplate.color_scheme
          }
        );

        return {
          title: twoSlidesResult.data.title,
          language: twoSlidesResult.data.language,
          slides: twoSlidesResult.data.slides,
          template: selectedTemplate,
          brief: deckBrief,
          twoslidesJobId: twoSlidesResult.twoslidesJobId,
          twoslidesFileLocalPath: twoSlidesResult.twoslidesFileLocalPath,
        };
      } catch (twoSlidesError) {
        console.warn('❌ Direct 2Slides generation failed, attempting local fallback:', twoSlidesError.message);
      }
    }

    try {
      this._ensureInit();
      if (!this.openaiClient) {
        throw new Error('No AI generators configured');
      }

      const slides = await this.generateSlideContent(deckBrief, selectedTemplate);
      console.log(`✅ Generated ${slides.length} slides`);

      console.log('🖼️ Step 4: Finding images via Pixabay...');
      const slidesWithImages = await this.generateSlideImages(
        slides
      );
      console.log('✅ Image search complete');

      const targetUrdu = deckBrief?.language_preference === 'urdu';
      const targetEnglish = deckBrief?.language_preference === 'english';
      const urduRegex = /[\u0600-\u06FF]/;
      const firstSlideTitle = slidesWithImages?.[0]?.title || '';
      let resolvedTitle = deckBrief.enhanced_topic;

      if (targetUrdu) {
        resolvedTitle = urduRegex.test(firstSlideTitle)
          ? firstSlideTitle
          : (urduRegex.test(deckBrief.enhanced_topic || '') ? deckBrief.enhanced_topic : 'پریزنٹیشن کا موضوع');
      }

      return {
        title: resolvedTitle,
        language: targetUrdu ? 'ur' : targetEnglish ? 'en' : this._detectLanguage(deckBrief.enhanced_topic),
        slides: slidesWithImages,
        template: selectedTemplate,
        brief: deckBrief,
      };
    } catch (openaiError) {
      console.warn('❌ Pipeline OpenAI failed, falling back to 2Slides provider:', openaiError.message);
      
      const twoSlidesResult = await twoSlidesService.generateSlides(
        deckBrief.enhanced_topic || deckBrief.source_topic || 'Presentation',
        [],
        null,
        {
          slideCount: deckBrief.suggested_slide_count,
          targetLanguage: targetLanguage === 'urdu' ? 'ur' : (targetLanguage === 'english' ? 'en' : 'Auto'),
        }
      );

      return {
        title: twoSlidesResult.data.title,
        language: twoSlidesResult.data.language,
        slides: twoSlidesResult.data.slides,
        template: selectedTemplate,
        brief: deckBrief,
        twoslidesJobId: twoSlidesResult.twoslidesJobId,
        twoslidesFileLocalPath: twoSlidesResult.twoslidesFileLocalPath,
      };
    }
  }

  _detectLanguage(text) {
    const urduRegex = /[\u0600-\u06FF]/;
    return urduRegex.test(text) ? 'ur' : 'en';
  }
}

export default new PresentationPipeline();
