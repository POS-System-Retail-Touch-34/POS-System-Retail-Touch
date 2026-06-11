import { createSlice } from "@reduxjs/toolkit";

const stored = JSON.parse(localStorage.getItem("auth") || "null");

const initialState = {
  user: stored?.user || null,
  accessToken: stored?.accessToken || null,
  isAuthenticated: !!stored?.accessToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = {
        username: action.payload.username,
        email: action.payload.email,
        role: action.payload.role,
      };

      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;

      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: state.user,
          accessToken: state.accessToken,
        }),
      );
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("auth");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
