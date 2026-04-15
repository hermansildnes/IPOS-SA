import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShoppingCart,
  FiSearch,
  FiPackage,
  FiAlertCircle,
  FiPlus,
  FiMinus,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { getCatalogue, addProductStock, reduceProductStock, createProduct, updateProduct, deleteProduct } from '../services/orderService';
import { getCurrentMerchant } from '../services/merchantService';
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

  // which products "add stock" form is open (null = none)
  const [stockModalId, setStockModalId] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockMessage, setStockMessage] = useState(null);

  // which products "reduce stock" form is open
  const [reduceStockModalId, setReduceStockModalId] = useState(null);
  const [reduceStockQty, setReduceStockQty] = useState('');
  const [reduceStockSaving, setReduceStockSaving] = useState(false);
  const [reduceStockMessage, setReduceStockMessage] = useState(null);

  // merchant account status - needed to block ordering if suspended or in default
  // only fetched for merchant role users, staff dont need this
  const [merchantAccountStatus, setMerchantAccountStatus] = useState(null);

  // product create/edit modal state
  const [productModal, setProductModal] = useState(null); // null or { mode: 'create'|'edit', product }
  const [productForm, setProductForm] = useState({});
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState(null);

  // delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null or product object
  const [deleteDeleting, setDeleteDeleting] = useState(false);

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

  // fetch account status for merchant users so we can block ordering if suspended/defaulted
  // staff dont need this - they cant order anyway
  useEffect(() => {
    if (user?.role !== 'merchant') return;

    getCurrentMerchant().then((m) => {
      if (m) setMerchantAccountStatus(m.accountStatus);
    }).catch(() => {
      // not fatal - just means we cant show the suspended banner
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

  // submit the stock reduction for a specific product
  async function handleReduceStock(productId) {
    const qty = parseInt(reduceStockQty, 10);
    if (!qty || qty <= 0) {
      setReduceStockMessage({ id: productId, type: 'error', text: 'Enter a valid quantity' });
      return;
    }
    setReduceStockSaving(true);
    setReduceStockMessage(null);
    const result = await reduceProductStock(productId, qty);
    setReduceStockSaving(false);
    if (result.success) {
      await loadProducts();
      setReduceStockModalId(null);
      setReduceStockQty('');
    } else {
      setReduceStockMessage({ id: productId, type: 'error', text: result.error || 'Failed to reduce stock' });
    }
  }

  // blank form for creating a new product
  function openCreateModal() {
    setProductForm({
      productCode: '', name: '', description: '', packageType: '',
      unit: '', unitsPerPack: '', packageCost: '', minStockLevel: '0', restockPercentage: '10.00',
    });
    setProductError(null);
    setProductModal({ mode: 'create' });
  }

  // populate form from the existing product and open in edit mode
  function openEditModal(product) {
    setProductForm({
      productCode: product.productCode,
      name: product.name,
      description: product.description,
      packageType: product.packageType,
      unit: product.unit,
      unitsPerPack: String(product.unitsPerPack),
      packageCost: String(product.packageCost),
      minStockLevel: String(product.minStockLevel ?? 0),
      restockPercentage: String(product.restockPercentage ?? '10.00'),
    });
    setProductError(null);
    setProductModal({ mode: 'edit', product });
  }

  // submit either a create or update depending on the modal mode
  async function handleProductSubmit() {
    setProductError(null);
    const payload = {
      productCode: productForm.productCode?.trim(),
      name: productForm.name?.trim(),
      description: productForm.description?.trim(),
      packageType: productForm.packageType?.trim(),
      unit: productForm.unit?.trim(),
      unitsPerPack: parseInt(productForm.unitsPerPack, 10),
      packageCost: parseFloat(productForm.packageCost),
      minStockLevel: parseInt(productForm.minStockLevel, 10) || 0,
      restockPercentage: parseFloat(productForm.restockPercentage) || 10.00,
    };

    // basic validation
    if (!payload.productCode || !payload.name || !payload.packageType) {
      setProductError('Product code, name, and package type are required');
      return;
    }
    if (isNaN(payload.packageCost) || payload.packageCost <= 0) {
      setProductError('Package cost must be a positive number');
      return;
    }
    if (isNaN(payload.unitsPerPack) || payload.unitsPerPack < 1) {
      setProductError('Units per pack must be at least 1');
      return;
    }

    setProductSaving(true);
    let result;
    if (productModal.mode === 'create') {
      result = await createProduct(payload);
    } else {
      result = await updateProduct(productModal.product.id, payload);
    }
    setProductSaving(false);

    if (result.success) {
      await loadProducts();
      setProductModal(null);
    } else {
      setProductError(result.error || 'Something went wrong, try again');
    }
  }

  // delete the product after confirming - refreshes the list after
  async function handleDeleteProduct() {
    if (!deleteConfirm) return;
    setDeleteDeleting(true);
    const result = await deleteProduct(deleteConfirm.id);
    setDeleteDeleting(false);
    if (result.success) {
      await loadProducts();
      setDeleteConfirm(null);
    } else {
      // just close and let the user see the error via an alert for now
      alert(result.error || 'Failed to delete product');
      setDeleteConfirm(null);
    }
  }

  // buy enough stock to bring a product back up to its minimum level
  async function handleBuyMinStock(product) {
    const needed = product.minStockLevel - product.stockQuantity;
    if (needed <= 0) return;
    setStockSaving(true);
    const result = await addProductStock(product.id, needed);
    setStockSaving(false);
    if (result.success) {
      await loadProducts();
    } else {
      setStockMessage({ id: product.id, type: 'error', text: result.error || 'Failed to add stock' });
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

      {/* account suspension / default banner for merchants - blocks ordering */}
      {!isStaff && merchantAccountStatus === 'in_default' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#fee2e2',
          border: '2px solid #fca5a5',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#dc2626',
        }}>
          <FiAlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Account In Default — Orders Blocked</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.5' }}>
              Your account is in default and new orders cannot be placed.
              Please contact InfoPharma immediately to resolve your outstanding balance.
            </p>
          </div>
        </div>
      )}
      {!isStaff && merchantAccountStatus === 'suspended' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#92400e',
        }}>
          <FiAlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <p style={{ fontWeight: '700', fontSize: '0.875rem' }}>Account Suspended — Orders Blocked</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.5' }}>
              Your account has been suspended because your outstanding balance has exceeded your credit limit.
              You have 15 days to make a payment. If no payment is received your account will be set to In Default
              and will require Director approval to restore.
            </p>
          </div>
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

        {/* new product button - only show for staff who manage the catalogue */}
        {isStaff && (
          <button
            onClick={openCreateModal}
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
            }}
          >
            <FiPlus size={18} />
            New Product
          </button>
        )}

        {/* view cart button - only merchants can place orders so only show for them */}
        {!isStaff && cart.length > 0 && (
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
              merchantAccountStatus={merchantAccountStatus}
              stockModalOpen={stockModalId === product.id}
              onOpenStockModal={() => { setStockModalId(product.id); setStockQty(''); setStockMessage(null); }}
              onCloseStockModal={() => { setStockModalId(null); setStockQty(''); setStockMessage(null); }}
              stockQty={stockQty}
              onStockQtyChange={setStockQty}
              onSubmitStock={() => handleAddStock(product.id)}
              stockSaving={stockSaving}
              stockError={stockMessage?.id === product.id ? stockMessage : null}
              reduceStockModalOpen={reduceStockModalId === product.id}
              onOpenReduceStockModal={() => { setReduceStockModalId(product.id); setReduceStockQty(''); setReduceStockMessage(null); }}
              onCloseReduceStockModal={() => { setReduceStockModalId(null); setReduceStockQty(''); setReduceStockMessage(null); }}
              reduceStockQty={reduceStockQty}
              onReduceStockQtyChange={setReduceStockQty}
              onSubmitReduceStock={() => handleReduceStock(product.id)}
              reduceStockSaving={reduceStockSaving}
              reduceStockError={reduceStockMessage?.id === product.id ? reduceStockMessage : null}
              onEdit={() => openEditModal(product)}
              onDelete={() => setDeleteConfirm(product)}
              onBuyMinStock={() => handleBuyMinStock(product)}
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

      {/* create / edit product modal */}
      {productModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' }}>
              {productModal.mode === 'create' ? 'New Product' : 'Edit Product'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Product Code', key: 'productCode', type: 'text' },
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Description', key: 'description', type: 'text' },
                { label: 'Package Type', key: 'packageType', type: 'text' },
                { label: 'Unit (e.g. tablet, ml)', key: 'unit', type: 'text' },
                { label: 'Units per Pack', key: 'unitsPerPack', type: 'number' },
                { label: 'Package Cost (£)', key: 'packageCost', type: 'number' },
                { label: 'Min Stock Level', key: 'minStockLevel', type: 'number' },
                { label: 'Restock Percentage (%)', key: 'restockPercentage', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={productForm[key] ?? ''}
                    onChange={(e) => setProductForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {productError && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                {productError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setProductModal(null)}
                disabled={productSaving}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProductSubmit}
                disabled={productSaving}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: productSaving ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: productSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {productSaving ? 'Saving...' : productModal.mode === 'create' ? 'Create Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '400px',
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem' }}>
              Delete Product
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteDeleting}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteDeleting}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: deleteDeleting ? '#fca5a5' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: deleteDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({
  product, cartQuantity, onAddToCart, onUpdateQuantity,
  isStaff, merchantAccountStatus,
  stockModalOpen, onOpenStockModal, onCloseStockModal,
  stockQty, onStockQtyChange, onSubmitStock, stockSaving, stockError,
  reduceStockModalOpen, onOpenReduceStockModal, onCloseReduceStockModal,
  reduceStockQty, onReduceStockQtyChange, onSubmitReduceStock, reduceStockSaving, reduceStockError,
  onEdit, onDelete, onBuyMinStock,
}) {
  // merchant account status determines whether ordering is allowed
  const isAccountBlocked = merchantAccountStatus === 'suspended' || merchantAccountStatus === 'in_default';
  const isLowStock = product.stockQuantity < product.minStockLevel && product.minStockLevel > 0;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            {/* edit and delete buttons - only shown to staff */}
            {isStaff && (
              <>
                <button
                  onClick={onEdit}
                  title="Edit product"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6366f1',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <FiEdit2 size={15} />
                </button>
                <button
                  onClick={onDelete}
                  title="Delete product"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#dc2626',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <FiTrash2 size={15} />
                </button>
              </>
            )}
          </div>
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
            <div style={{ fontSize: '1rem', fontWeight: '600', color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#10b981' }}>
              {product.stockQuantity}
            </div>
            {/* min stock level - only meaningful to show for staff managing stock */}
            {isStaff && product.minStockLevel > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                min: {product.minStockLevel}
              </div>
            )}
          </div>
        </div>

        {/* buy minimum stock button - always shown to staff when a min level is set */}
        {isStaff && product.minStockLevel > 0 && (() => {
          const needed = product.minStockLevel - product.stockQuantity;
          const atMin = needed <= 0;
          return (
            <button
              onClick={atMin ? undefined : onBuyMinStock}
              disabled={atMin || stockSaving}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: atMin ? '#f1f5f9' : '#fef3c7',
                color: atMin ? '#94a3b8' : '#92400e',
                border: `1px solid ${atMin ? '#e2e8f0' : '#fcd34d'}`,
                borderRadius: '0.5rem',
                padding: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: atMin || stockSaving ? 'not-allowed' : 'pointer',
                marginBottom: '0.75rem',
              }}
            >
              <FiPlus size={14} />
              {atMin
                ? `At Minimum Stock (${product.minStockLevel})`
                : `Buy to Minimum (+${needed} units)`}
            </button>
          );
        })()}

        {/* Add to Cart / Quantity Controls */}
        {/* staff can't order - show a red disabled button instead of the cart controls */}
        {/* suspended/defaulted merchants also can't order */}
        {isStaff ? (
          <button
            disabled
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'not-allowed',
              opacity: 0.85,
            }}
          >
            Only merchants can place an order
          </button>
        ) : isAccountBlocked ? (
          // account is suspended or in default - show a red blocked button
          <button
            disabled
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: merchantAccountStatus === 'in_default' ? '#dc2626' : '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'not-allowed',
              opacity: 0.9,
            }}
          >
            {merchantAccountStatus === 'in_default'
              ? 'Account in default — cannot order'
              : 'Account suspended — cannot order'}
          </button>
        ) : cartQuantity === 0 ? (
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

        {/* reduce stock section - only visible to admin and manager */}
        {isStaff && (
          <div style={{ marginTop: '0.5rem' }}>
            {!reduceStockModalOpen ? (
              <button
                onClick={onOpenReduceStockModal}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'white',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <FiMinus size={14} />
                Reduce Stock
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={reduceStockQty}
                    onChange={(e) => onReduceStockQtyChange(e.target.value)}
                    placeholder="Qty to remove"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.625rem',
                      border: '1px solid #fecaca',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={onSubmitReduceStock}
                    disabled={reduceStockSaving}
                    style={{
                      background: reduceStockSaving ? '#fca5a5' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.875rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: reduceStockSaving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {reduceStockSaving ? '...' : 'Remove'}
                  </button>
                  <button
                    onClick={onCloseReduceStockModal}
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
                {reduceStockError && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                    {reduceStockError.text}
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