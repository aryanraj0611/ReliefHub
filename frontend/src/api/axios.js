import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // httpOnly refresh-token cookie sent automatically
});

// ── In-memory access token ────────────────────────────────────────────────────
let _accessToken = null;
let _isRefreshing = false;
let _refreshQueue = []; // pending requests waiting for the refresh to complete

export function setAuthToken(token) {
  _accessToken = token;
}

// ── Request interceptor — attach Bearer token ─────────────────────────────────
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Response interceptor — silent token refresh on 401 ───────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt a single refresh per failed request.
    // Skip if the failing request is itself the refresh call (avoid loops).
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retried = true;

      if (_isRefreshing) {
        // Queue subsequent 401s until the refresh resolves
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }

      _isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;
        setAuthToken(newToken);

        // Flush the queue
        _refreshQueue.forEach(({ resolve }) => resolve(newToken));
        _refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        // Refresh failed — flush queue with rejection and let callers handle it
        _refreshQueue.forEach(({ reject }) => reject(refreshError));
        _refreshQueue = [];
        setAuthToken(null);
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
