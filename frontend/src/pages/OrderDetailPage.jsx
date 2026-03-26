import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderDetails, trackOrderProgress } from '../services/orderService';
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiCalendar,
  FiAlertCircle,
} from 'react-icons/fi';

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch order details on mount
  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const orderData = await getOrderDetails(orderId);
        setOrder(orderData);
      } catch (err) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // status timeline config
  const statusSteps = [
    {
      key: 'accepted',
      label: 'Accepted',
      icon: FiCheckCircle,
      color: '#10b981',
    },
    {
      key: 'processing',
      label: 'Processing',
      icon: FiPackage,
      color: '#f59e0b',
    },
    {
      key: 'dispatched',
      label: 'Dispatched',
      icon: FiTruck,
      color: '#3b82f6',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      icon: FiCheckCircle,
      color: '#10b981',
    },
  ];

  // get current step index
  const getCurrentStepIndex = (status) => {
    const statusMap = {
      accepted: 0,
      processing: 1,
      dispatched: 2,
      delivered: 3,
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  };

  const currentStepIndex = order ? getCurrentStepIndex(order.status) : 0;

  // loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading order details...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
      }}>
        <FiAlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <p style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
          Failed to load order
        </p>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
          {error}
        </p>
        <button
          onClick={() => navigate('/orders')}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* back button and header */}
      <div>
        <button
          onClick={() => navigate('/orders')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: '#6366f1',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          <FiArrowLeft size={16} />
          Back to Orders
        </button>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '0.25rem',
            }}>
              Order #{order.id?.substring(0, 8)}
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Placed on {new Date(order.order_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* status badge */}
          <span style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '600',
            background: statusSteps[currentStepIndex].color + '20',
            color: statusSteps[currentStepIndex].color,
          }}>
            {order.status}
          </span>
        </div>
      </div>

      {/* status timeline */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#0f172a',
          marginBottom: '2rem',
        }}>
          Order Progress
        </h2>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          {/* progress line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '0',
            right: '0',
            height: '2px',
            background: '#e2e8f0',
            zIndex: 0,
          }}>
            <div style={{
              height: '100%',
              background: statusSteps[currentStepIndex].color,
              width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>

          {/* status steps */}
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isCompleted ? step.color : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s',
                  border: isCurrent ? `3px solid ${step.color}40` : 'none',
                }}>
                  <Icon
                    size={18}
                    style={{ color: isCompleted ? 'white' : '#94a3b8' }}
                  />
                </div>

                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: isCompleted ? '600' : '500',
                  color: isCompleted ? step.color : '#94a3b8',
                  textAlign: 'center',
                }}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
      }}>
        
        {/* order items */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#0f172a',
            }}>
              Order Items
            </h2>
          </div>

          <div>
            {order.items?.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderBottom: index < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontWeight: '600',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem',
                  }}>
                    {item.product_name || 'Product'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    £{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                  </p>
                </div>

                <p style={{
                  fontWeight: '600',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                }}>
                  £{parseFloat(item.cost).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* order summary */}
          <div style={{
            padding: '1.25rem',
            background: '#f8fafc',
            borderTop: '2px solid #e2e8f0',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Subtotal</p>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                £{parseFloat(order.total).toFixed(2)}
              </p>
            </div>

            {order.discount_amount > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}>
                <p style={{ fontSize: '0.875rem', color: '#10b981' }}>Discount</p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>
                  -£{parseFloat(order.discount_amount).toFixed(2)}
                </p>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
            }}>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Total</p>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                £{parseFloat(order.amount_due).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* delivery info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          
          {/* dispatch details */}
          {order.status !== 'accepted' && order.status !== 'processing' && (
            <div style={{
              background: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '1rem',
              }}>
                Delivery Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {order.courier && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <FiTruck size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Courier</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                        {order.courier}
                      </p>
                    </div>
                  </div>
                )}

                {order.courier_ref && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <FiPackage size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tracking Reference</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                        {order.courier_ref}
                      </p>
                    </div>
                  </div>
                )}

                {order.dispatched_date && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <FiCalendar size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dispatched</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                        {new Date(order.dispatched_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                )}

                {order.expected_delivery && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <FiMapPin size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Expected Delivery</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                        {new Date(order.expected_delivery).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* order info */}
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '1rem',
            }}>
              Order Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Order ID</p>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  fontFamily: 'monospace',
                }}>
                  {order.id}
                </p>
              </div>

              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Order Date</p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                  {new Date(order.order_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {order.merchant_name && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Merchant</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                    {order.merchant_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;