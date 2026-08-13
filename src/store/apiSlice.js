import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, setEmployeeAuth } from "./authSlice";
import API_CONFIG from "../config/apiConfig";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.MAIN_API.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const message =
    result?.error?.data?.message || result?.error?.data?.innerData;
  const isSessionRevoked =
    result?.error?.status === 401 &&
    String(message || "")
      .toLowerCase()
      .includes("session bekor qilingan");
  const isExpiredToken =
    result?.error?.status === 401 &&
    String(message || "")
      .toLowerCase()
      .includes("jwt expired");

  if (isSessionRevoked) {
    api.dispatch(logout());
    return result;
  }

  // Har qanday boshqa 401 ham yaroqsiz yoki bekor qilingan sessiya deb
  // qabul qilinadi. `RequireAuth` token tozalangach foydalanuvchini login
  // sahifasiga qaytaradi.
  if (result?.error?.status !== 401) return result;

  if (!isExpiredToken) {
    api.dispatch(logout());
    return result;
  }

  const refreshToken = api.getState()?.auth?.refreshToken;
  if (!refreshToken) {
    api.dispatch(logout());
    return result;
  }

  const refreshResult = await rawBaseQuery(
    {
      url: "/employee/refresh",
      method: "POST",
      body: { refreshToken },
    },
    api,
    extraOptions,
  );

  const refreshed = refreshResult?.data?.innerData;
  if (refreshed?.token) {
    api.dispatch(setEmployeeAuth(refreshed));
    result = await rawBaseQuery(args, api, extraOptions);
    if (result?.error?.status === 401) api.dispatch(logout());
    return result;
  }

  api.dispatch(logout());
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Employee",
    "Room",
    "Guest",
    "VipRequest",
    "Expense",
    "Settings",
    "Service",
    "HallBooking",
  ],
  endpoints: () => ({}),
});
