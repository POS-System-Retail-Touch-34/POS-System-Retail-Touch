import api from './api';

export async function getAllProducts() {
    const res = await api.get('/api/products');
    return res.data.data;
}

export async function getProductById(id) {
    const res = await api.get(`/api/products/${id}`);
    return res.data.data;
}

export async function searchProductsByName(name) {
    const res = await api.get(`/api/products/search?name=${encodeURIComponent(name)}`);
    return res.data.data;
}

export async function getProductByBarcode(barcode) {
    const res = await api.get(`/api/products/barcode/${encodeURIComponent(barcode)}`);
    return res.data.data;
}

export async function createProduct(productDTO) {
    const res = await api.post('/api/products', productDTO);
    return res.data.data;
}

export async function updateProduct(id, productDTO) {
    const res = await api.put(`/api/products/${id}`, productDTO);
    return res.data.data;
}

export async function deleteProduct(id) {
    const res = await api.delete(`/api/products/${id}`);
    return res.data.data;
}

export async function adjustStock(productId, quantity, reason) {
    const res = await api.put('/api/inventory/update', { productId, quantity, reason });
    return res.data.data;
}

export async function deductStock(productId, quantity, saleId) {
    const res = await api.post('/api/products/stock/deduct', { productId, quantity, saleId });
    return res.data.data;
}

export async function getLowStockProducts() {
    const res = await api.get('/api/products/low-stock');
    return res.data.data;
}

export async function getProductsByCategory(categoryId) {
    const res = await api.get(`/api/products/category/${encodeURIComponent(categoryId)}`);
    return res.data.data;
}

export async function getAllCategories() {
    const res = await api.get('/api/categories');
    return res.data.data;
}
