import { useState, useEffect, useCallback } from 'react';
import auditService from '../services/auditService';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-blue-600 px-6 py-3">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const CATEGORY_STYLES = {
  auth:         { bg: 'bg-slate-100',  text: 'text-slate-700'  },
  accounts:     { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  catalogue:    { bg: 'bg-violet-100', text: 'text-violet-700' },
  orders:       { bg: 'bg-orange-100', text: 'text-orange-700' },
  payments:     { bg: 'bg-green-100',  text: 'text-green-700'  },
  applications: { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  reports:      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

function actionStyle(action) {
  if (['login_failed', 'merchant_account_defaulted', 'user_deleted', 'merchant_deleted', 'product_deleted'].includes(action))
    return 'bg-red-100 text-red-700';
  if (['login', 'logout', 'password_changed'].includes(action))
    return 'bg-slate-100 text-slate-600';
  if (action.includes('created') || action.includes('approved') || action.includes('restored'))
    return 'bg-green-100 text-green-700';
  if (action.includes('suspended') || action.includes('rejected'))
    return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function CategoryBadge({ value }) {
  const s = CATEGORY_STYLES[value] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {value}
    </span>
  );
}

function ActionBadge({ value }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionStyle(value)}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 shrink-0 w-32">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}

function DetailDrawer({ entry, onClose }) {
  if (!entry) return null;

  let parsed = null;
  if (entry.detail) {
    try { parsed = JSON.parse(entry.detail); } catch { parsed = entry.detail; }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 z-10 overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Audit Entry Detail</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <Row label="Timestamp"    value={new Date(entry.timestamp).toLocaleString()} />
          <Row label="Performed by" value={entry.performed_by_username} />
          <Row label="Category"     value={<CategoryBadge value={entry.category} />} />
          <Row label="Action"       value={<ActionBadge value={entry.action} />} />
          {entry.target_type  && <Row label="Target type" value={entry.target_type} />}
          {entry.target_id    && <Row label="Target ID"   value={<span className="font-mono text-xs text-gray-500">{entry.target_id}</span>} />}
          {entry.target_label && <Row label="Target"      value={entry.target_label} />}
          {entry.ip_address   && <Row label="IP address"  value={<span className="font-mono text-xs">{entry.ip_address}</span>} />}
          {parsed && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Detail</p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 whitespace-pre-wrap">
                {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
        active   ? 'bg-blue-600 text-white' :
        disabled ? 'text-gray-300 cursor-not-allowed' :
                   'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <PageBtn label="«" disabled={page === 1}           onClick={() => onChange(1)} />
      <PageBtn label="‹" disabled={page === 1}           onClick={() => onChange(page - 1)} />
      {start > 1 && <span className="px-2 text-gray-400 text-sm">…</span>}
      {pages.map((p) => <PageBtn key={p} label={p} active={p === page} onClick={() => onChange(p)} />)}
      {end < totalPages && <span className="px-2 text-gray-400 text-sm">…</span>}
      <PageBtn label="›" disabled={page === totalPages}  onClick={() => onChange(page + 1)} />
      <PageBtn label="»" disabled={page === totalPages}  onClick={() => onChange(totalPages)} />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function AuditLogPage() {
  const [category,   setCategory]   = useState('');
  const [action,     setAction]     = useState('');
  const [username,   setUsername]   = useState('');
  const [startDate,  setStartDate]  = useState(thirtyDaysAgo());
  const [endDate,    setEndDate]    = useState(today());
  const [page,       setPage]       = useState(1);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [categories, setCategories] = useState([]);
  const [actions,    setActions]    = useState([]);
  const [selected,   setSelected]   = useState(null);

  useEffect(() => {
    auditService.getCategories().then(setCategories).catch(() => {});
    auditService.getActions().then(setActions).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const result = await auditService.getLogs({
        page: p,
        pageSize: 50,
        category:  category  || undefined,
        action:    action    || undefined,
        username:  username  || undefined,
        startDate: startDate || undefined,
        endDate:   endDate   || undefined,
      });
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [category, action, username, startDate, endDate]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  function handleApply() {
    setPage(1);
    fetchLogs(1);
  }

  function handleClear() {
    setCategory('');
    setAction('');
    setUsername('');
    setStartDate(thirtyDaysAgo());
    setEndDate(today());
    setPage(1);
    fetchLogs(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete record of all system actions — who did what and when</p>
          </div>
          {data && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-right">
              <p className="text-xs text-blue-600 font-medium">Total entries</p>
              <p className="text-xl font-bold text-blue-800">{data.total.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <SectionCard title="Filters">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
                <option value="">All actions</option>
                {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
              <input type="text" placeholder="Search username…" value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                Apply
              </button>
              <button onClick={handleClear}
                className="border border-gray-300 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Clear
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Table */}
        <SectionCard title={`Activity Log${data ? ` — page ${data.page} of ${data.total_pages}` : ''}`}>
          {loading && <Spinner />}
          {error   && <ErrorBox message={error} />}
          {!loading && !error && data && (
            <>
              {data.items.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No audit entries match the current filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Timestamp</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">IP</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((entry) => (
                        <tr key={entry.id}
                          className="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                          onClick={() => setSelected(entry)}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{entry.performed_by_username}</td>
                          <td className="px-4 py-3"><CategoryBadge value={entry.category} /></td>
                          <td className="px-4 py-3"><ActionBadge value={entry.action} /></td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                            {entry.target_label
                              ? entry.target_label
                              : entry.target_type
                              ? <span className="text-gray-400 italic">{entry.target_type}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden xl:table-cell">
                            {entry.ip_address || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-xs">›</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={data.page} totalPages={data.total_pages} onChange={(p) => setPage(p)} />
            </>
          )}
        </SectionCard>
      </div>

      <DetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}