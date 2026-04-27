import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// System prompt for slide generation
const SLIDE_SYSTEM_PROMPT = `You are SlideEdge AI, a world-class presentation designer that creates beautifully structured, content-rich slide decks.

RULES:
1. Generate 8-12 slides for a complete, professional presentation
2. Each slide MUST have:
   - A compelling heading (short, impactful, 3-7 words)
   - A detailed content paragraph (2-3 sentences, informative)
   - 3-5 well-written bullet points (each 8-15 words, specific and actionable)
   - Speaker notes (talking points for the presenter, 2-3 sentences)
   - An imageQuery that describes a specific, vivid, professional stock photo scene (NOT generic terms)
3. If the user writes in Urdu, generate ALL content in Urdu with proper grammar
4. If the user writes in English, generate ALL content in English
5. Slide structure: Title → Introduction → 4-6 Content/Analysis Slides → Key Takeaways → Conclusion/Call to Action
6. Content should be professional, insightful, and ready for a C-level or academic audience
7. imageQuery MUST be in English and describe a specific visual scene, e.g. "team of professionals collaborating around a modern whiteboard in a bright office" NOT just "teamwork"
8. Use varied layouts: title for the first slide, then mix content, image-right, bullets, two-column, and quote layouts

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no explanation, ONLY JSON):
{
  "title": "Compelling Presentation Title",
  "language": "en" or "ur",
  "slides": [
    {
      "order": 1,
      "heading": "Short Impactful Heading",
      "content": "Detailed paragraph with real information and insights about this topic.",
      "bullets": ["Specific point with details", "Another valuable insight", "Actionable recommendation"],
      "notes": "Speaker talking points for this slide",
      "imageQuery": "specific vivid photo scene description in English",
      "layout": "title|content|image-right|image-left|two-column|bullets|quote"
    }
  ]
}`;

class AIService {
  constructor() {
    this.providers = this._initProviders();
  }

  _initProviders() {
    const priorityStr = process.env.AI_PROVIDER_PRIORITY || 'gemini,openai';
    const priority = priorityStr.split(',').map(p => p.trim());
    const providers = [];

    for (const provider of priority) {
      if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        providers.push({
          name: 'gemini',
          generate: this._generateWithGemini.bind(this),
        });
      } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        providers.push({
          name: 'openai',
          generate: this._generateWithOpenAI.bind(this),
        });
      }
    }

    if (providers.length === 0) {
      console.warn('⚠️  No AI providers configured. Add GEMINI_API_KEY or OPENAI_API_KEY to .env');
    } else {
      console.log(`🤖 AI Providers: ${providers.map(p => p.name).join(' → ')}`);
    }

    return providers;
  }

  async generateSlides(userMessage, chatHistory = [], file = null) {
    if (this.providers.length === 0) {
      return this._getFallbackResponse(userMessage);
    }

    for (const provider of this.providers) {
      try {
        console.log(`🔄 Trying ${provider.name}...`);
        const result = await provider.generate(userMessage, chatHistory, file);
        console.log(`✅ ${provider.name} succeeded`);
        return result;
      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        continue;
      }
    }

    console.warn('⚠️  All AI providers failed, using fallback');
    return this._getFallbackResponse(userMessage);
  }

  async _generateWithGemini(userMessage, chatHistory, file = null) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `${SLIDE_SYSTEM_PROMPT}\n\nUser Request: ${userMessage}\n\nGenerate the presentation JSON:`;

    let result;
    if (file && file.path) {
      // Multimodal: send image with text
      const fs = await import('fs');
      const imageData = fs.readFileSync(file.path);
      const base64 = imageData.toString('base64');

      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.mimeType,
            data: base64,
          },
        },
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    const response = result.response;
    const text = response.text();

    return this._parseAIResponse(text, userMessage);
  }

  async _generateWithOpenAI(userMessage, chatHistory) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: 'system', content: SLIDE_SYSTEM_PROMPT },
      ...chatHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    });

    const text = completion.choices[0].message.content;
    return this._parseAIResponse(text, userMessage);
  }

  _parseAIResponse(text, userMessage) {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const data = JSON.parse(jsonStr);
      // Validate structure
      if (!data.title || !data.slides || !Array.isArray(data.slides)) {
        throw new Error('Invalid response structure');
      }
      return {
        success: true,
        provider: 'ai',
        data: {
          title: data.title,
          language: data.language || 'en',
          slides: data.slides.map((slide, index) => ({
            order: slide.order || index + 1,
            heading: slide.heading || `Slide ${index + 1}`,
            content: slide.content || '',
            bullets: slide.bullets || [],
            notes: slide.notes || '',
            imageQuery: slide.imageQuery || userMessage,
            imageUrl: '',
            layout: slide.layout || 'content',
          })),
        },
      };
    } catch (parseError) {
      console.error('JSON parse error, attempting repair...');
      return this._getFallbackResponse(userMessage);
    }
  }

  _getFallbackResponse(userMessage) {
    // Detect language
    const urduRegex = /[\u0600-\u06FF]/;
    const isUrdu = urduRegex.test(userMessage);
    const lang = isUrdu ? 'ur' : 'en';

    const slides = isUrdu ? [
      { order: 1, heading: userMessage, content: 'پریزنٹیشن کا عنوان', bullets: ['موضوع کا تعارف', 'اہم نکات', 'تفصیلی جائزہ'], notes: '', imageQuery: userMessage, imageUrl: '', layout: 'title' },
      { order: 2, heading: 'تعارف', content: `${userMessage} کے بارے میں بنیادی معلومات`, bullets: ['پس منظر', 'موجودہ صورتحال', 'اہمیت'], notes: '', imageQuery: `${userMessage} introduction`, imageUrl: '', layout: 'content' },
      { order: 3, heading: 'اہم نکات', content: 'موضوع کے کلیدی پہلو', bullets: ['پہلا نکتہ', 'دوسرا نکتہ', 'تیسرا نکتہ', 'چوتھا نکتہ'], notes: '', imageQuery: `${userMessage} key points`, imageUrl: '', layout: 'bullets' },
      { order: 4, heading: 'تجزیہ', content: 'تفصیلی تجزیہ اور جائزہ', bullets: ['فوائد', 'چیلنجز', 'مواقع'], notes: '', imageQuery: `${userMessage} analysis`, imageUrl: '', layout: 'image-right' },
      { order: 5, heading: 'نتیجہ', content: 'خلاصہ اور سفارشات', bullets: ['اہم نتائج', 'تجاویز', 'آگے کا راستہ'], notes: '', imageQuery: `${userMessage} conclusion`, imageUrl: '', layout: 'content' },
    ] : [
      { order: 1, heading: userMessage, content: 'Presentation Title Slide', bullets: ['Topic Overview', 'Key Points', 'Detailed Analysis'], notes: '', imageQuery: userMessage, imageUrl: '', layout: 'title' },
      { order: 2, heading: 'Introduction', content: `An overview of ${userMessage}`, bullets: ['Background context', 'Current landscape', 'Why this matters'], notes: '', imageQuery: `${userMessage} introduction overview`, imageUrl: '', layout: 'content' },
      { order: 3, heading: 'Key Concepts', content: 'Understanding the core elements', bullets: ['Core concept 1', 'Core concept 2', 'Core concept 3', 'Core concept 4'], notes: '', imageQuery: `${userMessage} concepts diagram`, imageUrl: '', layout: 'bullets' },
      { order: 4, heading: 'Analysis', content: 'Deep dive into the topic', bullets: ['Strengths', 'Challenges', 'Opportunities'], notes: '', imageQuery: `${userMessage} analysis data`, imageUrl: '', layout: 'image-right' },
      { order: 5, heading: 'Impact & Benefits', content: 'Real-world applications and benefits', bullets: ['Benefit 1', 'Benefit 2', 'Benefit 3'], notes: '', imageQuery: `${userMessage} benefits impact`, imageUrl: '', layout: 'two-column' },
      { order: 6, heading: 'Conclusion', content: 'Summary and next steps', bullets: ['Key takeaways', 'Recommendations', 'Future outlook'], notes: '', imageQuery: `${userMessage} conclusion future`, imageUrl: '', layout: 'content' },
    ];

    return {
      success: true,
      provider: 'fallback',
      data: { title: userMessage, language: lang, slides },
    };
  }

  // Chat response (non-slide conversation)
  async chat(userMessage, chatHistory = []) {
    if (this.providers.length === 0) {
      return { reply: 'I can help you create presentations! Please provide a topic and I will generate slides for you. You can write in English or Urdu.' };
    }

    for (const provider of this.providers) {
      try {
        if (provider.name === 'gemini') {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const chatPrompt = `You are SlideEdge AI chatbot. You help users create presentations. Be helpful, concise, and friendly. Support both English and Urdu. If the user wants to create a presentation, ask them for the topic and any preferences. Keep responses under 100 words.\n\nUser: ${userMessage}`;
          const result = await model.generateContent(chatPrompt);
          return { reply: result.response.text() };
        } else if (provider.name === 'openai') {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are SlideEdge AI chatbot. Help users create presentations. Be helpful, concise, friendly. Support English and Urdu. Keep responses under 100 words.' },
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
