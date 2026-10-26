import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTokens = () => {
  const tokensStr = localStorage.getItem('petty_tokens');
  if (!tokensStr) return null;
  try {
    const tokens = JSON.parse(tokensStr);
    // Check if session has expired: 1 day (default) or 7 days (remember me)
    if (tokens.expires_at && Date.now() > tokens.expires_at) {
      clearTokens();
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
};

export const setTokens = (tokens, rememberMe = null) => {
  if (!tokens) {
    clearTokens();
    return;
  }
  let fallbackRemember = false;
  const existingTokensStr = localStorage.getItem('petty_tokens');
  if (existingTokensStr) {
    try {
      fallbackRemember = Boolean(JSON.parse(existingTokensStr).remember_me);
    } catch {}
  }
  const isRemember = rememberMe !== null
    ? Boolean(rememberMe)
    : (tokens.remember_me !== undefined ? Boolean(tokens.remember_me) : fallbackRemember);
  const now = Date.now();
  const durationMs = isRemember ? 7 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
  
  let expiresAtTimestamp;
  if (tokens.expires_at) {
    expiresAtTimestamp = typeof tokens.expires_at === 'number'
      ? tokens.expires_at
      : new Date(tokens.expires_at).getTime();
  } else {
    expiresAtTimestamp = now + durationMs;
  }

  const payload = {
    ...tokens,
    remember_me: isRemember,
    expires_at: expiresAtTimestamp
  };
  localStorage.setItem('petty_tokens', JSON.stringify(payload));
};

export const clearTokens = () => {
  localStorage.removeItem('petty_tokens');
  localStorage.removeItem('petty_user');
};

export const getCurrentUser = () => {
  const tokens = getTokens();
  if (!tokens) {
    localStorage.removeItem('petty_user');
    return null;
  }
  const user = localStorage.getItem('petty_user');
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user) => {
  localStorage.setItem('petty_user', JSON.stringify(user));
};

export const getMediaUrl = (url) => {
  if (!url) return '';
  // Normalize local backend URLs to relative path so it routes through Vite proxy
  return url.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost):8000/, '');
};

/**
 * Standardize dates across application to DD/MM/YYYY
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      const parts = String(dateInput).split(/[-/T ]/);
      if (parts.length >= 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

/**
 * Standardize date-times to DD/MM/YYYY, HH:MM AM/PM
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateInput);
  }
};

// Department APIs
export const fetchDepartments = async (activeOnly = false) => {
  const res = await api.get('/departments/', { params: activeOnly ? { active_only: 1 } : {} });
  return res.data;
};

export const createDepartment = async (data) => {
  const res = await api.post('/departments/', data);
  return res.data;
};

export const updateDepartment = async (id, data) => {
  const res = await api.patch(`/departments/${id}/`, data);
  return res.data;
};

export const deleteDepartment = async (id) => {
  const res = await api.delete(`/departments/${id}/`);
  return res.data;
};

// Request interceptor: attach Access Token
api.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh token on 401 or expired session
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login/') || originalRequest?.url?.includes('/auth/refresh/');

    if ((status === 401 || (status === 403 && originalRequest?.url?.includes('/auth/profile/'))) && !originalRequest?._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const tokens = getTokens();
      if (tokens?.refresh) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = res.data;
          setTokens(newTokens, newTokens.remember_me !== undefined ? newTokens.remember_me : tokens.remember_me);
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        } catch (refreshErr) {
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

