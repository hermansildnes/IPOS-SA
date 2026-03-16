
// Wrapper methods for /api/catalogue endpoints
// Each function corresponds to a specific backend API endpoint

import { apiClient } from './apiClient';

// helper to convert backend snake_case to frontend camelCase
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

// helper to convert frontend camelCase to backend snake_case
function convertProductToBackend(data) {
  return {
    product_code: data.productCode,
    name: data.name,
    description: data.description,
    package_type: data.packageType,
    unit: data.unit,
    units_per_pack: data.unitsPerPack,
    package_cost: data.packageCost,
    min_stock_level: data.minStockLevel || 0,
    restock_percentage: data.restockPercentage || 10.0,
  };
}

/**
 * Get all products in the catalogue
 * Endpoint: GET /api/catalogue
 */
export async function getAllProducts() {
  try {
    const products = await apiClient.get('/catalogue');
    return products.map(convertProductFromBackend);
  } catch (error) {
    console.error('Failed to get products:', error);
    return [];
  }
}

/**
 * Search products by query string
 * Endpoint: GET /api/catalogue/search?query={query}
 */
export async function searchProducts(query) {
  try {
    if (!query || query.trim() === '') {
      return getAllProducts();
    }
    
    const products = await apiClient.get(`/catalogue/search?query=${encodeURIComponent(query)}`);
    return products.map(convertProductFromBackend);
  } catch (error) {
    console.error('Failed to search products:', error);
    return [];
  }
}

/**
 * Get a single product by ID
 * Endpoint: GET /api/catalogue/{product_id}
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

/**
 * Get products with low stock (below min_stock_level)
 * Endpoint: GET /api/catalogue/low-stock
 */
export async function getLowStockProducts() {
  try {
    const products = await apiClient.get('/catalogue/low-stock');
    return products.map(convertProductFromBackend);
  } catch (error) {
    console.error('Failed to get low stock products:', error);
    return [];
  }
}

/**
 * Create a new product (admin only)
 * Endpoint: POST /api/catalogue
 * Auth: Required (admin only)
 */
export async function createProduct(productData) {
  try {
    // Validate required fields
    const required = ['productCode', 'name', 'description', 'packageType', 'unit', 'unitsPerPack', 'packageCost'];
    for (const field of required) {
      if (!productData[field]) {
        return {
          success: false,
          error: `${field} is required`
        };
      }
    }
    
    // Convert to backend format
    const backendData = convertProductToBackend(productData);
    
    // Call backend API
    const product = await apiClient.post('/catalogue', backendData);
    
    return {
      success: true,
      product: convertProductFromBackend(product)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update an existing product (admin only)
 * Endpoint: PUT /api/catalogue/{product_id}
 */
export async function updateProduct(productId, updates) {
  try {
    // Convert to backend format
    const backendData = convertProductToBackend(updates);
    
    // Call backend API
    const product = await apiClient.put(`/catalogue/${productId}`, backendData);
    
    return {
      success: true,
      product: convertProductFromBackend(product)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a product (admin only)
 * Endpoint: DELETE /api/catalogue/{product_id}
 */

export async function deleteProduct(productId) {
  try {
    await apiClient.delete(`/catalogue/${productId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add stock to a product (admin/manager only)
 * Endpoint: POST /api/catalogue/{product_id}/stock
 */
export async function addStock(productId, quantity) {
  try {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be greater than 0'
      };
    }
    
    await apiClient.post(`/catalogue/${productId}/stock`, { quantity });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getAllProducts,
  searchProducts,
  getProductById,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStock,
};