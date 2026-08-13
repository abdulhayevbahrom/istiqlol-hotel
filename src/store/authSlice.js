import { createSlice } from "@reduxjs/toolkit";
import { clearAuth, loadAuth, saveAuth } from "../utils/authStorage";
import { allSections } from "../constants/navItems";

const persisted = loadAuth();

const initialState = {
  token: persisted?.token || "",
  refreshToken: persisted?.refreshToken || "",
  user: persisted?.user || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setEmployeeAuth(state, action) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || "";
      state.user = action.payload.user;
      saveAuth({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      });
    },
    setAdminAuth(state, action) {
      state.token = action.payload.token;
      state.refreshToken = "";
      state.user = {
        role: "admin",
        firstname: "Admin",
        lastname: "",
        sections: allSections,
      };
      saveAuth({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      });
    },
    logout(state) {
      state.token = "";
      state.refreshToken = "";
      state.user = null;
      clearAuth();
    },
  },
});

export const { setEmployeeAuth, setAdminAuth, logout } = authSlice.actions;
export default authSlice.reducer;
