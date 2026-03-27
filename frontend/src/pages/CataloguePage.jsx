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
import { getCatalogue, addProductStock } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reportService';

function CataloguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Build a cart key tied to the logged-in user
  const cartStorageKey = user?.id ? `cart_${user.id}` : 'cart_guest';

  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLowStockBanner, setShowLowStockBanner] = useState(true);

  // which product's "add stock" form is open (null = none)
  const [stockModalId, setStockModalId] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockMessage, setStockMessage] = useState(null);

  // load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // re-fetch the catalogue whenever the tab becomes visible again
  // this means if an order was just placed, the stock counts will refresh
  // when the merchant navigates back here without doing a full page reload
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadProducts();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // check for low stock items - admin/manager only
  // this fires every time the catalogue page is opened, as required by the brief
  useEffect(() => {
    const isStaff = user?.role === 'admin' || user?.role === 'manager';
    if (!isStaff) return;

    reportService.getLowStockReport().then((report) => {
      if (report?.total_items_below_minimum > 0) {
        setLowStockCount(report.total_items_below_minimum);
        setShowLowStockBanner(true);
      }
    }).catch(() => {
      // silently ignore - not worth crashing the page over
    });
  }, [user]);

  // Load cart for the current logged-in user
  useEffect(() => {
    if (!user) {
      setCart([]);
      return;
    }

    const savedCart = localStorage.getItem(cartStorageKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse saved cart:', error);
        localStorage.removeItem(cartStorageKey);
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [user, cartStorageKey]);

  // Save cart for the current logged-in user whenever it changes
  useEffect(() => {
    if (!user) return;

    if (cart.length > 0) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } else {
      localStorage.removeItem(cartStorageKey);
    }
  }, [cart, user, cartStorageKey]);

  // Load products function
  async function loadProducts() {
    setLoading(true);
    const data = await getCatalogue();
    setProducts(data);
    setLoading(false);
  }

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.productCode.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  });

  // Add to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
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

  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  // submit the stock increase for a specific product
  async function handleAddStock(productId) {
    const qty = parseInt(stockQty, 10);
    if (!qty || qty <= 0) {
      setStockMessage({ id: productId, type: 'error', text: 'Enter a valid quantity' });
      return;
    }
    setStockSaving(true);
    setStockMessage(null);
    const result = await addProductStock(productId, qty);
    setStockSaving(false);
    if (result.success) {
      // refresh the product list so the updated stock count shows immediately
      await loadProducts();
      setStockModalId(null);
      setStockQty('');
    } else {
      setStockMessage({ id: productId, type: 'error', text: result.error || 'Failed to add stock' });
    }
  }

  return (
    <div style={{ padding: '1.5rem' }}>

      {/* Low stock warning banner - only shown to admin/manager */}
      {isStaff && showLowStockBanner && lowStockCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#92400e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                Low stock alert: {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below minimum level
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                Go to Reports → Low Stock to see the full list and recommended reorder quantities.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLowStockBanner(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#92400e',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

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
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
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

      {/* Empty State - No Products at All */}
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
            No products available
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            The catalogue is currently empty. Products will appear here once added.
          </p>
        </div>
      )}

      {/* Empty State - No Search Results */}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <FiSearch size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
            No products found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            No products match "{searchQuery}". Try a different search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            style={{
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
        </div>
      )}

      {/* Products Grid */}
      {!loading && filteredProducts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={getCartQuantity(product.id)}
              onAddToCart={() => addToCart(product)}
              onUpdateQuantity={(qty) => updateCartQuantity(product.id, qty)}
              isStaff={isStaff}
              stockModalOpen={stockModalId === product.id}
              onOpenStockModal={() => { setStockModalId(product.id); setStockQty(''); setStockMessage(null); }}
              onCloseStockModal={() => { setStockModalId(null); setStockQty(''); setStockMessage(null); }}
              stockQty={stockQty}
              onStockQtyChange={setStockQty}
              onSubmitStock={() => handleAddStock(product.id)}
              stockSaving={stockSaving}
              stockError={stockMessage?.id === product.id ? stockMessage : null}
            />
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredProducts.length > 0 && (
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          marginTop: '2rem',
          textAlign: 'center',
        }}>
          Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({
  product, cartQuantity, onAddToCart, onUpdateQuantity,
  isStaff, stockModalOpen, onOpenStockModal, onCloseStockModal,
  stockQty, onStockQtyChange, onSubmitStock, stockSaving, stockError,
}) {
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

        {/* add stock section - only visible to admin and manager */}
        {isStaff && (
          <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            {!stockModalOpen ? (
              <button
                onClick={onOpenStockModal}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'white',
                  color: '#6366f1',
                  border: '1px solid #6366f1',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <FiPlus size={14} />
                Add Stock
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={stockQty}
                    onChange={(e) => onStockQtyChange(e.target.value)}
                    placeholder="Qty to add"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.625rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={onSubmitStock}
                    disabled={stockSaving}
                    style={{
                      background: stockSaving ? '#cbd5e1' : '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.875rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: stockSaving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {stockSaving ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={onCloseStockModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0.25rem',
                    }}
                  >
                    ×
                  </button>
                </div>
                {stockError && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                    {stockError.text}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CataloguePage;