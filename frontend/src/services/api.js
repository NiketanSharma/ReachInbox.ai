import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  async loginWithGoogle(credential, profile) {
    const response = await apiClient.post('/auth/google', {
      credential,
      ...profile,
    });
    if (response.data.token) {
      localStorage.setItem('reachinbox_token', response.data.token);
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  logout() {
    localStorage.removeItem('reachinbox_token');
  },

  // Emails
  async getScheduledEmails(params) {
    const response = await apiClient.get('/emails/scheduled', {
      params,
    });
    return response.data;
  },

  async getSentEmails(params) {
    const response = await apiClient.get('/emails/sent', {
      params,
    });
    return response.data;
  },

  async scheduleEmails(payload) {
    const response = await apiClient.post('/emails/schedule', payload);
    return response.data;
  },

  async cancelScheduledEmail(id) {
    const response = await apiClient.delete(`/emails/${id}`);
    return response.data;
  },

  async getSenders() {
    const response = await apiClient.get('/emails/senders');
    return response.data.senders;
  },

  // Slack
  async getSlackStatus() {
    const response = await apiClient.get('/slack/status');
    return response.data;
  },

  async connectSlackWebhook(webhookUrl, channel) {
    const response = await apiClient.post('/slack/webhook', { webhookUrl, channel });
    return response.data;
  },

  async testSlackNotification() {
    const response = await apiClient.post('/slack/test');
    return response.data;
  },

  async disconnectSlack() {
    const response = await apiClient.post('/slack/disconnect');
    return response.data;
  },

  // Rate Limiter
  async getRateLimitStatus(senderEmail) {
    const response = await apiClient.get(`/emails/ratelimit/${encodeURIComponent(senderEmail)}`);
    return response.data;
  },

  async resetRateLimit(senderEmail) {
    const response = await apiClient.post('/emails/ratelimit/reset', { senderEmail });
    return response.data;
  },
};
