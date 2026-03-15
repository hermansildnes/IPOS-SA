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
import { getOrdersByMerchant } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUS, ORDER_STATUS_STYLES } from '../utils/constants';

function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null); // null = all statuses
  
  // Load orders on component mount
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      
      // For now, using user ID as merchant ID, later we'll retrieve actual merchant id from user
      const merchantId = user?.id;
      
      if (merchantId) {
        const data = await getOrdersByMerchant(merchantId, statusFilter);
        setOrders(data);
      }
      
      setLoading(false);
    }
    loadOrders();
  }, [user, statusFilter]);
  
  // Calculate status counts
  const statusCounts = {
    all: orders.length,
    accepted: orders.filter(o => o.status === ORDER_STATUS.ACCEPTED).length,
    processing: orders.filter(o => o.status === ORDER_STATUS.PROCESSING).length,
    dispatched: orders.filter(o => o.status === ORDER_STATUS.DISPATCHED).length,
    delivered: orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
  };

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
            Order History
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            View and track all your orders
          </p>
        </div>
        
        {/* New Order Button */}
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
      </div>
      
      {/* Status Filter Cards */}
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
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading orders...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Empty State */}
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
              : 'Start by browsing the catalogue and placing your first order'
            }
          </p>
          {!statusFilter && (
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
      
      {/* Orders Table */}
      {!loading && orders.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr 120px 120px 150px 100px',
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
            <div>Total</div>
            <div>Discount</div>
            <div>Amount Due</div>
            <div>Status</div>
          </div>
          
          {/* Table Rows */}
          {orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))}
        </div>
      )}
      
      {/* Results Count */}
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

// Order Row Component
function OrderRow({ order, onClick }) {
  const statusStyle = ORDER_STATUS_STYLES[order.status];
  
  // Format date
  const orderDate = new Date(order.orderDate);
  const formattedDate = orderDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  // Truncate order ID for display
  const shortOrderId = order.id.substring(0, 8).toUpperCase();
  
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr 120px 120px 150px 100px',
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
      
      {/* Total */}
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
        £{order.total.toFixed(2)}
      </div>
      
      {/* Discount */}
      <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '600' }}>
        -£{order.discountAmount.toFixed(2)}
      </div>
      
      {/* Amount Due */}
      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
        £{order.amountDue.toFixed(2)}
      </div>
      
      {/* Status Badge */}
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