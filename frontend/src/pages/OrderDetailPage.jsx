import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderDetails, updateOrderStatus } from '../services/orderService';
import { ROLES, ORDER_STATUS } from '../utils/constants';
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiCalendar,
  FiAlertCircle,
  FiChevronRight,
} from 'react-icons/fi';

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // controls for the status update section (admin/manager only)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // dispatch form fields - only relevant when progressing from processing to dispatched
  const [dispatchForm, setDispatchForm] = useState({
    courierName: '',
    trackingNumber: '',
    expectedDeliveryDate: '',
  });

  // check if the current user can advance the order status
  const canManageOrders =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.MANAGER ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  // fetch the order when the page opens
  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const data = await getOrderDetails(orderId);
        setOrder(data);
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

  // the three stages an order moves through - dispatched is the final state
  // delivered is not set by staff; it's confirmed through other means
  const statusSteps = [
    { key: ORDER_STATUS.ACCEPTED, label: 'Accepted', icon: FiCheckCircle, color: '#10b981' },
    { key: ORDER_STATUS.PROCESSING, label: 'Processing', icon: FiPackage, color: '#f59e0b' },
    { key: ORDER_STATUS.DISPATCHED, label: 'Dispatched', icon: FiTruck, color: '#3b82f6' },
  ];

  const statusIndexMap = {
    accepted: 0,
    processing: 1,
    dispatched: 2,
  };

  const currentStepIndex = order ? (statusIndexMap[order.status?.toLowerCase()] ?? 0) : 0;

  // figure out what status comes after the current one - dispatched has no next step
  const nextStatusMap = {
    accepted: ORDER_STATUS.PROCESSING,
    processing: ORDER_STATUS.DISPATCHED,
    dispatched: null,
  };

  const nextStatus = order ? nextStatusMap[order.status?.toLowerCase()] : null;

  // advance the order to the next status in the lifecycle
  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    // dispatch step needs extra info
    if (order.status?.toLowerCase() === ORDER_STATUS.PROCESSING) {
      if (!dispatchForm.courierName.trim()) {
        setStatusMessage({ type: 'error', text: 'Courier name is required to dispatch an order' });
        return;
      }
    }

    setIsUpdatingStatus(true);
    setStatusMessage(null);

    const dispatchDetails = nextStatus === ORDER_STATUS.DISPATCHED
      ? {
          courierName: dispatchForm.courierName,
          trackingNumber: dispatchForm.trackingNumber,
          expectedDeliveryDate: dispatchForm.expectedDeliveryDate || null,
        }
      : null;

    const result = await updateOrderStatus(orderId, nextStatus, dispatchDetails);

    if (result.success) {
      // refresh the order so the timeline updates
      const refreshed = await getOrderDetails(orderId);
      setOrder(refreshed);
      setDispatchForm({ courierName: '', trackingNumber: '', expectedDeliveryDate: '' });
      setStatusMessage({
        type: 'success',
        text: `Order status updated to "${nextStatus}"`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to update status' });
    }

    setIsUpdatingStatus(false);
  };

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
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

  if (!order) return null;

  // calculate the discount percentage shown in the breakdown
  const discountPct = order.total > 0
    ? ((order.discountAmount / order.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* back button + order header */}
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
                Order #{order.id?.substring(0, 8).toUpperCase()}
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Placed on {new Date(order.orderDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
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
              textTransform: 'capitalize',
            }}>
              {order.status}
            </span>
          </div>
        </div>

        {/* order progress timeline */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '2rem',
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#0f172a',
            marginBottom: '2rem',
          }}>
            Order Progress
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* grey track behind the coloured progress line */}
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
                    border: isCurrent ? `3px solid ${step.color}40` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    <Icon size={18} style={{ color: isCompleted ? 'white' : '#94a3b8' }} />
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

        {/* main content grid - items left, info right */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

          {/* order items table */}
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
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>
                Order Items
              </h2>
            </div>

            {/* column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 70px 90px',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.7rem',
              fontWeight: '600',
              color: '#64748b',
              textTransform: 'uppercase',
            }}>
              <div>Product</div>
              <div style={{ textAlign: 'right' }}>Unit Price</div>
              <div style={{ textAlign: 'right' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Subtotal</div>
            </div>

            {order.items?.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 70px 90px',
                  gap: '0.5rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: index < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                    {item.productName || 'Product'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                  £{parseFloat(item.unitPrice).toFixed(2)}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                  ×{item.quantity}
                </div>
                <div style={{ textAlign: 'right', fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                  £{parseFloat(item.cost).toFixed(2)}
                </div>
              </div>
            ))}

            {/* order total breakdown */}
            <div style={{
              padding: '1rem 1.25rem',
              background: '#f8fafc',
              borderTop: '2px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Subtotal</p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                  £{parseFloat(order.total).toFixed(2)}
                </p>
              </div>

              {/* discount breakdown - show rate if available */}
              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#10b981' }}>
                    Discount ({discountPct}%)
                  </p>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>
                    −£{parseFloat(order.discountAmount).toFixed(2)}
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.625rem',
                borderTop: '1px solid #e2e8f0',
              }}>
                <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Total Due</p>
                <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                  £{parseFloat(order.amountDue).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* right column: delivery info, order info, and status update */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* delivery info - only shown once dispatched */}
            {(order.status === ORDER_STATUS.DISPATCHED || order.status === ORDER_STATUS.DELIVERED) && (
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

                  {order.courierRef && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <FiPackage size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tracking Ref</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                          {order.courierRef}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.dispatchedDate && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <FiCalendar size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dispatched</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                          {new Date(order.dispatchedDate).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.expectedDelivery && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <FiMapPin size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Expected Delivery</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                          {new Date(order.expectedDelivery).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* order metadata */}
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
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}>
                    {order.id}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Order Date</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                    {new Date(order.orderDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {order.merchantName && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Merchant</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                      {order.merchantName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* order status management - admin and manager only */}
            {canManageOrders && nextStatus && (
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
                  marginBottom: '0.75rem',
                }}>
                  Update Order Status
                </h3>

                {/* feedback message after attempting an update */}
                {statusMessage && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
                    border: `1px solid ${statusMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    marginBottom: '0.75rem',
                  }}>
                    {statusMessage.type === 'success'
                      ? <FiCheckCircle size={14} />
                      : <FiAlertCircle size={14} />
                    }
                    {statusMessage.text}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.875rem',
                  color: '#64748b',
                }}>
                  <span style={{
                    background: '#f1f5f9',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {order.status}
                  </span>
                  <FiChevronRight size={14} />
                  <span style={{
                    background: '#ede9fe',
                    color: '#6366f1',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {nextStatus}
                  </span>
                </div>

                {/* dispatch details form - only needed when marking as dispatched */}
                {order.status?.toLowerCase() === ORDER_STATUS.PROCESSING && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.25rem',
                      }}>
                        Courier Name *
                      </label>
                      <input
                        type="text"
                        value={dispatchForm.courierName}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, courierName: e.target.value })}
                        placeholder="e.g. DHL Express"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.25rem',
                      }}>
                        Tracking Reference
                      </label>
                      <input
                        type="text"
                        value={dispatchForm.trackingNumber}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
                        placeholder="e.g. JD001234567890"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.25rem',
                      }}>
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={dispatchForm.expectedDeliveryDate}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, expectedDeliveryDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: isUpdatingStatus
                      ? '#cbd5e1'
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdatingStatus ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiChevronRight size={16} />
                      Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default OrderDetailPage;
