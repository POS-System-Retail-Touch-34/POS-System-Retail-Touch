import { createSlice } from '@reduxjs/toolkit'

const normalizeRole = (role) => (typeof role === 'string' ? role.toUpperCase() : null)

export function isNotificationVisibleToUser(notification, user) {
    if (!user) return false

    const username = user.username
    const role = normalizeRole(user.role)
    const targetUsers = notification.targetUsers || []
    const targetRoles = (notification.targetRoles || []).map(normalizeRole)

    // Backward compatibility for older payloads.
    const legacyRole = normalizeRole(notification.targetRole)

    if (targetUsers.length === 0 && targetRoles.length === 0 && !legacyRole) {
        return true
    }

    if (targetUsers.includes(username)) return true
    if (legacyRole && legacyRole === role) return true
    return targetRoles.includes(role)
}

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: {
        // { id, type, title, message, senderName, senderRole, referenceId, createdAt, status, targetRoles, targetUsers, readBy }
        list: [],
    },
    reducers: {
        addNotification(state, action) {
            const payload = action.payload || {}
            const createdAt = payload.createdAt || new Date().toISOString()

            state.list.unshift({
                id: payload.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                type: payload.type || 'GENERAL',
                title: payload.title || 'Notification',
                message: payload.message || '',
                senderName: payload.senderName || 'System',
                senderRole: payload.senderRole || 'SYSTEM',
                referenceId: payload.referenceId || `REF-${Date.now()}`,
                status: payload.status || 'UNREAD',
                createdAt,
                timestamp: createdAt,
                targetRoles: payload.targetRoles || [],
                targetUsers: payload.targetUsers || [],
                data: payload.data || {},
                readBy: payload.readBy || [],
            })
        },
        markAsRead(state, action) {
            const { id, userId, username } = action.payload
            const reader = userId || username
            const notif = state.list.find(n => n.id === id)
            if (notif && reader && !notif.readBy.includes(reader)) {
                notif.readBy.push(reader)
                notif.status = 'READ'
            }
        },
        updateNotificationStatus(state, action) {
            const { id, status } = action.payload
            const notif = state.list.find(n => n.id === id)
            if (notif) notif.status = status
        }
    }
})

export const { addNotification, markAsRead, updateNotificationStatus } = notificationsSlice.actions
export default notificationsSlice.reducer
