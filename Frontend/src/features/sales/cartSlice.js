import { createSlice } from '@reduxjs/toolkit'
import { createSelector } from 'reselect'

/**
 * Cart item shape (flat):
 *   { id, name, sku, price, qty, taxRate, stock }
 *
 * "stock" mirrors backend Product.currentStock and is used purely for
 * client-side "out of stock" display — it is NOT modified when adding to cart.
 */
const initialState = {
    items: [],
    discount: 0,           // percentage 0–100
    loyaltyPointsUsed: 0,  // absolute point value
    heldTransactions: [],
    activeCustomer: null,
}

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart(state, action) {
            const product = action.payload
            // Normalise: backend uses `currentStock`, frontend grid also checks `stock`
            const stock = product.currentStock ?? product.stock ?? 0
            const existing = state.items.find(i => i.id === product.id)
            if (!product.isManual && stock <= 0) {
                return
            }
            if (existing) {
                const nextQty = existing.qty + 1
                if (!existing.isManual && nextQty > existing.stock) {
                    return
                }
                existing.qty = nextQty
            } else {
                state.items.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '',
                    categoryName: product.categoryName || product.category || null,
                    price: product.price,
                    taxRate: product.taxRate || 0,
                    stock,
                    isManual: !!product.isManual,
                    qty: 1,
                })
            }
        },
        removeFromCart(state, action) {
            state.items = state.items.filter(i => i.id !== action.payload)
        },
        updateQty(state, action) {
            const { id, qty } = action.payload
            const item = state.items.find(i => i.id === id)
            if (item) {
                const normalizedQty = Math.floor(Number(qty))
                if (!Number.isFinite(normalizedQty)) {
                    return
                }
                if (normalizedQty <= 0) {
                    state.items = state.items.filter(i => i.id !== id)
                } else {
                    if (!item.isManual && normalizedQty > item.stock) {
                        return
                    }
                    item.qty = normalizedQty
                }
            }
        },
        updateItemPrice(state, action) {
            const { id, price } = action.payload
            const item = state.items.find(i => i.id === id)
            if (item) {
                item.price = price
            }
        },
        setDiscount(state, action) {
            state.discount = Math.min(100, Math.max(0, action.payload))
        },
        setLoyaltyPointsUsed(state, action) {
            state.loyaltyPointsUsed = Math.max(0, action.payload || 0)
        },
        setActiveCustomer(state, action) {
            state.activeCustomer = action.payload
            state.loyaltyPointsUsed = 0
        },
        holdTransaction(state) {
            if (state.items.length > 0) {
                state.heldTransactions.push({
                    id: Date.now(),
                    items: [...state.items],
                    discount: state.discount,
                    loyaltyPointsUsed: state.loyaltyPointsUsed,
                    customer: state.activeCustomer,
                    heldAt: new Date().toISOString(),
                })
                state.items = []
                state.discount = 0
                state.loyaltyPointsUsed = 0
                state.activeCustomer = null
            }
        },
        resumeTransaction(state, action) {
            const held = state.heldTransactions.find(t => t.id === action.payload)
            if (held) {
                state.items = held.items
                state.discount = held.discount
                state.loyaltyPointsUsed = held.loyaltyPointsUsed || 0
                state.activeCustomer = held.customer
                state.heldTransactions = state.heldTransactions.filter(t => t.id !== action.payload)
            }
        },
        deleteHeld(state, action) {
            state.heldTransactions = state.heldTransactions.filter(t => t.id !== action.payload)
        },
        clearCart(state) {
            state.items = []
            state.discount = 0
            state.loyaltyPointsUsed = 0
            state.activeCustomer = null
        },
    },
})

export const {
    addToCart, removeFromCart, updateQty, updateItemPrice,
    setDiscount, setLoyaltyPointsUsed, setActiveCustomer,
    holdTransaction, resumeTransaction, deleteHeld, clearCart,
} = cartSlice.actions

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectSubtotal = (state) =>
    state.cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)

export const selectDiscountAmount = (state) => {
    const sub = selectSubtotal(state)
    return (sub * state.cart.discount) / 100
}

export const selectLoyaltyDiscount = (state) => {
    const conversionRate = state.settings?.loyaltyConversionRate || 1
    return state.cart.loyaltyPointsUsed * conversionRate
}

export const selectTaxInfo = createSelector(
    [
        selectSubtotal,
        selectDiscountAmount,
        selectLoyaltyDiscount,
        (state) => state.settings?.gstRates,
        (state) => state.settings?.interstate,
    ],
    (sub, disc, loyaltyDisc, gstRates, interstate) => {
        const taxableAmount = Math.max(0, sub - disc - loyaltyDisc)
        const rates = gstRates || { cgst: 9, sgst: 9, igst: 0 }
        const cgst = interstate ? 0 : taxableAmount * (rates.cgst / 100)
        const sgst = interstate ? 0 : taxableAmount * (rates.sgst / 100)
        const igst = interstate ? taxableAmount * (rates.igst / 100) : 0
        return {
            cgst: { rate: rates.cgst, amount: cgst },
            sgst: { rate: rates.sgst, amount: sgst },
            igst: { rate: rates.igst, amount: igst },
            totalTax: cgst + sgst + igst,
        }
    }
)

export const selectTax = (state) => selectTaxInfo(state).totalTax

export const selectTotal = (state) => {
    const sub = selectSubtotal(state)
    const disc = selectDiscountAmount(state)
    const loyaltyDisc = selectLoyaltyDiscount(state)
    const { totalTax } = selectTaxInfo(state)
    return Math.max(0, sub - disc - loyaltyDisc + totalTax)
}

export default cartSlice.reducer
