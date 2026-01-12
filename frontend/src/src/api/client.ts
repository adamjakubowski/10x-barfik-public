import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// Get API base URL from runtime config (injected by Docker) or build-time env var or fallback
const getApiBaseUrl = (): string => {
  // @ts-ignore - window.ENV is injected at runtime by Docker entrypoint
  if (typeof window !== 'undefined' && window.ENV?.API_BASE_URL) {
    // @ts-ignore
    return window.ENV.API_BASE_URL;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
};

const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodaj JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - obsługa odświeżania tokenu
type QueueItem = {
  resolve: (token?: string | null) => void;
  reject: (error: Error) => void;
};

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = sessionStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token, redirect to login
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${getApiBaseUrl()}/api/auth/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        sessionStorage.setItem('authToken', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        processQueue(null, access);

        return apiClient(originalRequest);
      } catch (refreshError) {
        const error = refreshError instanceof Error ? refreshError : new Error('Token refresh failed');
        processQueue(error, null);
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
