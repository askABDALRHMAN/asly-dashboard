'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Clock3, Coffee,
  Layers3, LogOut, Moon, PackageCheck, PackageX, Search, ShoppingBag, Sun, Truck,
  UserRoundCheck, X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const STATUSES = [
  { key: 'new', label: 'طلب جديد', icon: ShoppingBag },
  { key: 'under_review', label: 'جاري المراجعة', icon: Clock3 },
  { key: 'sold', label: 'تم البيع', icon: PackageCheck },
  { key: 'rejected', label: 'تم الرفض', icon: CircleAlert },
  { key: 'out_for_delivery', label: 'جاري التوصيل', icon: Truck },
  { key: 'out_of_stock', label: 'المخزن انتهى', icon: PackageX },
] as const;
const STATUS_LABELS = Object.fromEntries(STATUSES.map((item) => [item.key, item.label])) as Record<string, string>;
const EMPTY_STATS = { total: 0, ...Object.fromEntries(STATUSES.map((item) => [item.key, 0])) } as Record<string, number>;

type OrderStatus = (typeof STATUSES)[number]['key'];
type Order = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  coffeeType: string;
  quantity: number;
  notes: string;
  price: number;
  status: OrderStatus;
  createdAt: string;
};
type Pagination = { page: number; limit: number; total: number; totalPages: number };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);
}

function whatsappLink(phone: string) {
  const normalized = phone.replace(/\D/g, '');
  return normalized ? `https://wa.me/${normalized}` : undefined;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Record<string, number>>(EMPTY_STATS);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{ order: Order; status: OrderStatus } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem('asly-admin-theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('asly-admin-theme', theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      try {
        const response = await fetch(`${API_URL}/api/admin/orders?${params}`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        });
        if (response.status === 401) {
          window.location.replace('/admin/login');
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'تعذر تحميل الطلبات');
        setOrders(result.orders);
        setStats({ ...EMPTY_STATS, ...result.stats });
        setPagination(result.pagination);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'تعذر الاتصال بالخادم، حاول مجدداً');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, statusFilter, refreshKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function chooseStatus(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  async function updateStatus() {
    if (!pendingUpdate) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${pendingUpdate.order._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: pendingUpdate.status }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.message || 'تعذر تحديث حالة الطلب');
      setPendingUpdate(null);
      setToast(result.message || 'تم تحديث حالة الطلب بنجاح');
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setPendingUpdate(null);
      setToast(requestError instanceof Error ? requestError.message : 'تعذر تحديث الطلب حالياً');
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/admin/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      window.location.replace('/admin/login');
    }
  }

  const visibleOrders = grouped
    ? STATUSES.map((status) => ({ ...status, orders: orders.filter((order) => order.status === status.key) })).filter((section) => section.orders.length)
    : [];

  function renderOrders(orderList: Order[]) {
    return <>
      <div className="desktop-table-wrap ">
        <table className="orders-table">
          <thead><tr><th>العميل</th><th>القهوة والكمية</th><th>السعر</th><th>العنوان والملاحظات</th><th>تاريخ الطلب</th><th>الحالة</th><th>الإجراء</th></tr></thead>
          <tbody>{orderList.map((order) => <tr key={order._id}>
            <td><div className="table-order-name">{order.name || 'بدون اسم'}</div><a className="phone-link" href={`tel:${order.phone}`} dir="ltr">{order.phone || '—'}</a></td>
            <td><div className="table-order-name">{order.coffeeType || '—'}</div><span className="muted">{order.quantity} × الكمية</span></td>
            <td className="price-cell">{formatPrice(order.price)}</td>
            <td className="address-cell">{order.address || 'لا يوجد عنوان'}<small>ملاحظة: {order.notes || 'لا توجد ملاحظات'}</small></td>
            <td className="date-cell">{formatDate(order.createdAt)}</td>
            <td><span className={`status-badge status-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></td>
            <td><div className="table-actions"><label className="sr-only" htmlFor={`table-status-${order._id}`}>تغيير حالة طلب {order.name}</label><div className="select-wrap"><select id={`table-status-${order._id}`} value={order.status} onChange={(event) => setPendingUpdate({ order, status: event.target.value as OrderStatus })} aria-label="تغيير حالة الطلب">{STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select><ChevronDown size={14} /></div>{whatsappLink(order.phone) && <a className="whatsapp-icon" href={whatsappLink(order.phone)} target="_blank" rel="noreferrer" aria-label={`مراسلة ${order.name} عبر واتساب`}>واتساب</a>}</div></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mobile-orders">{orderList.map((order) => <article className="mobile-order" key={order._id}>
        <div className="mobile-order-top"><div><strong>{order.name || 'بدون اسم'}</strong><a href={`tel:${order.phone}`} dir="ltr">{order.phone || '—'}</a></div><span className={`status-badge status-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></div>
        <div className="mobile-order-grid"><div><span>القهوة</span><strong>{order.coffeeType || '—'}</strong></div><div><span>الكمية</span><strong>{order.quantity}</strong></div><div><span>السعر</span><strong>{formatPrice(order.price)}</strong></div><div><span>التاريخ</span><strong>{formatDate(order.createdAt)}</strong></div></div>
        <p className="mobile-address"><span>العنوان</span>{order.address || 'لا يوجد عنوان'}<small>ملاحظة: {order.notes || 'لا توجد ملاحظات'}</small></p>
        <div className="mobile-order-bottom"><div className="select-wrap"><select value={order.status} onChange={(event) => setPendingUpdate({ order, status: event.target.value as OrderStatus })} aria-label="تغيير حالة الطلب">{STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select><ChevronDown size={14} /></div>{whatsappLink(order.phone) && <a className="whatsapp-link" href={whatsappLink(order.phone)} target="_blank" rel="noreferrer">مراسلة واتساب</a>}</div>
      </article>)}</div>
    </>;
  }

  return <main className={`admin-shell theme-${theme}`} dir="rtl">
    <header className="admin-header">
      <a href="/admin" className="dashboard-brand"><span className="brand-icon"><Coffee size={19} /></span><span>أصلي <small>إدارة المتجر</small></span></a>
      <div className="header-actions"><button className="icon-button theme-button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'} title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span></button><button className="logout-button" onClick={logout}><LogOut size={16} /><span>تسجيل الخروج</span></button></div>
    </header>
    <div className="dashboard-content">
      <section className="page-heading"><div><p className="eyebrow">ASLY COFFEE · OVERVIEW</p><h1>إدارة الطلبات</h1><p>تابع طلبات عملائك وحالتها من مكان واحد.</p></div><div className="live-indicator"><span /> متصل بالطلبات</div></section>
      <section className="stats-grid" aria-label="ملخص الطلبات">
        <button className={`stat-card stat-total ${!statusFilter ? 'is-selected' : ''}`} onClick={() => chooseStatus('')}><span className="stat-icon"><ShoppingBag size={18} /></span><span className="stat-label">كل الطلبات</span><strong>{(stats.total || 0).toLocaleString('ar-EG')}</strong><small>إجمالي الطلبات</small></button>
        {STATUSES.map(({ key, label, icon: Icon }) => <button key={key} className={`stat-card stat-${key} ${statusFilter === key ? 'is-selected' : ''}`} onClick={() => chooseStatus(key)}><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><strong>{(stats[key] || 0).toLocaleString('ar-EG')}</strong><small>عرض الطلبات <ArrowLeft size={12} /></small></button>)}
      </section>
      <section className="orders-section">
        <div className="section-heading"><div><h2>الطلبات</h2><p>{pagination.total.toLocaleString('ar-EG')} طلب في النتائج الحالية</p></div><label className="group-toggle"><input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} /><span className="switch-track"><span /></span><Layers3 size={16} /><span>تجميع حسب الحالة</span></label></div>
        <div className="filter-bar"><label className="search-field"><Search size={18} /><input type="search" placeholder="ابحث بالاسم أو رقم الهاتف أو نوع القهوة" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><label className="status-filter"><span className="sr-only">تصفية حسب الحالة</span><select value={statusFilter} onChange={(event) => chooseStatus(event.target.value)}><option value="">كل الحالات</option>{STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select><ChevronDown size={16} /></label><button className="reset-button" onClick={() => { setSearch(''); chooseStatus(''); setPage(1); }}><ArrowDown size={15} /> إعادة ضبط</button></div>
        {error && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{error}</span><button onClick={() => setRefreshKey((value) => value + 1)} aria-label="إعادة المحاولة"><ArrowLeft size={16} /></button></div>}
        {loading ? <div className="loading-state"><span className="loader" /><p>جارٍ تحميل الطلبات...</p></div> : !error && orders.length === 0 ? <div className="empty-state"><span><Search size={22} /></span><strong>لا توجد طلبات مطابقة</strong><p>جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر.</p></div> : !error && grouped ? <div className="grouped-orders">{visibleOrders.map((section) => <section className="group-section" key={section.key}><div className="group-heading"><span className={`status-dot status-dot-${section.key}`} /><h3>{section.label}</h3><span>{section.orders.length.toLocaleString('ar-EG')}</span></div>{renderOrders(section.orders)}</section>)}</div> : !error ? renderOrders(orders) : null}
        {!loading && !error && orders.length > 0 && <div className="pagination"><span>صفحة {pagination.page.toLocaleString('ar-EG')} من {Math.max(pagination.totalPages, 1).toLocaleString('ar-EG')}</span><div><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="الصفحة السابقة"><ArrowRight size={17} /></button><button onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} aria-label="الصفحة التالية"><ArrowLeft size={17} /></button></div></div>}
      </section>
      <footer className="dashboard-footer"><span><Coffee size={14} /> أصلي للقهوة المختصة</span><span>إدارة يومية بهدوء</span></footer>
    </div>
    {pendingUpdate && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingUpdate(null); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" onClick={() => setPendingUpdate(null)} aria-label="إغلاق"><X size={18} /></button><span className="dialog-icon"><UserRoundCheck size={21} /></span><p className="eyebrow">تحديث الطلب</p><h2 id="dialog-title">تأكيد تغيير الحالة؟</h2><p>سيتم تغيير حالة طلب <strong>{pendingUpdate.order.name || 'بدون اسم'}</strong> إلى <strong>{STATUS_LABELS[pendingUpdate.status]}</strong>.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setPendingUpdate(null)}>إلغاء</button><button className="primary-button" onClick={updateStatus}><Check size={16} /> تأكيد التغيير</button></div></section></div>}
    {toast && <div className="toast-message" role="status"><Check size={17} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="إغلاق"><X size={15} /></button></div>}
  </main>;
}