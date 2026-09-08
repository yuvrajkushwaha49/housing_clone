import { createSlice } from '@reduxjs/toolkit';

const storedTheme = localStorage.getItem('hous_theme') || 'light';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: storedTheme,
    sidebarCollapsed: false,
    sidebarMobileOpen: false,
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('hous_theme', state.theme);
      document.documentElement.setAttribute('data-bs-theme', state.theme);
      document.body.classList.toggle('theme-dark', state.theme === 'dark');
    },
    setTheme(state, action) {
      state.theme = action.payload;
      localStorage.setItem('hous_theme', state.theme);
      document.documentElement.setAttribute('data-bs-theme', state.theme);
      document.body.classList.toggle('theme-dark', state.theme === 'dark');
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarMobileOpen(state, action) {
      state.sidebarMobileOpen = action.payload;
    },
  },
});

export const { toggleTheme, setTheme, toggleSidebar, setSidebarMobileOpen } = uiSlice.actions;
export default uiSlice.reducer;
