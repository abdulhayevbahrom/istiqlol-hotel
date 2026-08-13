const getEnvValue = (key, fallback = "") => {
  const value = import.meta.env[key];
  if (typeof value !== "string") return fallback;

  const trimmedValue = value.trim();
  return trimmedValue || fallback;
};

const removeTrailingSlash = (url) => url.replace(/\/+$/, "");

const mainApiBaseUrl = removeTrailingSlash(
  getEnvValue("VITE_MAIN_API_BASE_URL", "https://oydinplaza.medme.uz"),
);

const defaultMainApiUrl = `${mainApiBaseUrl}/api`;
const mainApiUrl = removeTrailingSlash(
  getEnvValue("VITE_MAIN_API_URL", defaultMainApiUrl),
);

const attendanceApiUrl = removeTrailingSlash(
  getEnvValue("VITE_ATTENDANCE_API_BASE_URL", "http://38.242.156.195:8072/api"),
);

const API_CONFIG = {
  MAIN_API: {
    baseUrl: mainApiBaseUrl,
    apiUrl: mainApiUrl,
  },
  ATTENDANCE_API: {
    baseUrl: attendanceApiUrl,
  },
};

export default API_CONFIG;
