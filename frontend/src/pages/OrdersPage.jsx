import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPackage,
  FiShoppingCart,
  FiFilter,
  FiCalendar,
  FiTruck,
  FiCheckCircle,
} from 'react-icons/fi';
import { viewPreviousOrders, viewAllOrders } from '../services/orderService';
import { getCurrentMerchant } from '../services/merchantService';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUS, ORDER_STATUS_STYLES, ROLES } from '../utils/constants';

function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // orders = the currently displayed orders after role based loading/filtering
  const [orders, setOrders] = useState([]);

  // loading = true while we fetch orders from the backend
  const [loading, setLoading] = useState(true);

  // statusFilter = currently selected order status card (or null for all)
  const [statusFilter, setStatusFilter] = useState(null);

  // merchants need their merchant account id before they can load their own orders
  const [merchantId, setMerchantId] = useState(null);

  // support both constants based roles and raw backend string roles
  const isMerchant = user?.role === ROLES.MERCHANT || user?.role === 'merchant';
  const isAdminOrManager =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.MANAGER ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  // Only merchants need to resolve their merchant account ID
  // admin/manager can directly load the global order history
  useEffect(() => {
    async function loadMerchantId() {
      try {
        const merchant = await getCurrentMerchant();
        setMerchantId(merchant.id);
      } catch (err) {
        console.error('Failed to load merchant ID:', err);
        setMerchantId(null);
      }
    }

    if (isMerchant) {
      loadMerchantId();
    }
  }, [isMerchant]);

  // Load orders for the current role
  // merchants = only their own orders
  // admin/manager = all orders across merchants
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      try {
        let data = [];

        if (isMerchant) {
          // merchant order history depends on resolving the merchant account first
          if (!merchantId) {
            setOrders([]);
            return;
          }

          data = await viewPreviousOrders(merchantId, statusFilter);
        } else if (isAdminOrManager) {
          data = await viewAllOrders(statusFilter);
        }

        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    if (!user) return;

    // don't try loading merchant orders until merchantId has been resolved
    if (isMerchant && !merchantId) return;

    loadOrders();
  }, [user, isMerchant, isAdminOrManager, merchantId, statusFilter]);

  // counts for the status filter cards at the top
  const statusCounts = {
    all: orders.length,
    accepted: orders.filter(o => o.status === ORDER_STATUS.ACCEPTED).length,
    processing: orders.filter(o => o.status === ORDER_STATUS.PROCESSING).length,
    dispatched: orders.filter(o => o.status === ORDER_STATUS.DISPATCHED).length,
    delivered: orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
  };

  // page subtitle changes depending on who is viewing the page
  const pageDescription = isMerchant
    ? 'View and track all your orders'
    : 'View and manage all merchant orders';

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Page header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            Order History
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {pageDescription}
          </p>
        </div>

        {/* only merchants should see the quick action to start a new order */}
        {isMerchant && (
          <button
            onClick={() => navigate('/catalogue')}
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
            <FiShoppingCart size={18} />
            New Order
          </button>
        )}
      </div>

      {/* status filter cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <StatusFilterCard
          label="All Orders"
          count={statusCounts.all}
          icon={FiPackage}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
          color="#6366f1"
        />
        <StatusFilterCard
          label="Accepted"
          count={statusCounts.accepted}
          icon={FiCheckCircle}
          active={statusFilter === ORDER_STATUS.ACCEPTED}
          onClick={() => setStatusFilter(ORDER_STATUS.ACCEPTED)}
          color="#3b82f6"
        />
        <StatusFilterCard
          label="Processing"
          count={statusCounts.processing}
          icon={FiFilter}
          active={statusFilter === ORDER_STATUS.PROCESSING}
          onClick={() => setStatusFilter(ORDER_STATUS.PROCESSING)}
          color="#f59e0b"
        />
        <StatusFilterCard
          label="Dispatched"
          count={statusCounts.dispatched}
          icon={FiTruck}
          active={statusFilter === ORDER_STATUS.DISPATCHED}
          onClick={() => setStatusFilter(ORDER_STATUS.DISPATCHED)}
          color="#6366f1"
        />
        <StatusFilterCard
          label="Delivered"
          count={statusCounts.delivered}
          icon={FiCheckCircle}
          active={statusFilter === ORDER_STATUS.DELIVERED}
          onClick={() => setStatusFilter(ORDER_STATUS.DELIVERED)}
          color="#10b981"
        />
      </div>

      {/* Loading state */}
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
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading orders...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <FiPackage size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
            {statusFilter ? 'No orders with this status' : 'No orders yet'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {statusFilter
              ? 'Try selecting a different status filter'
              : isMerchant
                ? 'Start by browsing the catalogue and placing your first order'
                : 'No merchant orders are available yet'
            }
          </p>

          {/* merchant-only call to action */}
          {!statusFilter && isMerchant && (
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
          )}
        </div>
      )}

      {/* Orders table */}
      {!loading && orders.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}>
          {/* Table header changes slightly for merchant vs admin/manager view */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMerchant
              ? '150px 1fr 120px 120px 150px 100px'
              : '150px 1fr 1fr 120px 120px 150px 100px',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
          }}>
            <div>Order ID</div>
            <div>Date</div>
            {!isMerchant && <div>Merchant</div>}
            <div>Total</div>
            <div>Discount</div>
            <div>Amount Due</div>
            <div>Status</div>
          </div>

          {/* Clickable rows - go to the full order detail page */}
          {orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              isMerchantView={isMerchant}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && orders.length > 0 && (
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          marginTop: '1.5rem',
          textAlign: 'center',
        }}>
          Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          {statusFilter && ` with status: ${ORDER_STATUS_STYLES[statusFilter].label}`}
        </p>
      )}
    </div>
  );
}

function StatusFilterCard({ label, count, icon: Icon, active, onClick, color }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? `${color}10` : 'white',
        border: `2px solid ${active ? color : '#e2e8f0'}`,
        borderRadius: '0.75rem',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = `${color}05`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.background = 'white';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Icon size={20} style={{ color: active ? color : '#94a3b8' }} />
        <span style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: active ? color : '#0f172a',
        }}>
          {count}
        </span>
      </div>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: '500',
        color: active ? color : '#64748b',
        marginTop: '0.5rem',
      }}>
        {label}
      </div>
    </div>
  );
}

function OrderRow({ order, isMerchantView, onClick }) {
  const statusStyle = ORDER_STATUS_STYLES[order.status];

  // format date once so the render stays cleaner
  const orderDate = new Date(order.orderDate);
  const formattedDate = orderDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // shorter display version of the UUID for the table row
  const shortOrderId = order.id.substring(0, 8).toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: isMerchantView
          ? '150px 1fr 120px 120px 150px 100px'
          : '150px 1fr 1fr 120px 120px 150px 100px',
        gap: '1rem',
        padding: '1.25rem',
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Order ID */}
      <div>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#6366f1',
          fontFamily: 'monospace',
        }}>
          #{shortOrderId}
        </div>
      </div>

      {/* Date */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: '#64748b',
      }}>
        <FiCalendar size={14} />
        {formattedDate}
      </div>

      {/* Merchant name is only shown on the admin/manager table */}
      {!isMerchantView && (
        <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '600' }}>
          {order.merchantName || 'Unknown merchant'}
        </div>
      )}

      {/* Total */}
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
        £{order.total.toFixed(2)}
      </div>

      {/* Discount */}
      <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '600' }}>
        -£{order.discountAmount.toFixed(2)}
      </div>

      {/* Amount due */}
      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
        £{order.amountDue.toFixed(2)}
      </div>

      {/* Status badge */}
      <div>
        <span style={{
          display: 'inline-block',
          background: statusStyle.bg,
          color: statusStyle.color,
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}>
          {statusStyle.label}
        </span>
      </div>
    </div>
  );
}

export default OrdersPage;