import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Separate instance: refreshing must not trigger the same interceptors.
const refreshApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Attach the current access token to API requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    const isAuthRequest =
      requestUrl.includes("auth/login/") ||
      requestUrl.includes("auth/register/");

    const isRefreshRequest = requestUrl.includes("token/refresh/");

    if (
      status !== 401 ||
      !originalRequest ||
      isAuthRequest ||
      isRefreshRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh");

    // No refresh token available: sign in again.
    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Share one refresh request if several API calls fail together.
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post("token/refresh/", {
            refresh: refreshToken,
          })
          .then((response) => {
            const newAccess = response.data.access;
            localStorage.setItem("access", newAccess);

            // Save a rotated refresh token if Django returns one.
            if (response.data.refresh) {
              localStorage.setItem("refresh", response.data.refresh);
            }

            return newAccess;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Retry the failed request with the new access token.
      return api(originalRequest);
    } catch (refreshError) {
      logout();
      return Promise.reject(refreshError);
    }
  },
);

function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");

  window.location.href = "/login";
}

export default api;
