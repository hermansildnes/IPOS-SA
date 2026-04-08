import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiShoppingCart,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowLeft,
} from 'react-icons/fi';
import { placeOrder } from '../services/orderService';
import { getCurrentMerchant } from '../services/merchantService';
import { useAuth } from '../context/AuthContext';

function PlaceOrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const cartStorageKey = user?.id ? `cart_${user.id}` : 'cart_guest';

  // If nothing was passed by navigation state, recover from this user's saved cart
  const initialCart = location.state?.cart || [];

  // State
  const [cart, setCart] = useState(initialCart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // check account status upfront so the submit button can be blocked before even trying
  const [accountStatus, setAccountStatus] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'merchant') return;
    getCurrentMerchant().then((m) => {
      if (m) setAccountStatus(m.accountStatus);
    }).catch(() => {});
  }, [user]);

  // Restore cart from storage if page is refreshed or opened directly
  useEffect(() => {
    if (!user) {
      setCart([]);
      return;
    }

    if (location.state?.cart && location.state.cart.length > 0) {
      setCart(location.state.cart);
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
  }, [user, location.state, cartStorageKey]);

  // Keep saved cart in sync while editing quantities on this page
  useEffect(() => {
    if (!user) return;

    if (cart.length > 0) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } else {
      localStorage.removeItem(cartStorageKey);
    }
  }, [cart, user, cartStorageKey]);

  // Update quantity for a cart item
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remove item from cart
  const removeItem = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // calculate the order subtotal from what's in the cart
  // the actual discount is applied by the backend based on the merchant's plan
  // so we only show the subtotal here - the final amount is shown after placing
  const subtotal = cart.reduce((sum, item) =>
    sum + (item.product.packageCost * item.quantity), 0
  );

  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    await new Promise(resolve => setTimeout(resolve, 500));

    const items = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    const result = await placeOrder(items);

    if (result.success) {
      // clear cart state and this user's saved cart on success
      setCart([]);
      localStorage.removeItem(cartStorageKey);

      if (result.accountSuspended) {
        // order went through but it pushed debt over the credit limit so the account
        // was auto suspended - this is more urgent than a normal success message
        // keep them on the page so they actually read the warning before being redirected
        setAccountStatus('suspended');
        setMessage({
          type: 'warning',
          text: `Order placed (ID: ${result.orderId.substring(0, 8).toUpperCase()}) — but your account has been suspended because this order exceeded your credit limit. You have 15 days to make a payment or your account will enter default and further orders will be permanently blocked.`,
        });
        // longer delay so they actually read it - dont rush them to orders page
        setTimeout(() => navigate('/orders'), 6000);
      } else {
        const discountInfo = result.discount > 0
          ? ` Discount applied: £${parseFloat(result.discount).toFixed(2)}.`
          : '';
        setMessage({
          type: 'success',
          text: `Order placed! ID: ${result.orderId.substring(0, 8).toUpperCase()}.${discountInfo}`,
        });
        setTimeout(() => navigate('/orders'), 2000);
      }
    } else {
      setMessage({ type: 'error', text: result.error });
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/catalogue')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            color: '#64748b',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          <FiArrowLeft size={16} />
          Back to Catalogue
        </button>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
          Review Your Order
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Review items and quantities before placing your order
        </p>
      </div>

      {/* Success/Error/Warning Message */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: message.type === 'success' ? '#dcfce7' : message.type === 'warning' ? '#fef3c7' : '#fee2e2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : message.type === 'warning' ? '#fcd34d' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : message.type === 'warning' ? '#92400e' : '#dc2626',
          padding: '0.875rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1.5rem',
          lineHeight: '1.5',
        }}>
          <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>
            {message.type === 'success'
              ? <FiCheckCircle size={18} />
              : <FiAlertCircle size={18} />
            }
          </span>
          {message.text}
        </div>
      )}

      {/* Empty Cart State */}
      {cart.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <FiShoppingCart size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
            Your cart is empty
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Browse the catalogue and add products to your order
          </p>
          <button
            onClick={() => navigate('/catalogue')}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Browse Catalogue
          </button>
        </div>
      )}

      {/* Cart with Items */}
      {cart.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>

          {/* Cart Items */}
          <div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 150px 100px 40px',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
              }}>
                <div>Product</div>
                <div>Price</div>
                <div>Quantity</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div></div>
              </div>

              {/* Cart Items */}
              {cart.map(item => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              position: 'sticky',
              top: '1.5rem',
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '1.5rem',
              }}>
                Order Summary
              </h3>

              {/* order cost summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Order Subtotal</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>£{subtotal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Discount</span>
                  <span style={{ fontWeight: '600', color: '#94a3b8' }}>Calculated at checkout</span>
                </div>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '0.25rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>Estimated Total</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.125rem' }}>
                    ~£{subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* info box explaining that the discount is applied server-side */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                padding: '0.875rem',
                marginBottom: '1.5rem',
                fontSize: '0.75rem',
                color: '#1e40af',
                lineHeight: '1.5',
              }}>
                Your merchant discount will be applied automatically when the order is placed.
                The final amount depends on your discount plan and monthly order total.
              </div>

              {/* account suspension/default warning - replaces submit button */}
              {(accountStatus === 'suspended' || accountStatus === 'in_default') && (
                <div style={{
                  background: accountStatus === 'in_default' ? '#fee2e2' : '#fef3c7',
                  border: `1px solid ${accountStatus === 'in_default' ? '#fecaca' : '#fcd34d'}`,
                  borderRadius: '0.625rem',
                  padding: '0.875rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: accountStatus === 'in_default' ? '#dc2626' : '#92400e',
                }}>
                  <FiAlertCircle size={16} />
                  {accountStatus === 'in_default'
                    ? 'Account in default — orders are blocked. Contact InfoPharma to resolve.'
                    : 'Account suspended — orders are blocked. Pay your outstanding balance within 15 days or your account will enter default.'}
                </div>
              )}

              {/* Place Order Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0 || accountStatus === 'suspended' || accountStatus === 'in_default'}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: (isSubmitting || accountStatus === 'suspended' || accountStatus === 'in_default')
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.625rem',
                  padding: '0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: (isSubmitting || accountStatus === 'suspended' || accountStatus === 'in_default') ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={18} />
                    Place Order
                  </>
                )}
              </button>

              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cart Item Component
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const itemTotal = item.product.packageCost * item.quantity;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 150px 100px 40px',
      gap: '1rem',
      padding: '1.25rem',
      borderBottom: '1px solid #f1f5f9',
      alignItems: 'center',
    }}>
      {/* Product Info */}
      <div>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#0f172a',
          marginBottom: '0.25rem',
        }}>
          {item.product.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Code: {item.product.productCode}
        </div>
      </div>

      {/* Price */}
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
        £{item.product.packageCost.toFixed(2)}
      </div>

      {/* Quantity Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <FiMinus size={14} />
        </button>

        <div style={{
          width: '50px',
          textAlign: 'center',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#0f172a',
        }}>
          {item.quantity}
        </div>

        <button
          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <FiPlus size={14} />
        </button>
      </div>

      {/* Item Total */}
      <div style={{
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#0f172a',
        textAlign: 'right',
      }}>
        £{itemTotal.toFixed(2)}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(item.product.id)}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          color: '#ef4444',
        }}
      >
        <FiTrash2 size={16} />
      </button>
    </div>
  );
}

export default PlaceOrderPage;