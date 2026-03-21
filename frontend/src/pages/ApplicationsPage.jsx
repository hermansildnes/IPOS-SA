import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllApplications, decideApplication } from '../services/applicationService';
import {
  FiFileText,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
} from 'react-icons/fi';

const STATUS_STYLES = {
  pending:  { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg,
      color: s.color,
      fontSize: '0.75rem',
      fontWeight: '600',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
    }}>
      {s.label}
    </span>
  );
}

function ApplicationRow({ app, onDecision }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const decide = async (newStatus) => {
  setLoading(true);
  setError('');
  try {
    await decideApplication(app.id, newStatus);
    setExpanded(false);
  } catch (err) {
    setError(err.message);
    setLoading(false);
    return;
  }
  try {
    await onDecision();
  } catch {
    // re-fetch failing is non-critical
  } finally {
    setLoading(false);
  }
};

  const isPending = app.status === 'pending';

  return (
    <>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {/* Icon */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
          flexShrink: 0,
          marginRight: '1rem',
        }}>
          <FiFileText size={16} />
        </div>

        {/* Reg number and type */}
        <div style={{ flex: 2 }}>
          <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
            {app.reg_number}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            {app.type} · {app.email}
          </p>
        </div>

        {/* Submitted date */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>
            {new Date(app.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Status badge */}
        <div style={{ flex: 1 }}>
          <StatusBadge status={app.status} />
        </div>

        {/* Expand arrow */}
        <div style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
          {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          padding: '1rem 1.25rem 1rem 4.25rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.5rem' }}>
            <strong>Address:</strong> {app.address}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.75rem' }}>
            <strong>Details:</strong> {app.details}
          </p>

          {error && (
            <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          {isPending && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={(e) => { e.stopPropagation(); decide('approved'); }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '0.375rem',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <FiCheck size={13} /> Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); decide('rejected'); }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '0.375rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <FiX size={13} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async () => {
  try {
    setLoading(true);
    const data = await getAllApplications();
    setApplications(data);
    setError('');
  } catch (err) {
    // Don't overwrite the page with an error if we already have data
    if (applications.length === 0) {
      setError(err.message);
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchApplications(); }, []);

  const filtered = applications.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch = a.reg_number.toLowerCase().includes(searchQuery.toLowerCase())
      || a.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px',
            border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading applications...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
        <FiAlertCircle size={48} style={{ marginBottom: '1rem' }} />
        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Failed to load applications</p>
        <p style={{ fontSize: '0.875rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' }}>
          Commercial Applications
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Review and action membership applications submitted via IPOS-PU
        </p>
      </div>

      {/* Status filter cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { key: 'all',      label: 'All Applications', color: '#6366f1', bg: '#ede9fe' },
          { key: 'pending',  label: 'Pending',           color: '#d97706', bg: '#fef3c7' },
          { key: 'approved', label: 'Approved',          color: '#16a34a', bg: '#dcfce7' },
          { key: 'rejected', label: 'Rejected',          color: '#dc2626', bg: '#fee2e2' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            style={{
              background: statusFilter === item.key ? item.bg : 'white',
              border: statusFilter === item.key
                ? `2px solid ${item.color}`
                : '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <p style={{
              fontSize: '0.75rem',
              color: statusFilter === item.key ? item.color : '#64748b',
              fontWeight: '500',
              marginBottom: '0.25rem',
            }}>
              {item.label}
            </p>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: statusFilter === item.key ? item.color : '#0f172a',
            }}>
              {counts[item.key]}
            </p>
          </button>
        ))}
      </div>

      {/* Search and list */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {/* Search bar */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <input
            type="text"
            placeholder="Search by registration number or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              color: '#0f172a',
            }}
          />
          <p style={{ color: '#64748b', fontSize: '0.875rem', flexShrink: 0 }}>
            {filtered.length} of {applications.length} applications
          </p>
        </div>

        {/* Table header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ width: '40px', marginRight: '1rem' }} />
          <p style={{ flex: 2, fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
            REGISTRATION / EMAIL
          </p>
          <p style={{ flex: 1, fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
            SUBMITTED
          </p>
          <p style={{ flex: 1, fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
            STATUS
          </p>
          <div style={{ width: '24px' }} />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <FiFileText size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontWeight: '500' }}>No applications found</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          filtered.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              onDecision={fetchApplications}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ApplicationsPage;