import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Users, Package, FileText, ArrowRightLeft, LogOut, Plus, Search,
  AlertTriangle, X, Check, Eye, Printer, Trash2, Edit, Calendar, UserCheck, ShieldCheck, ChevronRight
} from 'lucide-react';
import './style.css';

const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API = rawApi.startsWith('http') ? rawApi : `https://${rawApi}`;
const labels: any = { ADMIN: 'Administrator', SALES: 'Sales', WAREHOUSE: 'Warehouse', ACCOUNTS: 'Accounts' };

const demoAccounts = [
  { role: 'ADMIN', email: 'admin@orbitops.dev', name: 'Aarav Mehta' },
  { role: 'SALES', email: 'sales@orbitops.dev', name: 'Isha Shah' },
  { role: 'WAREHOUSE', email: 'warehouse@orbitops.dev', name: 'Kabir Rao' },
  { role: 'ACCOUNTS', email: 'accounts@orbitops.dev', name: 'Mira Nair' }
];

async function request(path: string, token: string, options: any = {}) {
  const r = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
  const body = await r.json().catch(() => ({ error: 'Response parse error' }));
  if (!r.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function Login({ onLogin }: any) {
  const [email, setEmail] = useState('admin@orbitops.dev');
  const [password, setPassword] = useState('Demo@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const x = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLogin(x);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section>
        <div className="brand-mark">O</div>
        <p className="eyebrow">OPERATIONS, IN ORBIT</p>
        <h1>The calm command center for busy distribution teams.</h1>
        <p className="muted">Customers, inventory, sales challans, and follow-ups — moving in one atomic direction.</p>
        <div className="role-pills">
          {demoAccounts.map(acc => (
            <span
              key={acc.role}
              className={email === acc.email ? 'active' : ''}
              onClick={() => { setEmail(acc.email); setPassword('Demo@123'); }}
              title={`Switch to ${acc.name}`}
            >
              {acc.role}
            </span>
          ))}
        </div>
      </section>
      <form onSubmit={submit} className="login-card">
        <div className="brand">orbit<span>ops</span></div>
        <h2>Welcome back</h2>
        <p>Sign in to access your distribution dashboard.</p>

        {error && <div className="error">{error}</div>}

        <label>
          Work email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </label>

        <button disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign in'} <ArrowRightLeft size={16} />
        </button>

        <div className="demo-accounts-list">
          <p>Quick Sign In:</p>
          <div className="quick-switch-buttons">
            {demoAccounts.map(acc => (
              <button
                type="button"
                key={acc.email}
                className="quick-btn"
                onClick={() => { setEmail(acc.email); setPassword('Demo@123'); }}
              >
                {acc.role} ({acc.name.split(' ')[0]})
              </button>
            ))}
          </div>
        </div>
      </form>
    </main>
  );
}

const nav: [string, any, string][] = [
  ['dashboard', LayoutDashboard, 'Overview'],
  ['customers', Users, 'Customers CRM'],
  ['products', Package, 'Inventory Catalog'],
  ['challans', FileText, 'Sales Challans'],
  ['movements', ArrowRightLeft, 'Stock Audit Trail']
];

function App() {
  const [session, setSession] = useState<any>(() => JSON.parse(localStorage.getItem('orbit-session') || 'null'));
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Modals & Drawers
  const [modal, setModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const token = session?.token;
  const user = session?.user;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const path = view === 'dashboard' ? '/dashboard' : view === 'customers' ? `/customers${q}` : view === 'products' ? `/products${q}` : view === 'challans' ? '/challans' : '/stock-movements';
      const result = await request(path, token);
      setData(result);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [view, token, searchQuery]);

  function login(x: any) {
    localStorage.setItem('orbit-session', JSON.stringify(x));
    setSession(x);
    showToast(`Welcome back, ${x.user.name}!`);
  }

  function signout() {
    localStorage.removeItem('orbit-session');
    setSession(null);
  }

  // Switch active role for demo testing
  async function switchRole(newRole: string) {
    const acc = demoAccounts.find(a => a.role === newRole);
    if (!acc) return;
    try {
      const res = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: acc.email, password: 'Demo@123' }) });
      login(res);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  if (!session) return <Login onLogin={login} />;

  return (
    <div className="shell">
      <aside>
        <div className="brand">orbit<span>ops</span></div>
        <div className="workspace">
          NORTHSTAR DISTRIBUTION
          <span title="Operational portal active">●</span>
        </div>

        <nav>
          {nav.map(([id, Icon, name]: any) => (
            <button className={view === id ? 'active' : ''} onClick={() => { setView(id); setSearchQuery(''); }} key={id}>
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>

        <div className="profile-box">
          <div className="role-switcher">
            <small>Demo Role Switcher:</small>
            <div className="role-buttons">
              {['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].map(r => (
                <button
                  key={r}
                  className={user.role === r ? 'active' : ''}
                  onClick={() => switchRole(r)}
                >
                  {r.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="profile">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <b>{user.name}</b>
              <small>{labels[user.role]}</small>
            </div>
            <button title="Sign out" onClick={signout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header>
          <div>
            <p className="eyebrow">{view === 'dashboard' ? 'OPERATIONS OVERVIEW' : view.toUpperCase()}</p>
            <h1>{view === 'dashboard' ? `Welcome, ${user.name.split(' ')[0]}` : nav.find(n => n[0] === view)?.[2]}</h1>
          </div>

          <div className="header-actions">
            {view === 'customers' && ['ADMIN', 'SALES'].includes(user.role) && (
              <button className="primary" onClick={() => { setSelectedItem(null); setModal('customer'); }}>
                <Plus size={17} /> Add Customer
              </button>
            )}
            {view === 'products' && ['ADMIN', 'WAREHOUSE'].includes(user.role) && (
              <button className="primary" onClick={() => { setSelectedItem(null); setModal('product'); }}>
                <Plus size={17} /> Add Product
              </button>
            )}
            {view === 'challans' && ['ADMIN', 'SALES'].includes(user.role) && (
              <button className="primary" onClick={() => { setSelectedItem(null); setModal('create-challan'); }}>
                <Plus size={17} /> New Sales Challan
              </button>
            )}
            {view === 'movements' && ['ADMIN', 'WAREHOUSE'].includes(user.role) && (
              <button className="primary" onClick={() => { setSelectedItem(null); setModal('stock-movement'); }}>
                <Plus size={17} /> Record Stock Movement
              </button>
            )}
          </div>
        </header>

        {notice && (
          <div className={`notice ${notice.type}`} onClick={() => setNotice(null)}>
            <span>{notice.msg}</span>
            <X size={16} />
          </div>
        )}

        {loading ? (
          <div className="loading">Loading workspace data...</div>
        ) : view === 'dashboard' ? (
          <Dashboard data={data} setView={setView} setModal={setModal} setSelectedItem={setSelectedItem} />
        ) : (
          <Table
            view={view}
            data={data}
            user={user}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setModal={setModal}
            setSelectedItem={setSelectedItem}
            token={token}
            loadData={loadData}
            showToast={showToast}
          />
        )}

        {/* MODALS & DRAWERS */}
        {modal === 'customer' && (
          <CustomerModal
            customer={selectedItem}
            token={token}
            onClose={() => setModal(null)}
            onSuccess={(msg: string) => { setModal(null); loadData(); showToast(msg); }}
          />
        )}

        {modal === 'customer-drawer' && selectedItem && (
          <CustomerDrawer
            customer={selectedItem}
            token={token}
            user={user}
            onClose={() => setModal(null)}
            onUpdate={() => { loadData(); showToast('Customer follow-ups updated'); }}
          />
        )}

        {modal === 'product' && (
          <ProductModal
            product={selectedItem}
            token={token}
            onClose={() => setModal(null)}
            onSuccess={(msg: string) => { setModal(null); loadData(); showToast(msg); }}
          />
        )}

        {modal === 'stock-movement' && (
          <StockMovementModal
            token={token}
            preselectedProduct={selectedItem}
            onClose={() => setModal(null)}
            onSuccess={(msg: string) => { setModal(null); loadData(); showToast(msg); }}
          />
        )}

        {modal === 'create-challan' && (
          <CreateChallanModal
            token={token}
            onClose={() => setModal(null)}
            onSuccess={(msg: string) => { setModal(null); loadData(); showToast(msg); }}
          />
        )}

        {modal === 'challan-detail' && selectedItem && (
          <ChallanDetailModal
            challanId={selectedItem.id}
            token={token}
            user={user}
            onClose={() => setModal(null)}
            onSuccess={(msg: string) => { loadData(); showToast(msg); }}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({ data, setView, setModal, setSelectedItem }: any) {
  const m = data.metrics || {};
  return (
    <>
      <section className="metrics">
        <Metric label="Active customers" value={m.active_customers || 0} detail="Verified buying accounts" onClick={() => setView('customers')} />
        <Metric label="Needs attention" value={m.due_followups || 0} detail="Lead follow-ups due today" warn onClick={() => setView('customers')} />
        <Metric label="Low stock items" value={m.low_stock || 0} detail="Below min stock threshold" warn onClick={() => setView('products')} />
        <Metric label="Dispatched today" value={m.dispatched_today || 0} detail="Confirmed sales challans" onClick={() => setView('challans')} />
      </section>

      <section className="grid">
        <div className="panel activity">
          <div className="panel-title">
            <div>
              <h3>Warehouse Activity Audit</h3>
              <p>Atomic stock movement log</p>
            </div>
            <button onClick={() => setView('movements')}>View all</button>
          </div>
          {data.activity?.length ? (
            data.activity.map((a: any, i: number) => (
              <div className="activity-row" key={i}>
                <div className={a.type === 'IN' ? 'movement in' : 'movement out'}>
                  {a.type === 'IN' ? '+' : '−'}
                </div>
                <div>
                  <b>{a.product_name}</b>
                  <p>{a.reason}</p>
                </div>
                <strong className={a.type === 'IN' ? 'positive' : ''}>
                  {a.type === 'IN' ? '+' : '-'}{a.quantity} units
                </strong>
              </div>
            ))
          ) : (
            <div className="empty">No warehouse movements recorded yet.</div>
          )}
        </div>

        <div className="panel focus">
          <p className="eyebrow">CRM ACTION FOCUS</p>
          <h3>Keep the pipeline moving.</h3>
          <p>
            There are <b>{m.due_followups || 0} customer leads</b> awaiting follow-up today. Prompt follow-ups maintain high conversion rates.
          </p>
          <button className="light" onClick={() => setView('customers')}>
            Open CRM Customers <ArrowRightLeft size={16} />
          </button>
        </div>
      </section>
    </>
  );
}

function Metric(p: any) {
  return (
    <div className="metric" onClick={p.onClick} style={{ cursor: p.onClick ? 'pointer' : 'default' }}>
      <div className={p.warn ? 'icon warn' : 'icon'}>
        {p.warn ? <AlertTriangle size={18} /> : <LayoutDashboard size={18} />}
      </div>
      <p>{p.label}</p>
      <h2>{p.value}</h2>
      <small>{p.detail}</small>
    </div>
  );
}

function Table({ view, data, user, searchQuery, setSearchQuery, setModal, setSelectedItem, token, loadData, showToast }: any) {
  const rows = data.data || [];

  const cols =
    view === 'customers'
      ? [['name', 'Customer'], ['business_name', 'Business Name'], ['mobile', 'Phone'], ['type', 'Type'], ['status', 'Status'], ['follow_up_date', 'Next Follow-up'], ['actions', 'Actions']]
      : view === 'products'
      ? [['name', 'Product Name'], ['sku', 'SKU'], ['category', 'Category'], ['unit_price', 'Unit Price'], ['current_stock', 'Stock On Hand'], ['location', 'Location'], ['actions', 'Actions']]
      : view === 'challans'
      ? [['challan_number', 'Challan #'], ['business_name', 'Customer Business'], ['total_quantity', 'Total Units'], ['status', 'Status'], ['created_at', 'Created Date'], ['actions', 'Actions']]
      : [['product_name', 'Product'], ['type', 'Type'], ['quantity', 'Quantity'], ['reason', 'Movement Reason'], ['created_by_name', 'Logged By'], ['created_at', 'Date']];

  async function handleDelete(type: 'customer' | 'product', id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${type} "${name}"?`)) return;
    try {
      await request(`/${type}s/${id}`, token, { method: 'DELETE' });
      showToast(`${name} deleted successfully`);
      loadData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            placeholder={`Search ${view}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span>Showing {rows.length} record(s)</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              {cols.map((c: any) => <th key={c[0]}>{c[1]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.id || i}>
                {cols.map((c: any) => {
                  const key = c[0];

                  if (key === 'actions') {
                    return (
                      <td key={key} className="table-actions">
                        {view === 'customers' && (
                          <>
                            <button
                              className="btn-icon"
                              title="View Follow-ups & Notes"
                              onClick={() => { setSelectedItem(r); setModal('customer-drawer'); }}
                            >
                              <Eye size={15} /> Notes
                            </button>
                            {['ADMIN', 'SALES'].includes(user.role) && (
                              <button
                                className="btn-icon"
                                title="Edit Customer"
                                onClick={() => { setSelectedItem(r); setModal('customer'); }}
                              >
                                <Edit size={15} />
                              </button>
                            )}
                            {user.role === 'ADMIN' && (
                              <button
                                className="btn-icon danger"
                                title="Delete Customer"
                                onClick={() => handleDelete('customer', r.id, r.name)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {view === 'products' && (
                          <>
                            {['ADMIN', 'WAREHOUSE'].includes(user.role) && (
                              <button
                                className="btn-icon positive"
                                title="Adjust Stock (IN/OUT)"
                                onClick={() => { setSelectedItem(r); setModal('stock-movement'); }}
                              >
                                <ArrowRightLeft size={15} /> Adjust
                              </button>
                            )}
                            {['ADMIN', 'WAREHOUSE'].includes(user.role) && (
                              <button
                                className="btn-icon"
                                title="Edit Product"
                                onClick={() => { setSelectedItem(r); setModal('product'); }}
                              >
                                <Edit size={15} />
                              </button>
                            )}
                            {user.role === 'ADMIN' && (
                              <button
                                className="btn-icon danger"
                                title="Delete Product"
                                onClick={() => handleDelete('product', r.id, r.name)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {view === 'challans' && (
                          <button
                            className="btn-icon"
                            title="View Printable Invoice"
                            onClick={() => { setSelectedItem(r); setModal('challan-detail'); }}
                          >
                            <Printer size={15} /> View Invoice
                          </button>
                        )}
                      </td>
                    );
                  }

                  if (key === 'status' || key === 'type') {
                    return (
                      <td key={key}>
                        <span className={`badge ${String(r[key]).toLowerCase()}`}>
                          {r[key]}
                        </span>
                      </td>
                    );
                  }

                  if (key === 'current_stock') {
                    const isLow = Number(r.current_stock) <= Number(r.min_stock);
                    return (
                      <td key={key}>
                        <span className={isLow ? 'stock-warning' : 'stock-normal'}>
                          {r.current_stock} units {isLow && '⚠️ (Low)'}
                        </span>
                      </td>
                    );
                  }

                  if (key === 'unit_price') {
                    return <td key={key}>₹{Number(r.unit_price).toFixed(2)}</td>;
                  }

                  if (key.includes('date') || key === 'created_at') {
                    return (
                      <td key={key}>
                        {r[key] ? new Date(r[key]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    );
                  }

                  return <td key={key}>{r[key] ?? '—'}</td>;
                })}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={cols.length} className="empty">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* --- MODAL COMPONENTS --- */

function CustomerModal({ customer, token, onClose, onSuccess }: any) {
  const [name, setName] = useState(customer?.name || '');
  const [mobile, setMobile] = useState(customer?.mobile || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [businessName, setBusinessName] = useState(customer?.business_name || '');
  const [gstNumber, setGstNumber] = useState(customer?.gst_number || '');
  const [type, setType] = useState(customer?.type || 'RETAIL');
  const [address, setAddress] = useState(customer?.address || '');
  const [status, setStatus] = useState(customer?.status || 'LEAD');
  const [followUpDate, setFollowUpDate] = useState(customer?.follow_up_date || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate: followUpDate || null, notes };
    try {
      if (customer?.id) {
        await request(`/customers/${customer.id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
        onSuccess(`Customer "${name}" updated successfully`);
      } else {
        await request('/customers', token, { method: 'POST', body: JSON.stringify(payload) });
        onSuccess(`Customer "${name}" created successfully`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{customer ? 'Edit Customer' : 'Add New Customer'}</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit} className="form-grid">
          <label>
            Full Name *
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label>
            Mobile Phone *
            <input value={mobile} onChange={e => setMobile(e.target.value)} required />
          </label>
          <label>
            Business Name *
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} required />
          </label>
          <label>
            Email Address
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            Customer Type *
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </label>
          <label>
            CRM Lead Status *
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label>
            GST Number
            <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="e.g. 29ABCDE1234F1Z5" />
          </label>
          <label>
            Next Follow-up Date
            <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
          </label>
          <label className="full-width">
            Billing Address
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} />
          </label>
          <label className="full-width">
            Initial CRM Notes
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </label>

          <div className="modal-actions full-width">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDrawer({ customer, token, user, onClose, onUpdate }: any) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await request(`/customers/${customer.id}`, token);
      setDetails(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [customer.id]);

  async function addFollowup(e: any) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await request(`/customers/${customer.id}/followups`, token, {
        method: 'POST',
        body: JSON.stringify({ note, followUpDate: followUpDate || undefined })
      });
      setNote('');
      setFollowUpDate('');
      await fetchDetails();
      onUpdate();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-card" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>{customer.name}</h2>
            <p className="muted">{customer.business_name} • {customer.mobile}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div className="loading">Loading timeline...</div>
        ) : (
          <div className="drawer-body">
            <div className="customer-meta-grid">
              <div><small>Status</small><br /><span className={`badge ${details.status.toLowerCase()}`}>{details.status}</span></div>
              <div><small>Type</small><br /><b>{details.type}</b></div>
              <div><small>GST</small><br /><b>{details.gst_number || 'N/A'}</b></div>
              <div><small>Next Follow-up</small><br /><b>{details.follow_up_date || 'None'}</b></div>
            </div>

            {['ADMIN', 'SALES'].includes(user.role) && (
              <form onSubmit={addFollowup} className="add-followup-card">
                <h4>Add Follow-up Note</h4>
                <textarea
                  placeholder="Record customer response, requirement, or call outcome..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  required
                  rows={3}
                />
                <div className="followup-form-footer">
                  <label>
                    Next Date:
                    <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                  </label>
                  <button type="submit" className="primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </form>
            )}

            <h4>Follow-up Timeline</h4>
            <div className="timeline">
              {details?.followups?.length ? (
                details.followups.map((f: any) => (
                  <div className="timeline-item" key={f.id}>
                    <div className="timeline-badge"><Calendar size={14} /></div>
                    <div className="timeline-content">
                      <div className="timeline-meta">
                        <b>{f.created_by_name || 'System'}</b>
                        <small>{new Date(f.created_at).toLocaleString('en-IN')}</small>
                      </div>
                      <p>{f.note}</p>
                      {f.follow_up_date && (
                        <small className="next-date">Next follow-up scheduled for: {f.follow_up_date}</small>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No follow-ups recorded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductModal({ product, token, onClose, onSuccess }: any) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product?.category || 'Office Supplies');
  const [unitPrice, setUnitPrice] = useState(product?.unit_price || '');
  const [currentStock, setCurrentStock] = useState(product?.current_stock ?? 0);
  const [minStock, setMinStock] = useState(product?.min_stock ?? 10);
  const [location, setLocation] = useState(product?.location || 'Warehouse Main');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = { name, sku, category, unitPrice: Number(unitPrice), currentStock: Number(currentStock), minStock: Number(minStock), location };
    try {
      if (product?.id) {
        await request(`/products/${product.id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
        onSuccess(`Product "${name}" updated successfully`);
      } else {
        await request('/products', token, { method: 'POST', body: JSON.stringify(payload) });
        onSuccess(`Product "${name}" created successfully`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{product ? 'Edit Product Catalog' : 'Add New Inventory Item'}</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit} className="form-grid">
          <label>
            Product Name *
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label>
            SKU Code *
            <input value={sku} onChange={e => setSku(e.target.value)} required disabled={!!product} />
          </label>
          <label>
            Category *
            <input value={category} onChange={e => setCategory(e.target.value)} required />
          </label>
          <label>
            Unit Price (₹) *
            <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required />
          </label>
          {!product && (
            <label>
              Initial Stock *
              <input type="number" value={currentStock} onChange={e => setCurrentStock(e.target.value)} required />
            </label>
          )}
          <label>
            Min Safe Stock Threshold *
            <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} required />
          </label>
          <label className="full-width">
            Warehouse Location *
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Bengaluru Rack B-04" required />
          </label>

          <div className="modal-actions full-width">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockMovementModal({ token, preselectedProduct, onClose, onSuccess }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState(preselectedProduct?.id || '');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState('Supplier shipment inbound');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/products?limit=100', token).then(res => {
      setProducts(res.data || []);
      if (!productId && res.data?.length) setProductId(res.data[0].id);
    });
  }, [token]);

  const selectedProd = products.find(p => p.id === productId);
  const projectedStock = selectedProd ? Number(selectedProd.current_stock) + (type === 'IN' ? Number(quantity) : -Number(quantity)) : 0;

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await request(`/products/${productId}/movements`, token, {
        method: 'POST',
        body: JSON.stringify({ quantity: Number(quantity), type, reason })
      });
      onSuccess(`Stock movement logged successfully`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Record Audited Stock Movement</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit} className="form-grid">
          <label className="full-width">
            Select Product *
            <select value={productId} onChange={e => setProductId(e.target.value)}>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.current_stock} in stock</option>
              ))}
            </select>
          </label>
          <label>
            Movement Direction *
            <select value={type} onChange={e => setType(e.target.value as any)}>
              <option value="IN">Stock IN (+)</option>
              <option value="OUT">Stock OUT (-)</option>
            </select>
          </label>
          <label>
            Quantity Units *
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
          </label>

          {selectedProd && (
            <div className="stock-preview-banner full-width">
              <span>Current Stock: <b>{selectedProd.current_stock}</b></span>
              <span>⟶</span>
              <span>Projected Stock: <b className={projectedStock < 0 ? 'text-danger' : 'text-success'}>{projectedStock}</b></span>
            </div>
          )}

          <label className="full-width">
            Audit Reason *
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Received PO-809, Damaged writeoff" required />
          </label>

          <div className="modal-actions full-width">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={loading || projectedStock < 0}>
              {loading ? 'Recording...' : 'Commit Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateChallanModal({ token, onClose, onSuccess }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'CONFIRMED'>('CONFIRMED');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      request('/customers?limit=100', token),
      request('/products?limit=100', token)
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
      if (cRes.data?.length) setCustomerId(cRes.data[0].id);
      if (pRes.data?.length) setItems([{ productId: pRes.data[0].id, quantity: 5 }]);
    });
  }, [token]);

  function addItem() {
    if (!products.length) return;
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, key: string, val: any) {
    const copy = [...items];
    copy[index] = { ...copy[index], [key]: val };
    setItems(copy);
  }

  const grandTotal = items.reduce((acc, item) => {
    const prod = products.find(p => p.id === item.productId);
    return acc + (prod ? Number(prod.unit_price) * Number(item.quantity) : 0);
  }, 0);

  async function submit(e: any) {
    e.preventDefault();
    if (!items.length) {
      setError('Please add at least one line item');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await request('/challans', token, {
        method: 'POST',
        body: JSON.stringify({ customerId, status, items })
      });
      onSuccess(`Challan ${res.challan_number} created successfully`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card wide">
        <div className="modal-header">
          <h3>Create Sales Delivery Challan</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Select Customer *
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.business_name} ({c.name})</option>
                ))}
              </select>
            </label>
            <label>
              Challan Status *
              <select value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="CONFIRMED">CONFIRMED (Deduct stock immediately)</option>
                <option value="DRAFT">DRAFT (Reserve doc only)</option>
              </select>
            </label>
          </div>

          <h4>Line Items</h4>
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Available</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prod = products.find(p => p.id === it.productId);
                  const isInsufficient = status === 'CONFIRMED' && prod && Number(prod.current_stock) < it.quantity;

                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          value={it.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {prod ? (
                          <span className={isInsufficient ? 'text-danger fw-bold' : ''}>
                            {prod.current_stock} units {isInsufficient && '⚠️ Insufficient'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>₹{prod ? Number(prod.unit_price).toFixed(2) : '0.00'}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          style={{ width: '80px' }}
                        />
                      </td>
                      <td>₹{prod ? (Number(prod.unit_price) * it.quantity).toFixed(2) : '0.00'}</td>
                      <td>
                        <button type="button" className="btn-icon danger" onClick={() => removeItem(idx)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn-secondary" onClick={addItem} style={{ marginTop: '12px' }}>
            <Plus size={15} /> Add Line Item
          </button>

          <div className="challan-summary-box">
            <span>Estimated Total: <b>₹{grandTotal.toFixed(2)}</b> (excl. tax)</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Issue Challan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChallanDetailModal({ challanId, token, user, onClose, onSuccess }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await request(`/challans/${challanId}/invoice`, token);
      setData(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [challanId]);

  async function cancelChallan() {
    if (!confirm('Are you sure you want to cancel this challan? Stock will be atomically restored for confirmed items.')) return;
    setCancelling(true);
    try {
      await request(`/challans/${challanId}/cancel`, token, { method: 'POST' });
      await fetchInvoice();
      onSuccess('Challan cancelled and stock restored');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="modal-backdrop"><div className="modal-card"><p>Loading invoice details...</p></div></div>;

  const ch = data?.challan;
  const items = data?.items || [];
  const fin = data?.financials || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide invoice-modal" onClick={e => e.stopPropagation()}>
        <div className="invoice-actions no-print">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print / Save PDF
          </button>
          {ch.status !== 'CANCELLED' && ['ADMIN', 'SALES'].includes(user.role) && (
            <button className="btn-secondary danger" onClick={cancelChallan} disabled={cancelling}>
              <X size={16} /> {cancelling ? 'Cancelling...' : 'Cancel Challan'}
            </button>
          )}
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="printable-invoice">
          <div className="invoice-header">
            <div>
              <div className="brand">orbit<span>ops</span></div>
              <p>NORTHSTAR DISTRIBUTION PVT LTD</p>
              <small>GSTIN: 29AAACN1029P1Z2 • ISO 9001:2015 Certified</small>
            </div>
            <div className="text-right">
              <h2>DELIVERY CHALLAN</h2>
              <p><b>Challan #:</b> {ch.challan_number}</p>
              <p><b>Date:</b> {new Date(ch.created_at).toLocaleDateString('en-IN')}</p>
              <span className={`badge ${ch.status.toLowerCase()}`}>{ch.status}</span>
            </div>
          </div>

          <hr className="divider" />

          <div className="invoice-addresses">
            <div>
              <small>CONSIGNEE / BILLED TO:</small>
              <h3>{ch.business_name}</h3>
              <p><b>Attn:</b> {ch.customer_name}</p>
              <p>{ch.customer_address || 'Address on file'}</p>
              <p>Phone: {ch.customer_mobile}</p>
              <p>GSTIN: {ch.customer_gst || 'N/A'}</p>
            </div>
            <div>
              <small>DISPATCH DETAILS:</small>
              <p><b>Issued By:</b> {ch.created_by_name || 'System'}</p>
              <p><b>Transport Mode:</b> Surface Express</p>
              <p><b>Total Quantity:</b> {ch.total_quantity} units</p>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>SKU Code</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={it.id || i}>
                  <td>{i + 1}</td>
                  <td><b>{it.product_name}</b></td>
                  <td><code>{it.sku}</code></td>
                  <td>{it.quantity}</td>
                  <td>₹{Number(it.unit_price).toFixed(2)}</td>
                  <td>₹{(Number(it.unit_price) * Number(it.quantity)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-footer">
            <div className="terms">
              <small>Terms & Conditions:</small>
              <p>1. Goods once dispatched against confirmed challan are non-returnable.</p>
              <p>2. Subject to local jurisdiction.</p>
            </div>
            <div className="financial-totals">
              <div>Subtotal: <span>₹{fin.subtotal}</span></div>
              <div>GST (18%): <span>₹{fin.tax}</span></div>
              <div className="grand-total">Grand Total: <span>₹{fin.grandTotal}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
