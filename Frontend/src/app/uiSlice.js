import { createSlice } from '@reduxjs/toolkit'

const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

const initialState = {
    darkMode: saved ? saved === 'dark' : prefersDark,
    sidebarOpen: true,
}

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleDarkMode(state) {
            state.darkMode = !state.darkMode
            localStorage.setItem('theme', state.darkMode ? 'dark' : 'light')
        },
        setSidebar(state, action) {
            state.sidebarOpen = action.payload
        },
    },
})

export const { toggleDarkMode, setSidebar } = uiSlice.actions
export default uiSlice.reducer
