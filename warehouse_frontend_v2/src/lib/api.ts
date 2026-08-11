import axios, { type AxiosError } from "axios";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

const UNSAFE_ERROR_CONTENT = /\b(sql|select|insert|update|delete|from|where|constraint|duplicate entry|jdbc|hibernate|postgres|mysql|oracle|exception|stack trace|\bat\s+[\w.$]+\(|org\.|com\.)\b|\?\s*,\s*\?/i;

type ApiErrorPayload = {
  message?: unknown;
};

function isSafeCustomerMessage(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= 300
    && !UNSAFE_ERROR_CONTENT.test(value);
}

/** Returns only customer-safe API text; never exposes raw Axios or server diagnostics. */
export function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const message = axiosError.response?.data?.message;
  return isSafeCustomerMessage(message) ? message.trim() : fallback;
}

/** Read token from whichever storage holds it (localStorage = persistent, sessionStorage = tab-only). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

/** Clear token from both storages. */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

// Thêm token vào mọi request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tự động xử lý lỗi 401 (Hết hạn token)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const fallback = "We couldn't complete your request. Please try again.";
    const safeMessage = getErrorMessage(error, fallback);

    if (error.response) {
      error.response.data = { message: safeMessage };
    }
    error.message = safeMessage;

    if (error.response?.status === 401 && typeof window !== "undefined") {
      removeToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Helper to decode JWT without a library
export function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
