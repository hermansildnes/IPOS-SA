import { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

function PlaceOrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get cart from navigation state (passed from CataloguePage)
  const initialCart = location.state?.cart || [];
  
  // State
  const [cart, setCart] = useState(initialCart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Update quantity for a cart item
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return; // Don't allow 0 or negative
    
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
  
  // Calculate totals
  const subtotal = cart.reduce((sum, item) =>
    sum + (item.product.packageCost * item.quantity), 0
  );
  
  // For now, assume 5% discount (will be calculated by backend later)
  const discountPercentage = 5;
  const discountAmount = subtotal * (discountPercentage / 100);
  const total = subtotal - discountAmount;
  
  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty' });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Format items for API
    const items = cart.map(item => ({
      product_id: item.product.id,  // snake_case (matches backend)
      quantity: item.quantity,
    }));
    
    // Call the backend API
    const result = await placeOrder(items);
    
    if (result.success) {
      // Success - show message and redirect after delay
      setMessage({
        type: 'success',
        text: `Order created successfully! Order ID: ${result.orderId.substring(0, 8)}...`
      });
      
      setTimeout(() => {
        navigate('/orders');
      }, 2000);
    } else {
      // Error - show message
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
      
      {/* Success/Error Message */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '0.875rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1.5rem',
        }}>
          {message.type === 'success'
            ? <FiCheckCircle size={18} />
            : <FiAlertCircle size={18} />
          }
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
              
              {/* Summary Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>£{subtotal.toFixed(2)}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Discount ({discountPercentage}%)</span>
                  <span style={{ fontWeight: '600', color: '#10b981' }}>-£{discountAmount.toFixed(2)}</span>
                </div>
                
                <div style={{
                  height: '1px',
                  background: '#e2e8f0',
                  margin: '0.5rem 0',
                }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>Total</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.25rem' }}>
                    £{total.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Info Box */}
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
                <strong>Note:</strong> Your account discount has been applied. Final discount amount may vary based on your monthly order total (flexible plans only).
              </div>
              
              {/* Place Order Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: isSubmitting
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.625rem',
                  padding: '0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
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
              
              {/* Spinner Animation */}
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