import { useState, useEffect, useRef } from 'react';
import reportService from '../services/reportService';
import { apiClient } from '../services/apiClient';

// ── PDF download ────────────────────────────────────────────────────────────

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function downloadAsPDF(element, filename) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

  const canvas = await window.html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let yOffset = 0;
  while (yOffset < imgH) {
    if (yOffset > 0) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      -yOffset,
      imgW,
      imgH
    );
    yOffset += pageH;
  }

  pdf.save(filename);
}

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return `£${parseFloat(n).toFixed(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── small UI helpers ────────────────────────────────────────────────────────

function Badge({ value }) {
  const colours =
    value === 'paid'
      ? 'bg-green-100 text-green-800'
      : value === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colours}`}>
      {value}
    </span>
  );
}

function StatusBadge({ value }) {
  const map = {
    accepted: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    dispatched: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[value] || 'bg-gray-100 text-gray-700'}`}>
      {value}
    </span>
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

// ── date range control ──────────────────────────────────────────────────────

function DateRange({ startDate, endDate, onChange }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange('endDate', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ── individual report components ────────────────────────────────────────────

function TurnoverReport({ data }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Period: {data.start_date} → {data.end_date}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-right">
          <p className="text-xs text-blue-600 font-medium">Total Revenue</p>
          <p className="text-xl font-bold text-blue-800">{fmt(data.grand_total_revenue)}</p>
        </div>
      </div>

      {data.items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No sales in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty Sold</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product_code}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">{item.total_quantity_sold}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-gray-700">TOTALS</td>
                <td className="px-4 py-3 text-right">
                  {data.items.reduce((s, i) => s + i.total_quantity_sold, 0)}
                </td>
                <td className="px-4 py-3 text-right text-blue-700">{fmt(data.grand_total_revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function MerchantSummaryReport({ data }) {
  return (
    <div>
      {/* Appendix 4 style merchant header */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
          <div className="font-semibold text-gray-800 text-base">{data.company_name}</div>
          <div className="text-gray-600">{data.address}</div>
          {data.contact_phone && <div className="text-gray-600">Phone: {data.contact_phone}</div>}
          <div className="text-gray-600">IPOS Account: {data.account_number}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
          <div className="text-gray-500">Report Period</div>
          <div className="font-medium">{data.start_date} – {data.end_date}</div>
          <div className="text-gray-500 mt-2">Contact: {data.contact_name}</div>
          <div className="text-gray-500">{data.contact_email}</div>
        </div>
      </div>

      {data.orders.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No orders in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ordered</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount, £</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dispatched</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Delivered</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.order_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {o.order_id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">{o.order_date}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(o.amount_due)}</td>
                  <td className="px-4 py-3 text-gray-600">{o.dispatched_date || 'Pending'}</td>
                  <td className="px-4 py-3 text-gray-600">{o.delivered_date || 'Pending'}</td>
                  <td className="px-4 py-3">
                    {o.payment_date
                      ? <span className="text-green-700">{o.payment_date}</span>
                      : <span className="text-yellow-600">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td className="px-4 py-3 text-gray-700">Total: {data.total_orders}</td>
                <td />
                <td className="px-4 py-3 text-right text-blue-700">{fmt(data.total_amount_due)}</td>
                <td className="px-4 py-3 text-gray-600">{data.dispatched_orders}</td>
                <td />
                <td className="px-4 py-3 text-gray-600">{data.paid_orders}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function MerchantDetailedReport({ data }) {
  return (
    <div>
      {/* Merchant header */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div><span className="text-gray-500">Company:</span> <span className="font-medium">{data.company_name}</span></div>
        <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{data.contact_name}</span></div>
        <div><span className="text-gray-500">Email:</span> {data.contact_email}</div>
        <div><span className="text-gray-500">Phone:</span> {data.contact_phone || '—'}</div>
        <div className="col-span-2"><span className="text-gray-500">Address:</span> {data.address}</div>
        <div className="col-span-2 text-gray-400">Period: {data.start_date} → {data.end_date}</div>
      </div>

      {data.orders.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No orders in this period.</p>
      ) : (
        <div className="space-y-6">
          {data.orders.map((order) => (
            <div key={order.order_id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex flex-wrap gap-4 items-center justify-between border-b border-gray-200">
                <span className="font-mono text-xs text-gray-500">{order.order_id}</span>
                <span className="text-sm text-gray-600">{order.order_date}</span>
                <StatusBadge value={order.status} />
                <Badge value={order.payment_status} />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-500">ItemID</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Description</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Quantity</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Unit cost, £</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Amount, £</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{item.product_code}</td>
                      <td className="px-4 py-2">{item.product_name}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{fmt(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right">{fmt(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 text-sm font-medium">
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Subtotal</td>
                    <td className="px-4 py-2 text-right">{fmt(order.total)}</td>
                  </tr>
                  {parseFloat(order.discount) > 0 && (
                    <tr className="bg-gray-50 text-sm">
                      <td colSpan={3} className="px-4 py-2 text-right text-green-600">Discount</td>
                      <td className="px-4 py-2 text-right text-green-700">−{fmt(order.discount)}</td>
                    </tr>
                  )}
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2 text-right text-blue-700">Amount Due</td>
                    <td className="px-4 py-2 text-right text-blue-800">{fmt(order.amount_due)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LowStockReport({ data }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-100 text-red-700 rounded-lg px-3 py-1 text-sm font-medium">
          {data.total_items_below_minimum} item{data.total_items_below_minimum !== 1 ? 's' : ''} below minimum
        </div>
        <span className="text-xs text-gray-400">Generated: {new Date(data.generated_at).toLocaleString()}</span>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-green-600 font-medium">✓ All items are above minimum stock levels.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Availability, packs</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock limit, packs</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Recommended Min Order</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-100 hover:bg-red-50/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product_code}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{item.current_stock}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{item.min_stock_level}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium text-xs">
                      {item.recommended_min_order}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StockTurnoverReport({ data }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Period: {data.start_date} → {data.end_date}</p>
      {data.items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No stock movement in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Opening</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sold</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Received</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Closing</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product_code}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{item.opening_stock}</td>
                  <td className="px-4 py-3 text-right text-red-600">−{item.quantity_sold}</td>
                  <td className="px-4 py-3 text-right text-green-600">+{item.quantity_received}</td>
                  <td className="px-4 py-3 text-right font-medium">{item.closing_stock}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-gray-700">TOTALS</td>
                <td className="px-4 py-3 text-right text-gray-500">—</td>
                <td className="px-4 py-3 text-right text-red-600">
                  −{data.items.reduce((s, i) => s + i.quantity_sold, 0)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{data.items.reduce((s, i) => s + i.quantity_received, 0)}
                </td>
                <td className="px-4 py-3 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

//  invoices raised against a specific merchant for a period
// staff can click through each invoice to see the details on screen
function MerchantInvoicesReport({ data }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      {/* merchant header */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div><span className="text-gray-500">Company:</span> <span className="font-medium">{data.company_name}</span></div>
        <div><span className="text-gray-500">Account:</span> <span className="font-medium">{data.account_number}</span></div>
        <div><span className="text-gray-500">Contact:</span> {data.contact_name}</div>
        <div><span className="text-gray-500">Email:</span> {data.contact_email}</div>
        <div className="col-span-2"><span className="text-gray-500">Address:</span> {data.address}</div>
        <div className="col-span-2 text-gray-400">Period: {data.start_date} → {data.end_date}</div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-right">
          <p className="text-xs text-blue-600 font-medium">Total Invoiced</p>
          <p className="text-xl font-bold text-blue-800">{fmt(data.total_amount_due)}</p>
        </div>
        <span className="text-sm text-gray-500">{data.total_invoices} invoice{data.total_invoices !== 1 ? 's' : ''}</span>
      </div>

      {data.invoices.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No invoices in this period.</p>
      ) : (
        <div className="space-y-2">
          {data.invoices.map((inv) => (
            <div key={inv.invoice_id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* clickable header row - click to expand invoice details */}
              <button
                onClick={() => setExpandedId(expandedId === inv.invoice_id ? null : inv.invoice_id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-gray-400">INV-{inv.invoice_id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-sm text-gray-600">{inv.invoice_date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-blue-700">{fmt(inv.amount_due)}</span>
                  <span className="text-gray-400 text-xs">{expandedId === inv.invoice_id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* expanded invoice detail */}
              {expandedId === inv.invoice_id && (
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50/50 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Reference</span>
                    <span className="font-mono text-xs text-gray-600">ORD-{inv.order_id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice Date</span>
                    <span>{inv.invoice_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Amount</span>
                    <span>{fmt(inv.total_amount)}</span>
                  </div>
                  {parseFloat(inv.discount_amount) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount Applied</span>
                      <span>−{fmt(inv.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                    <span>Amount Due</span>
                    <span className="text-blue-700">{fmt(inv.amount_due)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// all invoices raised by InfoPharma for a period (across all merchants)
function AllInvoicesReport({ data }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-right">
          <p className="text-xs text-blue-600 font-medium">Grand Total Invoiced</p>
          <p className="text-xl font-bold text-blue-800">{fmt(data.grand_total_amount_due)}</p>
        </div>
        <span className="text-sm text-gray-500">
          {data.total_invoices} invoice{data.total_invoices !== 1 ? 's' : ''} | Period: {data.start_date} → {data.end_date}
        </span>
      </div>

      {data.invoices.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No invoices in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Merchant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Account</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total, £</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Discount, £</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount Due, £</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.invoice_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    INV-{inv.invoice_id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-medium">{inv.company_name}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.account_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.invoice_date}</td>
                  <td className="px-4 py-3 text-right">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {parseFloat(inv.discount_amount) > 0 ? `−${fmt(inv.discount_amount)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-blue-700">{fmt(inv.amount_due)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td colSpan={4} className="px-4 py-3 text-gray-700">TOTALS</td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-right text-blue-700">{fmt(data.grand_total_amount_due)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── main page ───────────────────────────────────────────────────────────────

const REPORT_ICONS = {
  'turnover': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#ede9fe'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    </div>
  ),
  'merchant-summary': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dbeafe'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    </div>
  ),
  'merchant-detailed': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dcfce7'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </div>
  ),
  'low-stock': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#fef9c3'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
  ),
  'stock-turnover': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dbeafe'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    </div>
  ),
  'merchant-invoices': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#fce7f3'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9d174d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    </div>
  ),
  'all-invoices': (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#ecfdf5'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </div>
  ),
};

const REPORT_TYPES = [
  { id: 'turnover', label: 'Turnover', desc: 'Revenue & quantities sold' },
  { id: 'merchant-summary', label: 'Orders Summary', desc: 'Orders for a merchant' },
  { id: 'merchant-detailed', label: 'Orders Detailed', desc: 'Full order breakdown' },
  { id: 'merchant-invoices', label: 'Merchant Invoices', desc: 'Invoices per merchant' },
  { id: 'all-invoices', label: 'All Invoices', desc: 'All InfoPharma invoices' },
  { id: 'low-stock', label: 'Low Stock', desc: 'Items below minimum' },
  { id: 'stock-turnover', label: 'Stock Turnover', desc: 'Goods in & out' },
];

function ReportsPage() {
  const [activeReport, setActiveReport] = useState('turnover');
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef(null);

  const needsMerchant = ['merchant-summary', 'merchant-detailed', 'merchant-invoices'].includes(activeReport);
  const needsDates = activeReport !== 'low-stock';

  // load merchant list for merchant-specific reports
  useEffect(() => {
    if (needsMerchant) {
      apiClient.get('/merchants').then((data) => {
        setMerchants(data || []);
        if (data && data.length > 0 && !selectedMerchantId) {
          setSelectedMerchantId(data[0].id);
        }
      }).catch(() => {});
    }
  }, [activeReport]);

  // Clear report when switching type
  useEffect(() => {
    setReportData(null);
    setError('');
  }, [activeReport]);

  function switchReport(id) {
    setReportData(null);
    setError('');
    setActiveReport(id);
  }

  async function runReport() {
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      let data;
      if (activeReport === 'turnover') {
        data = await reportService.getTurnoverReport(startDate, endDate);
      } else if (activeReport === 'merchant-summary') {
        if (!selectedMerchantId) throw new Error('Please select a merchant');
        data = await reportService.getMerchantOrdersSummary(selectedMerchantId, startDate, endDate);
      } else if (activeReport === 'merchant-detailed') {
        if (!selectedMerchantId) throw new Error('Please select a merchant');
        data = await reportService.getMerchantOrdersDetailed(selectedMerchantId, startDate, endDate);
      } else if (activeReport === 'merchant-invoices') {
        if (!selectedMerchantId) throw new Error('Please select a merchant');
        data = await reportService.getMerchantInvoicesReport(selectedMerchantId, startDate, endDate);
      } else if (activeReport === 'all-invoices') {
        data = await reportService.getAllInvoicesReport(startDate, endDate);
      } else if (activeReport === 'low-stock') {
        data = await reportService.getLowStockReport();
      } else if (activeReport === 'stock-turnover') {
        data = await reportService.getStockTurnoverReport(startDate, endDate);
      }
      setReportData({ ...data, _type: activeReport });
    } catch (e) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const current = REPORT_TYPES.find((r) => r.id === activeReport);
      const filename = `${current.label.replace(/\s+/g, '_')}_${reportData.start_date || 'report'}.pdf`;
      await downloadAsPDF(reportRef.current, filename);
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  const current = REPORT_TYPES.find((r) => r.id === activeReport);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generate and view system reports</p>
          </div>
          {reportData && (
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
            </div>
          )}
        </div>

        {/* Report type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => switchReport(rt.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeReport === rt.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <div className="mb-3">{REPORT_ICONS[rt.id]}</div>
              <div className={`text-sm font-semibold ${activeReport === rt.id ? 'text-blue-700' : 'text-gray-800'}`}>
                {rt.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{rt.desc}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <SectionCard title={`${current.label} — Filters`}>
          <div className="flex flex-wrap gap-6 items-end">
            {needsDates && (
              <DateRange
                startDate={startDate}
                endDate={endDate}
                onChange={(field, val) => {
                  if (field === 'startDate') setStartDate(val);
                  else setEndDate(val);
                }}
              />
            )}

            {needsMerchant && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Merchant</label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                >
                  <option value="">— select merchant —</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={runReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </SectionCard>

        {/* Report output */}
        {(loading || error || reportData) && (
          <SectionCard title="Report Output">
            <div ref={reportRef}>
              {loading && <Spinner />}
              {error && <ErrorBox message={error} />}
              {!loading && !error && reportData && reportData._type === activeReport && (
                <>
                  {activeReport === 'turnover' && <TurnoverReport data={reportData} />}
                  {activeReport === 'merchant-summary' && <MerchantSummaryReport data={reportData} />}
                  {activeReport === 'merchant-detailed' && <MerchantDetailedReport data={reportData} />}
                  {activeReport === 'merchant-invoices' && <MerchantInvoicesReport data={reportData} />}
                  {activeReport === 'all-invoices' && <AllInvoicesReport data={reportData} />}
                  {activeReport === 'low-stock' && <LowStockReport data={reportData} />}
                  {activeReport === 'stock-turnover' && <StockTurnoverReport data={reportData} />}
                </>
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
