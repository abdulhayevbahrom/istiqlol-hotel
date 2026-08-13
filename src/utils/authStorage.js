const AUTH_KEY = "oydin_auth";

export const loadAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

export const saveAuth = (auth) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export { AUTH_KEY };
