import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currency: 'INR',
    gstRates: {
        cgst: 9, // %
        sgst: 9, // %
        igst: 18, // %
    },
    interstate: false,
    loyaltyConversionRate: 1, // 1 point = ₹1
};

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        updateGstRates: (state, action) => {
            state.gstRates = { ...state.gstRates, ...action.payload };
        },
        updateLoyaltyConversionRate: (state, action) => {
            state.loyaltyConversionRate = action.payload;
        },
        updateInterstate: (state, action) => {
            state.interstate = !!action.payload;
        },
        // We can add other global settings here later
    },
});

export const { updateGstRates, updateLoyaltyConversionRate, updateInterstate } = settingsSlice.actions;

export default settingsSlice.reducer;
