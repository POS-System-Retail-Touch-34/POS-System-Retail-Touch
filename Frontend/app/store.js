import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import cartReducer from '../features/sales/cartSlice'
import uiReducer from './uiSlice'
import settingsReducer from '../features/settings/settingsSlice'
import notificationsReducer from '../features/notifications/notificationsSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer,
        ui: uiReducer,
        settings: settingsReducer,
        notifications: notificationsReducer,
    },
})
