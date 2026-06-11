import dayjs from 'dayjs'

export const MOCK_PRODUCTS = [
    { id: 1, sku: 'BEV-001', name: 'Coca-Cola 330ml', category: 'Beverages', price: 1.5, cost: 0.7, stock: 240, minStock: 50, variants: [], image: null },
    { id: 2, sku: 'BEV-002', name: 'Pepsi 330ml', category: 'Beverages', price: 1.5, cost: 0.7, stock: 180, minStock: 50, variants: [], image: null },
    { id: 3, sku: 'BEV-003', name: 'Water Bottle 500ml', category: 'Beverages', price: 0.8, cost: 0.25, stock: 500, minStock: 100, variants: [], image: null },
    { id: 4, sku: 'SNK-001', name: 'Lays Classic Chips', category: 'Snacks', price: 2.5, cost: 1.2, stock: 8, minStock: 20, variants: [], image: null },
    { id: 5, sku: 'SNK-002', name: 'Doritos Nacho', category: 'Snacks', price: 2.8, cost: 1.3, stock: 45, minStock: 20, variants: [], image: null },
    { id: 6, sku: 'DAIRY-001', name: 'Whole Milk 1L', category: 'Dairy', price: 3.2, cost: 1.8, stock: 60, minStock: 30, variants: [], image: null },
    { id: 7, sku: 'DAIRY-002', name: 'Cheddar Cheese 200g', category: 'Dairy', price: 5.5, cost: 3.0, stock: 7, minStock: 15, variants: [], image: null },
    { id: 8, sku: 'BKRY-001', name: 'White Bread Loaf', category: 'Bakery', price: 2.9, cost: 1.4, stock: 35, minStock: 20, variants: [], image: null },
    { id: 9, sku: 'BKRY-002', name: 'Croissant', category: 'Bakery', price: 1.8, cost: 0.8, stock: 25, minStock: 10, variants: [], image: null },
    { id: 10, sku: 'ELC-001', name: 'AA Batteries (4pk)', category: 'Electronics', price: 6.5, cost: 3.0, stock: 5, minStock: 10, variants: [], image: null },
    { id: 11, sku: 'CLN-001', name: 'Dish Soap 500ml', category: 'Cleaning', price: 3.8, cost: 1.9, stock: 80, minStock: 20, variants: [], image: null },
    { id: 12, sku: 'FRZN-001', name: 'Ice Cream Vanilla 1L', category: 'Frozen', price: 7.5, cost: 4.0, stock: 20, minStock: 10, variants: [], image: null },
    { id: 13, sku: 'PER-001', name: 'Shampoo 400ml', category: 'Personal Care', price: 9.9, cost: 5.0, stock: 40, minStock: 15, variants: [], image: null },
    { id: 14, sku: 'CANDY-001', name: 'Snickers Bar', category: 'Candy', price: 1.2, cost: 0.5, stock: 150, minStock: 30, variants: [], image: null },
    { id: 15, sku: 'CANDY-002', name: 'Kitkat 4-Finger', category: 'Candy', price: 1.4, cost: 0.6, stock: 120, minStock: 30, variants: [], image: null },
]

export const MOCK_CUSTOMERS = [
    { id: 1, name: 'Alice Johnson', phone: '+1-555-0101', email: 'alice@example.com', address: '123 Maple St, Springfield', loyaltyPoints: 580, tier: 'Gold', joinDate: '2022-03-15', totalSpent: 1240.5 },
    { id: 2, name: 'Bob Martinez', phone: '+1-555-0202', email: 'bob@example.com', address: '456 Oak Ave, Shelbyville', loyaltyPoints: 210, tier: 'Silver', joinDate: '2023-07-22', totalSpent: 430.0 },
    { id: 3, name: 'Carol White', phone: '+1-555-0303', email: 'carol@example.com', address: '789 Pine Rd, Capital City', loyaltyPoints: 50, tier: 'Bronze', joinDate: '2024-01-10', totalSpent: 95.25 },
    { id: 4, name: 'David Lee', phone: '+1-555-0404', email: 'david@example.com', address: '321 Elm St, Springfield', loyaltyPoints: 1200, tier: 'Platinum', joinDate: '2021-11-05', totalSpent: 3800.0 },
    { id: 5, name: 'Emma Wilson', phone: '+1-555-0505', email: 'emma@example.com', address: '654 Birch Blvd, Shelbyville', loyaltyPoints: 320, tier: 'Silver', joinDate: '2023-02-18', totalSpent: 640.75 },
    { id: 6, name: 'Frank Brown', phone: '+1-555-0606', email: 'frank@example.com', address: '987 Cedar Ln, Capital City', loyaltyPoints: 75, tier: 'Bronze', joinDate: '2024-06-01', totalSpent: 150.0 },
]

export const MOCK_PURCHASE_HISTORY = {
    1: [
        { id: 'ORD-1001', date: '2024-11-15', items: [{ name: 'Coca-Cola 330ml', qty: 6, price: 1.5 }, { name: 'Lays Classic Chips', qty: 2, price: 2.5 }], total: 14.0, payment: 'Card' },
        { id: 'ORD-1002', date: '2024-12-01', items: [{ name: 'White Bread Loaf', qty: 1, price: 2.9 }, { name: 'Whole Milk 1L', qty: 2, price: 3.2 }], total: 9.3, payment: 'Cash' },
    ],
    2: [
        { id: 'ORD-2001', date: '2024-10-20', items: [{ name: 'Pepsi 330ml', qty: 4, price: 1.5 }], total: 6.0, payment: 'Mobile Pay' },
    ],
    4: [
        { id: 'ORD-4001', date: '2024-09-10', items: [{ name: 'Shampoo 400ml', qty: 2, price: 9.9 }, { name: 'Dish Soap 500ml', qty: 1, price: 3.8 }], total: 23.6, payment: 'Card' },
        { id: 'ORD-4002', date: '2024-11-22', items: [{ name: 'Ice Cream Vanilla 1L', qty: 3, price: 7.5 }], total: 22.5, payment: 'Cash' },
    ],
}

// Generate 30 day sales trend
const genSalesTrend = () => {
    const data = []
    for (let i = 29; i >= 0; i--) {
        const d = dayjs().subtract(i, 'day')
        const weekday = d.day()
        const base = weekday === 0 || weekday === 6 ? 2400 : 1600
        data.push({
            date: d.format('MMM DD'),
            sales: Math.round(base + Math.random() * 1200 - 300),
            orders: Math.round(40 + Math.random() * 40),
        })
    }
    return data
}

export const MOCK_SALES_TREND = genSalesTrend()

export const MOCK_PAYMENT_BREAKDOWN = [
    { name: 'Cash', value: 38, color: '#6272f8' },
    { name: 'Card', value: 47, color: '#10b981' },
    { name: 'Mobile Pay', value: 15, color: '#f59e0b' },
]

export const MOCK_TOP_PRODUCTS = [
    { name: 'Coca-Cola 330ml', revenue: 3240 },
    { name: 'Pepsi 330ml', revenue: 2700 },
    { name: 'White Bread Loaf', revenue: 2030 },
    { name: 'Shampoo 400ml', revenue: 1980 },
    { name: 'Snickers Bar', revenue: 1440 },
    { name: 'Whole Milk 1L', revenue: 1280 },
    { name: 'Ice Cream Vanilla', revenue: 1050 },
    { name: 'Lays Classic Chips', revenue: 900 },
]

export const MOCK_BUSY_HOURS = [
    { hour: '8am', transactions: 12 },
    { hour: '9am', transactions: 28 },
    { hour: '10am', transactions: 45 },
    { hour: '11am', transactions: 62 },
    { hour: '12pm', transactions: 88 },
    { hour: '1pm', transactions: 95 },
    { hour: '2pm', transactions: 74 },
    { hour: '3pm', transactions: 58 },
    { hour: '4pm', transactions: 66 },
    { hour: '5pm', transactions: 82 },
    { hour: '6pm', transactions: 70 },
    { hour: '7pm', transactions: 48 },
    { hour: '8pm', transactions: 30 },
]

export const MOCK_USERS = [
    { id: 1, email: 'admin@retailtouch.com', password: 'password123', name: 'Admin User', role: 'admin', avatar: 'AU', active: true },
    { id: 2, email: 'manager@retailtouch.com', password: 'password123', name: 'Mark Manager', role: 'manager', avatar: 'MM', active: true },
    { id: 3, email: 'cashier@retailtouch.com', password: 'password123', name: 'Jane Cashier', role: 'cashier', avatar: 'JC', active: true },
]

export const MOCK_SETTINGS = {
    taxRate: 10,
    loyaltyRatio: 1, // $1 = 1 point
    globalDiscountActive: false,
    globalDiscountPercent: 5,
    invoicePrefix: 'RCT-',
}
