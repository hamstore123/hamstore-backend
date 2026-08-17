import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const fmtIDR = (n) =>
  "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const fileUrl = (u) => (!u ? "" : String(u).startsWith("http") ? u : `${BACKEND}${u}`);

export const fmtDate = (s) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
};

export default api;
