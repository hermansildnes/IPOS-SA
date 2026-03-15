import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiPackage, FiAlertCircle } from 'react-icons/fi';
import { getAllProducts } from '../services/catalogueService';
import { useAuth } from '../context/AuthContext';

function CataloguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for products and cart
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]); // Array of { product, quantity }
  
  // Load products on component mount
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setLoading(false);
    }
    loadProducts();
  }, []);
  
  // Filter products by search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Add product to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Increase quantity if already in cart
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item to cart
      setCart([...cart, { product, quantity: 1 }]);
    }
  };
  
  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => 
    sum + (item.product.packageCost * item.quantity), 0
  );
  
  // Calculate total items in cart
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div style={{ padding: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            Product Catalogue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Browse pharmaceutical products and add to your order
          </p>
        </div>
        
        {/* Cart Button */}
        {cart.length > 0 && (
          <button
            onClick={() => navigate('/orders/new', { state: { cart } })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
            View Cart ({cartItemCount})
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
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
              {cartItemCount}
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
        marginBottom: '1.5rem',
      }}>
        <div style={{ position: 'relative' }}>
          <FiSearch
            size={18}
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search by product name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b',
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
          <p>Loading products...</p>
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
            No Products Available
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            The catalogue is currently empty. Products will appear here once they're added to the system.
          </p>
          {user?.role === 'admin' && (
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Admin: Use the backend API to add products to the catalogue.
            </p>
          )}
        </div>
      )}
      
      {/* No Search Results */}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <FiAlertCircle size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
            No Results Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            No products match "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}
      
      {/* Products Grid */}
      {!loading && filteredProducts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              inCart={cart.some(item => item.product.id === product.id)}
            />
          ))}
        </div>
      )}
      
      {/* Results Count */}
      {!loading && filteredProducts.length > 0 && (
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          marginTop: '1.5rem',
          textAlign: 'center',
        }}>
          Showing {filteredProducts.length} of {products.length} products
        </p>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart, inCart }) {
  const isLowStock = product.stockQuantity <= product.minStockLevel;
  const isOutOfStock = product.stockQuantity === 0;
  
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {/* Product Code */}
      <div style={{
        display: 'inline-block',
        background: '#f1f5f9',
        color: '#64748b',
        padding: '0.25rem 0.625rem',
        borderRadius: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
      }}>
        {product.productCode}
      </div>
      
      {/* Product Name */}
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '0.5rem',
      }}>
        {product.name}
      </h3>
      
      {/* Description */}
      <p style={{
        fontSize: '0.875rem',
        color: '#64748b',
        marginBottom: '1rem',
        lineHeight: '1.5',
      }}>
        {product.description}
      </p>
      
      {/* Package Info */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        fontSize: '0.75rem',
        color: '#64748b',
      }}>
        <div>
          <span style={{ fontWeight: '600' }}>Type:</span> {product.packageType}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Unit:</span> {product.unitsPerPack} {product.unit}
        </div>
      </div>
      
      {/* Stock Info */}
      <div style={{ marginBottom: '1rem' }}>
        {isOutOfStock ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#dc2626',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}>
            <FiAlertCircle size={16} />
            Out of Stock
          </div>
        ) : isLowStock ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f59e0b',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}>
            <FiAlertCircle size={16} />
            Low Stock: {product.stockQuantity} available
          </div>
        ) : (
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b',
          }}>
            In Stock: {product.stockQuantity} available
          </div>
        )}
      </div>
      
      {/* Price and Add Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1rem',
        borderTop: '1px solid #f1f5f9',
      }}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
            £{product.packageCost.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            per package
          </div>
        </div>
        
        <button
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: isOutOfStock
              ? '#e2e8f0'
              : inCart
                ? '#10b981'
                : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            opacity: isOutOfStock ? 0.5 : 1,
          }}
        >
          <FiShoppingCart size={16} />
          {inCart ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

export default CataloguePage;