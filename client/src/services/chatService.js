import api from './api';

export const chatService = {
  // Legacy single-step
  async generateSlides(message, chatId = null, template = 'business', language = 'auto', file = null) {
    if (file) {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('template', template);
      formData.append('language', language);
      if (chatId) formData.append('chatId', chatId);
      formData.append('file', file);

      const res = await api.post('/chat/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      return res.data;
    }

    const res = await api.post('/chat/generate', { message, chatId, template, language }, {
      timeout: 120000,
    });
    return res.data;
  },

  // Pipeline Step 1: Build Topic Brief
  async enhanceTopic(message, options = {}, file = null) {
    if (file) {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('slideCount', options.slideCount);
      formData.append('language', options.language);
      formData.append('file', file);

      const res = await api.post('/chat/enhance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 150000,
      });
      return res.data;
    }

    const res = await api.post('/chat/enhance', {
      message,
      slideCount: options.slideCount,
      language: options.language,
    }, { timeout: 150000 });
    return res.data;
  },

  // Pipeline Step 2: Suggest Templates
  async suggestTemplates(brief, query = null) {
    const res = await api.post('/chat/suggest-templates', { brief, query }, { timeout: 150000 });
    return res.data;
  },

  // Pipeline Step 3+4: Generate Slides + Images
  async generatePipelineSlides(brief, template, options = {}) {
    const payload = { brief, template };
    if (options.role) payload.role = options.role;
    if (options.language) payload.language = options.language;
    if (options.slideCount) payload.slideCount = options.slideCount;
    if (options.tone) payload.tone = options.tone;
    if (options.audience) payload.audience = options.audience;
    if (options.structure) payload.structure = options.structure;
    if (options.depth) payload.depth = options.depth;
    if (options.presType) payload.presType = options.presType;
    if (options.statsLevel) payload.statsLevel = options.statsLevel;
    if (options.speakerNotes !== undefined) payload.speakerNotes = options.speakerNotes;
    if (options.visualHints !== undefined) payload.visualHints = options.visualHints;
    if (options.animHints !== undefined) payload.animHints = options.animHints;
    if (options.includeQA !== undefined) payload.includeQA = options.includeQA;
    if (options.includeKey !== undefined) payload.includeKey = options.includeKey;

    const res = await api.post('/chat/generate-pipeline', payload, { timeout: 300000 });
    return res.data;
  },

  async sendMessage(message) {
    const res = await api.post('/chat/message', { message });
    return res.data;
  },

  async getChatHistory() {
    const res = await api.get('/chat/history');
    return res.data;
  },

  async getChatById(id) {
    const res = await api.get(`/chat/history/${id}`);
    return res.data;
  },
};
