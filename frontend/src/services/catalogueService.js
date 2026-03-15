// Catalogue Service
// Wrapper methods for /api/catalogue endpoints
// Currently returns empty array - will work when backend catalogue is implemented

import { apiClient } from './apiClient';

// Helper to convert backend snake_case to frontend camelCase
function convertProductFromBackend(product) {
  return {
    id: product.id,
    productCode: product.product_code,
    name: product.name,
    description: product.description,
    packageType: product.package_type,
    unit: product.unit,
    unitsPerPack: product.units_per_pack,
    packageCost: parseFloat(product.package_cost),
    stockQuantity: product.stock_quantity,
    minStockLevel: product.min_stock_level,
    restockPercentage: parseFloat(product.restock_percentage),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Get all products in the catalogue
 * 
 * Endpoint: GET /api/catalogue
 * Auth: Required
 * 
 * @returns {Promise<Array>} - Array of products
 */
export async function getAllProducts() {
  try {
    // Call backend API
    const products = await apiClient.get('/catalogue');
    
    // Convert from snake_case to camelCase
    return products.map(convertProductFromBackend);
  } catch (error) {
    console.error('Failed to get products:', error);
    // Return empty array if backend not ready or no products exist
    return [];
  }
}

/**
 * Search products by name or product code
 * 
 * Endpoint: GET /api/catalogue?search={query}
 * Auth: Required
 * 
 * @param {string} query - Search term
 * @returns {Promise<Array>} - Array of matching products
 */
export async function searchProducts(query) {
  try {
    const products = await apiClient.get(`/catalogue?search=${encodeURIComponent(query)}`);
    return products.map(convertProductFromBackend);
  } catch (error) {
    console.error('Failed to search products:', error);
    return [];
  }
}

/**
 * Get a single product by ID
 * 
 * Endpoint: GET /api/catalogue/{product_id}
 * Auth: Required
 * 
 * @param {string} productId - UUID of the product
 * @returns {Promise<Object|null>} - Product object or null
 */
export async function getProductById(productId) {
  try {
    const product = await apiClient.get(`/catalogue/${productId}`);
    return convertProductFromBackend(product);
  } catch (error) {
    console.error('Failed to get product:', error);
    return null;
  }
}

export default {
  getAllProducts,
  searchProducts,
  getProductById,
};