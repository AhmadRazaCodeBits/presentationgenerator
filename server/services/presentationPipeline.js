import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// ============================================================================
// STEP 1 — Prompt Enhancer
// ============================================================================
const ENHANCE_PROMPT = (userInput) => `You are a professional presentation strategist and content architect.

A user wants to create a PowerPoint presentation. Your job is to enhance their rough topic/idea into a detailed, structured presentation brief.

User's raw input: "${userInput}"

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
const TEMPLATE_SUGGEST_PROMPT = (briefJSON) => `You are a PowerPoint design expert.

Based on this presentation brief:
${JSON.stringify(briefJSON)}

Suggest exactly 4 slide layout templates suited to this topic. Each template defines the visual pattern used THROUGHOUT the presentation.

Return a JSON array:
[
  {
    "template_id": "T1",
    "template_name": "string (catchy name e.g. 'Bold Splitter')",
    "description": "2-sentence description of the visual style",
    "best_for": "what kind of content/audience this suits",
    "layout_pattern": {
      "title_slide": "full-bleed image with centered title overlay",
      "content_slides": "alternating | image-left-text-right | text-left-image-right | top-image-bottom-text | icon-grid",
      "data_slides": "chart-left-insight-right | full-width-chart | split-stats",
      "section_divider": "color-block | minimal-line | full-image"
    },
    "color_scheme": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex"
    },
    "font_style": {
      "heading": "font name",
      "body": "font name"
    },
    "thumbnail_description": "Describe how a thumbnail of this template looks in 1 sentence"
  }
]

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`;

// ============================================================================
// STEP 3 — Slide Content Generator
// ============================================================================
const SLIDE_CONTENT_PROMPT = (briefJSON, templateJSON) => `You are a professional presentation writer and visual designer.

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
- Alternate image positions across slides (left → right → left) to create visual rhythm
- Every 3rd slide should be a data or stat slide
- Use the section-divider layout between major sections
- The closing slide must have a strong CTA or summary
- Keep body text SHORT — presentations are visual, not documents

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`;

// ============================================================================
// STEP 4 — Image Prompt Refiner
// ============================================================================
const REFINE_IMAGE_PROMPT = (rawPrompt, tone, primary, secondary, accent) =>
  `You are an expert at writing prompts for AI image generation.

Refine this image prompt for a professional PowerPoint slide:
"${rawPrompt}"

Presentation tone: ${tone}
Color palette: ${primary}, ${secondary}, ${accent}

Return a single improved prompt (max 60 words) that:
- Specifies realistic/illustrative style appropriate for business presentations
- Mentions the color palette direction
- Avoids any text, logos, or watermarks in the image
- Specifies lighting and composition (e.g. "soft studio lighting, centered composition")
- Is optimized for a 16:9 widescreen or half-slide panel

Return ONLY the refined prompt string.`;


class PresentationPipeline {
  constructor() {
    this.genAI = null;
    this._initialized = false;
  }

  _ensureInit() {
    if (this._initialized) return;
    this._initialized = true;
    
    const key = process.env.GEMINI_API_KEY;

    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
      const maskedKey = key.substring(0, 4) + '...' + key.length;
      console.log(`🔗 PresentationPipeline: Gemini AI connected (Key: ${maskedKey})`);
    } else {
      console.warn('⚠️  PresentationPipeline: No GEMINI_API_KEY found');
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

  async _generate(prompt) {
    this._ensureInit();
    if (!this.genAI) throw new Error('GEMINI_API_KEY not configured');

    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  // ============================================================================
  // STEP 1 — Enhance Topic
  // ============================================================================
  async enhanceTopic(userInput) {
    const text = await this._generate(ENHANCE_PROMPT(userInput));
    const brief = this._parseJSON(text);

    if (!brief.enhanced_topic || !brief.sections || !Array.isArray(brief.sections)) {
      throw new Error('Invalid enhanced brief structure');
    }

    brief.suggested_slide_count = brief.suggested_slide_count || 10;
    brief.tone = brief.tone || 'professional';
    brief.target_audience = brief.target_audience || 'General audience';
    brief.visual_themes = brief.visual_themes || ['minimalist'];
    brief.color_mood = brief.color_mood || 'corporate blue';
    brief.data_points_to_include = brief.data_points_to_include || [];

    return brief;
  }

  // ============================================================================
  // STEP 2 — Suggest Templates with Freepik
  // ============================================================================
  async suggestTemplates(enhancedBrief) {
    const text = await this._generate(TEMPLATE_SUGGEST_PROMPT(enhancedBrief));
    const templates = this._parseJSON(text);

    if (!Array.isArray(templates) || templates.length === 0) {
      throw new Error('Invalid templates response');
    }

    const freepikKey = process.env.FREEPIK_API_KEY || 'FPSX409e6228daaa25d7169b3ee40952d183';

    return await Promise.all(templates.slice(0, 4).map(async (t, i) => {
      const templateData = {
        template_id: t.template_id || `T${i + 1}`,
        template_name: t.template_name || `Template ${i + 1}`,
        description: t.description || '',
        best_for: t.best_for || '',
        layout_pattern: {
          title_slide: t.layout_pattern?.title_slide || 'full-bleed image with centered title overlay',
          content_slides: t.layout_pattern?.content_slides || 'alternating',
          data_slides: t.layout_pattern?.data_slides || 'chart-left-insight-right',
          section_divider: t.layout_pattern?.section_divider || 'color-block',
        },
        color_scheme: {
          primary: t.color_scheme?.primary || '#6C63FF',
          secondary: t.color_scheme?.secondary || '#FF6B6B',
          accent: t.color_scheme?.accent || '#00D2FF',
          background: t.color_scheme?.background || '#FFFFFF',
          text: t.color_scheme?.text || '#333333',
        },
        font_style: {
          heading: t.font_style?.heading || 'Calibri',
          body: t.font_style?.body || 'Calibri',
        },
        thumbnail_description: t.thumbnail_description || '',
        master_background_image: null,
      };

      // Fetch presentation template background from Freepik
      try {
        const query = encodeURIComponent(`presentation background ${templateData.color_scheme.primary} abstract`);
        const resp = await axios.get(`https://api.freepik.com/v1/resources?term=${query}&filters[orientation]=landscape&limit=3`, {
          headers: { 'x-freepik-api-key': freepikKey },
          timeout: 8000
        });
        if (resp.data?.data?.length > 0) {
          // Pick a pseudo-random image from the top 3 results
          const img = resp.data.data[i % resp.data.data.length];
          templateData.master_background_image = img.image?.source?.url || img.image?.url;
        }
      } catch (err) {
        console.warn(`⚠️ Freepik API Failed for Template ${i+1}:`, err.response?.data || err.message);
      }

      return templateData;
    }));
  }

  // ============================================================================
  // STEP 3 — Generate Slide Content
  // ============================================================================
  async generateSlideContent(enhancedBrief, selectedTemplate) {
    const text = await this._generate(SLIDE_CONTENT_PROMPT(enhancedBrief, selectedTemplate));
    const slides = this._parseJSON(text);

    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error('Invalid slides response');
    }

    return slides.map((s, i) => ({
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

  async generateSlideImages(slides, tone, colorScheme) {
    const pixabayKey = process.env.PIXABAY_API_KEY || '37488321-da707b30e65b22686f4cd3d92';

    const results = await Promise.allSettled(
      slides.map(async (slide) => {
        if (!slide.image_prompt || slide.image_position === 'none') {
          return { ...slide, imageUrl: '' };
        }

        // Refine the prompt to 2-3 snappy keywords for Pixabay
        const searchKeywords = await this.refineImagePrompt(slide.image_prompt);
        const encodedQuery = encodeURIComponent(searchKeywords);
        
        let imageUrl = '';
        try {
          const resp = await axios.get(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodedQuery}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`, { timeout: 10000 });
          
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
      slides,
      enhancedBrief.tone,
      selectedTemplate.color_scheme
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
