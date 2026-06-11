export const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
        return "₹0.00";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const parseCurrency = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    // Remove currency symbol and formatting commas
    const cleanValue = value.replace(/₹|,/g, "").trim();
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};
