import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShoppingCart,
  FiSearch,
  FiPackage,
  FiAlertCircle,
  FiPlus,
  FiMinus,
} from 'react-icons/fi';
import { getAllProducts, searchProducts } from '../services/catalogueService';

function CataloguePage() {
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);
  
  // Load products function
  async function loadProducts() {
    setLoading(true);
    const data = await getAllProducts();
    setProducts(data);
    setLoading(false);
  }
  
  // Search products
  async function handleSearch(query) {
    setSearchQuery(query);
    setLoading(true);
    
    if (query.trim() === '') {
      await loadProducts();
    } else {
      const results = await searchProducts(query);
      setProducts(results);
    }
    
    setLoading(false);
  }
  
  // Add to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Increase quantity
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setCart([...cart, { product, quantity: 1 }]);
    }
  };
  
  // Update cart quantity
  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };
  
  // Get quantity in cart for a product
  const getCartQuantity = (productId) => {
    const item = cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };
  
  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) =>
    sum + (item.product.packageCost * item.quantity), 0
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            Product Catalogue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Browse products and add items to your order
          </p>
        </div>
        
        {/* View Cart Button */}
        {cart.length > 0 && (
          <button
            onClick={() => navigate('/orders/new', { state: { cart } })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.75rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <FiShoppingCart size={18} />
            View Cart (£{cartTotal.toFixed(2)})
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '700',
            }}>
              {cart.length}
            </span>
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '2rem',
      }}>
        <div style={{ position: 'relative' }}>
          <FiSearch
            size={20}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search products by name, code, or description..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading products...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <FiPackage size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
            {searchQuery ? 'No products found' : 'No products available'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {searchQuery
              ? `No products match "${searchQuery}". Try a different search term.`
              : 'The catalogue is currently empty. Please check back later.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              style={{
                marginTop: '1.5rem',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      )}
      
      {/* Products Grid */}
      {!loading && products.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={getCartQuantity(product.id)}
              onAddToCart={() => addToCart(product)}
              onUpdateQuantity={(qty) => updateCartQuantity(product.id, qty)}
            />
          ))}
        </div>
      )}
      
      {/* Results Count */}
      {!loading && products.length > 0 && (
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          marginTop: '2rem',
          textAlign: 'center',
        }}>
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, cartQuantity, onAddToCart, onUpdateQuantity }) {
  const isLowStock = product.stockQuantity < product.minStockLevel;
  const isOutOfStock = product.stockQuantity === 0;
  
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {/* Product Info */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'start',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#0f172a',
          }}>
            {product.name}
          </h3>
          <span style={{
            fontSize: '0.75rem',
            color: '#64748b',
            background: '#f1f5f9',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontFamily: 'monospace',
          }}>
            {product.productCode}
          </span>
        </div>
        
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginBottom: '0.75rem',
        }}>
          {product.description}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.75rem',
          color: '#64748b',
          marginBottom: '0.75rem',
        }}>
          <div>
            <strong>Package:</strong> {product.packageType}
          </div>
          <div>
            <strong>Units:</strong> {product.unitsPerPack} {product.unit}
          </div>
        </div>
        
        {/* Stock Warning */}
        {(isLowStock || isOutOfStock) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: isOutOfStock ? '#fee2e2' : '#fef3c7',
            border: `1px solid ${isOutOfStock ? '#fecaca' : '#fde68a'}`,
            color: isOutOfStock ? '#dc2626' : '#d97706',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}>
            <FiAlertCircle size={14} />
            {isOutOfStock ? 'Out of Stock' : `Low Stock (${product.stockQuantity} left)`}
          </div>
        )}
      </div>
      
      {/* Price & Actions */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Price per package</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              £{product.packageCost.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>In stock</div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#10b981' }}>
              {product.stockQuantity}
            </div>
          </div>
        </div>
        
        {/* Add to Cart / Quantity Controls */}
        {cartQuantity === 0 ? (
          <button
            onClick={onAddToCart}
            disabled={isOutOfStock}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: isOutOfStock
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            <FiShoppingCart size={16} />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <button
              onClick={() => onUpdateQuantity(cartQuantity - 1)}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                border: '2px solid #6366f1',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: '#6366f1',
              }}
            >
              <FiMinus size={18} />
            </button>
            
            <div style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#0f172a',
            }}>
              {cartQuantity} in cart
            </div>
            
            <button
              onClick={() => onUpdateQuantity(cartQuantity + 1)}
              disabled={cartQuantity >= product.stockQuantity}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: cartQuantity >= product.stockQuantity ? '#e2e8f0' : '#6366f1',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: cartQuantity >= product.stockQuantity ? 'not-allowed' : 'pointer',
                color: 'white',
              }}
            >
              <FiPlus size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CataloguePage;