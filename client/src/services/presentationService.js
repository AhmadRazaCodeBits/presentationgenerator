import api, { API_BASE } from './api';

export const presentationService = {
  async getMyPresentations() {
    const res = await api.get('/presentations');
    return res.data;
  },

  async getPresentation(id) {
    const res = await api.get(`/presentations/${id}`);
    return res.data;
  },

  async updatePresentation(id, data) {
    const res = await api.put(`/presentations/${id}`, data);
    return res.data;
  },

  async deletePresentation(id) {
    const res = await api.delete(`/presentations/${id}`);
    return res.data;
  },

  async importPresentation(data) {
    const res = await api.post('/presentations/import', data);
    return res.data;
  },

  async getTemplates() {
    const res = await api.get('/presentations/templates');
    return res.data;
  },

  // Export URLs - token passed as query param because browser window.open can't send headers
  getExportPPTXUrl(id) {
    const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    const token = localStorage.getItem('slideedge_token');
    return `${base}/presentations/${id}/export/pptx?token=${token}`;
  },

  getExportPDFUrl(id) {
    const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    const token = localStorage.getItem('slideedge_token');
    return `${base}/presentations/${id}/export/pdf?token=${token}`;
  },

  // Alternative: download via Axios (for programmatic downloads)
  async downloadPPTX(id) {
    const res = await api.get(`/presentations/${id}/export/pptx`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presentation_${id}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadPDF(id) {
    const res = await api.get(`/presentations/${id}/export/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presentation_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadPublicPPTX(payload) {
    const res = await api.post('/presentations/export/public/pptx', payload, {
      responseType: 'blob',
      timeout: 240000,
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(payload?.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadPublicPDF(payload) {
    const res = await api.post('/presentations/export/public/pdf', payload, {
      responseType: 'blob',
      timeout: 240000,
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(payload?.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
