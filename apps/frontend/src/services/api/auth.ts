import { apiClient } from '@/lib/api';

export const authApiService = {
  async getSession() {
    const response = await apiClient.get('/auth/session');
    return response.data;
  },

  async loginWithGoogle() {
    // Busca a URL de redirecionamento gerada pelo servidor
    const response = await apiClient.get('/auth/google');
    // Redireciona o navegador para o Google Consent Screen
    window.location.href = response.data.url;
  },

  async logout() {
    await apiClient.post('/auth/logout');
    window.location.href = '/login';
  }
};