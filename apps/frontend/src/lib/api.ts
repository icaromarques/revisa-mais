import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Importante para enviar os cookies HTTP-Only automaticamente
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para tratamento global de erros (ex: Sessão Expirada)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Se retornar 401, a sessão expirou ou é inválida. Forçamos o logout local e redirecionamos.
      window.location.href = '/login?error=session_expired';
    }
    return Promise.reject(error);
  }
);