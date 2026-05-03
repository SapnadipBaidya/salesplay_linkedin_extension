import axios from "axios";
import { API_BASE_URL, IQ_API_V2_BASE_URL } from './API_URLS';
import { sendMessageAsync } from "./uiUtils";

// --- 1. Environment & State ---
export const isExtension =
  // @ts-ignore
  typeof chrome !== "undefined" &&
  // @ts-ignore
  chrome.runtime &&
  // @ts-ignore
  chrome.runtime.id;

// --- 2. Storage Helpers ---
export const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
};

export const removeTokens = () => {
  if (isExtension) {
    // @ts-ignore
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH" });
  } else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.clear();
    sessionStorage.clear();
  }
};

// --- 3. Token Retrieval Logic ---
export const getRefreshToken = async () => {
  if (isExtension) {
    let token = null;
    await sendMessageAsync({ type: "GET_AUTH_STATUS" }).then((response) => {
      console.log("using isExtension getRefreshToken", response);
      token = response?.refreshToken;
    });
    return token;
  }
  return localStorage.getItem('refresh_token');
};

export const getAccessToken = async () => {
  if (isExtension) {
    let token = null;
    await sendMessageAsync({ type: "GET_AUTH_STATUS" }).then((response) => {
      console.log("using isExtension getAccessToken", response);
      token = response?.accessToken;
    });
    return token;
  }
  return localStorage.getItem('access_token');
};

// --- 4. Core Auth Actions ---
export const refreshAccessToken = async () => {
  try {
    const api_refresh = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    api_refresh.interceptors.request.use(async (config) => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        config.headers.Authorization = `Bearer ${refreshToken}`;
      }
      return config;
    });

    const response = await api_refresh.post('/auth/refresh');
    const { access_token } = response.data.result;

    if (access_token) {
      localStorage.setItem('access_token', access_token);
      return access_token;
    } else {
      throw new Error('Access token not returned.');
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

// --- 5. Interceptor Factories ---
// Shared logic to avoid duplicating code between 'api' and 'iq_api_v2'
const setupInterceptors = (instance) => {
  instance.interceptors.request.use(
    async (config) => {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  instance.interceptors.response.use(
    response => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response) {
        switch (error.response.status) {
          case 401:
            if (!originalRequest._retry) {
              originalRequest._retry = true;
              try {
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                  return instance(originalRequest); 
                } else {
                  return Promise.reject(new Error('Failed to refresh access token.'));
                }
              } catch (refreshError) {
                removeTokens();
                return Promise.reject(refreshError);
              }
            }
            break;
          case 403: console.error('Forbidden access'); break;
          case 404: console.error('Resource not found'); break;
          case 500: console.error('Internal server error'); break;
          default: console.error(`Error: ${error.response.status}`, error.response.data);
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error', error.message);
      }
      return Promise.reject(error);
    }
  );
};

// --- 6. API Instances ---
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});
setupInterceptors(api);

export const iq_api_v2 = axios.create({
  baseURL: IQ_API_V2_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
setupInterceptors(iq_api_v2);

// --- 7. Domain Specific Functions ---
export const fetchUserDetails = async () => {
  try {
    const response = await api.get('/me/');
    return response.data.result.user_info;
  } catch (error) {
    console.error('Fetch user details error:', error);
    return false;
  }
};

export const loginToSP = async (email, password, userStat, isExtension) => {
  localStorage.clear();
  sessionStorage.clear();

  try {
    const response = await api.post("/auth/login", { email, password, userStat });
    const { access_token, refresh_token } = response.data.result || {};

    if (access_token && refresh_token) {
      if (isExtension) {
        await sendMessageAsync({
          type: "SAVE_AUTH",
          accessToken: access_token,
          refreshToken: refresh_token
        });
      } else {
        saveTokens(access_token, refresh_token);
      }
      return true;
    }
    return false;
  } catch (error) {
    throw error.response?.data || new Error("Unable to connect to the server.");
  }
};