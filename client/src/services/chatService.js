import api from './api';

export const chatService = {
  // Legacy single-step
  async generateSlides(message, chatId = null, template = 'modern-gradient', language = 'auto', file = null) {
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

  // Pipeline Step 1: Enhance Topic
  async enhanceTopic(message, options = {}) {
    const res = await api.post('/chat/enhance', {
      message,
      slideCount: options.slideCount,
      language: options.language,
    }, { timeout: 150000 });
    return res.data;
  },

  // Pipeline Step 2: Suggest Templates
  async suggestTemplates(brief) {
    const res = await api.post('/chat/suggest-templates', { brief }, { timeout: 150000 });
    return res.data;
  },

  // Pipeline Step 3+4: Generate Slides + Images
  async generatePipelineSlides(brief, template) {
    const res = await api.post('/chat/generate-pipeline', { brief, template }, { timeout: 300000 });
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
