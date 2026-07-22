import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

let realPool: Pool | null = null;
let useFallback = false;

// In-Memory Database Store for Zero-Config Standalone / Offline mode
const memoryDb = {
  users: [] as any[],
  customers: [] as any[],
  customer_followups: [] as any[],
  products: [] as any[],
  stock_movements: [] as any[],
  challans: [] as any[],
  challan_items: [] as any[],
};

// Seed initial memory DB
async function initMemoryDb() {
  const pwd = await bcrypt.hash('Demo@123', 10);
  
  const users = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Aarav Mehta', email: 'admin@orbitops.dev', password_hash: pwd, role: 'ADMIN', created_at: new Date().toISOString() },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Isha Shah', email: 'sales@orbitops.dev', password_hash: pwd, role: 'SALES', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Kabir Rao', email: 'warehouse@orbitops.dev', password_hash: pwd, role: 'WAREHOUSE', created_at: new Date().toISOString() },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Mira Nair', email: 'accounts@orbitops.dev', password_hash: pwd, role: 'ACCOUNTS', created_at: new Date().toISOString() },
  ];
  memoryDb.users = users;

  const today = new Date().toISOString().split('T')[0];
  const next3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const customers = [
    { id: 'a1111111-1111-1111-1111-111111111111', name: 'Rohan Gupta', mobile: '9876543210', email: 'rohan@gupta.in', business_name: 'Gupta Retail Mart', gst_number: '29ABCDE1234F1Z5', type: 'RETAIL', address: 'Indiranagar, Bengaluru', status: 'LEAD', follow_up_date: today, notes: 'Interested in August replenishment', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'a2222222-2222-2222-2222-222222222222', name: 'Anika Kapoor', mobile: '9988776655', email: 'anika@kapoor.in', business_name: 'Kapoor Distributors', gst_number: '27XYZAB5678G2Z1', type: 'DISTRIBUTOR', address: 'Andheri East, Mumbai', status: 'ACTIVE', follow_up_date: next3Days, notes: 'Priority distributor account', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'a3333333-3333-3333-3333-333333333333', name: 'Vikram Joshi', mobile: '9765432109', email: 'vikram@joshi.co', business_name: 'Apex Wholesale', gst_number: '07AAACA9876H1Z9', type: 'WHOLESALE', address: 'Connaught Place, New Delhi', status: 'ACTIVE', follow_up_date: null, notes: 'Quarterly bulk buyer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  memoryDb.customers = customers;

  const products = [
    { id: 'b1111111-1111-1111-1111-111111111111', name: 'Premium A4 Paper (80 GSM)', sku: 'PAP-A4-80', category: 'Office Supplies', unit_price: '365.00', current_stock: 12, min_stock: 20, location: 'Bengaluru A-12', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'b2222222-2222-2222-2222-222222222222', name: 'Thermal Printer Roll 80mm', sku: 'TPR-80', category: 'Consumables', unit_price: '52.00', current_stock: 86, min_stock: 25, location: 'Bengaluru B-04', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'b3333333-3333-3333-3333-333333333333', name: 'Heavy Duty Shipping Tape', sku: 'TAPE-48', category: 'Packaging', unit_price: '38.00', current_stock: 200, min_stock: 50, location: 'Mumbai C-09', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'b4444444-4444-4444-4444-444444444444', name: 'Barcode Scanner Wireless', sku: 'BCS-W10', category: 'Hardware', unit_price: '2490.00', current_stock: 15, min_stock: 5, location: 'Bengaluru D-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  memoryDb.products = products;

  const movements = [
    { id: crypto.randomUUID(), product_id: products[0].id, quantity: 100, type: 'IN', reason: 'Initial inventory import', created_by: users[0].id, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: crypto.randomUUID(), product_id: products[1].id, quantity: 100, type: 'IN', reason: 'Supplier delivery batch #402', created_by: users[2].id, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: crypto.randomUUID(), product_id: products[0].id, quantity: 88, type: 'OUT', reason: 'Dispatched order SC-2026-10492', created_by: users[1].id, created_at: new Date().toISOString() },
  ];
  memoryDb.stock_movements = movements;

  const challanId = crypto.randomUUID();
  const challan = {
    id: challanId,
    challan_number: 'SC-2026-10492',
    customer_id: customers[1].id,
    status: 'CONFIRMED',
    total_quantity: 88,
    created_by: users[1].id,
    created_at: new Date().toISOString(),
  };
  memoryDb.challans = [challan];

  memoryDb.challan_items = [
    {
      id: crypto.randomUUID(),
      challan_id: challanId,
      product_id: products[0].id,
      product_name: products[0].name,
      sku: products[0].sku,
      unit_price: '365.00',
      quantity: 88,
    }
  ];

  memoryDb.customer_followups = [
    {
      id: crypto.randomUUID(),
      customer_id: customers[0].id,
      note: 'Initial inquiry call completed. Customer requested sample pricing for 500 units of A4 paper.',
      follow_up_date: today,
      created_by: users[1].id,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    }
  ];
}

initMemoryDb();

// Execute in-memory query simulator
async function executeMemoryQuery(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  const sql = text.trim();
  const cleanSql = sql.replace(/\s+/g, ' ');

  // USERS
  if (/SELECT .* FROM users WHERE email=\$1/i.test(cleanSql)) {
    const email = String(params[0] || '').toLowerCase();
    const found = memoryDb.users.filter(u => u.email.toLowerCase() === email);
    return { rows: found };
  }

  // DASHBOARD METRICS
  if (/active_customers.*low_stock.*dispatched_today/i.test(cleanSql)) {
    const todayStr = new Date().toISOString().split('T')[0];
    const active_customers = memoryDb.customers.filter(c => c.status === 'ACTIVE').length;
    const low_stock = memoryDb.products.filter(p => Number(p.current_stock) <= Number(p.min_stock)).length;
    const dispatched_today = memoryDb.challans.filter(c => c.status === 'CONFIRMED' && String(c.created_at).startsWith(todayStr)).length;
    const due_followups = memoryDb.customers.filter(c => c.status === 'LEAD' && c.follow_up_date && c.follow_up_date <= todayStr).length;

    return {
      rows: [{
        active_customers: String(active_customers),
        low_stock: String(low_stock),
        dispatched_today: String(dispatched_today),
        due_followups: String(due_followups),
      }]
    };
  }

  if (/SELECT sm\.created_at.*FROM stock_movements sm/i.test(cleanSql)) {
    const list = memoryDb.stock_movements.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
    const rows = list.map(sm => {
      const prod = memoryDb.products.find(p => p.id === sm.product_id);
      return { ...sm, product_name: prod ? prod.name : 'Unknown Product' };
    });
    return { rows };
  }

  // CUSTOMERS LIST
  if (/SELECT \*, count\(\*\) over\(\) total FROM customers/i.test(cleanSql)) {
    const q = String(params[0] || '').replace(/%/g, '').toLowerCase();
    const limit = Number(params[1]) || 20;
    const offset = Number(params[2]) || 0;
    let filtered = memoryDb.customers.filter(c => 
      !q || c.name.toLowerCase().includes(q) || c.business_name.toLowerCase().includes(q) || c.mobile.includes(q)
    );
    filtered.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit).map(c => ({ ...c, total: String(total) }));
    return { rows: paged };
  }

  // CREATE CUSTOMER
  if (/INSERT INTO customers/i.test(cleanSql)) {
    const newCust = {
      id: crypto.randomUUID(),
      name: params[0],
      mobile: params[1],
      email: params[2] || null,
      business_name: params[3],
      gst_number: params[4] || null,
      type: params[5],
      address: params[6] || null,
      status: params[7] || 'LEAD',
      follow_up_date: params[8] || null,
      notes: params[9] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.customers.unshift(newCust);
    return { rows: [newCust] };
  }

  // GET SINGLE CUSTOMER
  if (/SELECT \* FROM customers WHERE id=\$1/i.test(cleanSql)) {
    const cust = memoryDb.customers.find(c => c.id === params[0]);
    return { rows: cust ? [cust] : [] };
  }

  // UPDATE CUSTOMER
  if (/UPDATE customers SET/i.test(cleanSql)) {
    const id = params[params.length - 1];
    const cust = memoryDb.customers.find(c => c.id === id);
    if (!cust) return { rows: [] };

    if (/follow_up_date=COALESCE\(\$1,follow_up_date\)/i.test(cleanSql)) {
      if (params[0]) cust.follow_up_date = params[0];
      cust.updated_at = new Date().toISOString();
      return { rows: [cust] };
    }

    // Generic update matching fields
    const sets = cleanSql.match(/SET (.*) WHERE/i)?.[1]?.split(',') || [];
    sets.forEach((setStr, idx) => {
      const col = setStr.split('=')[0].trim();
      if (col !== 'updated_at') {
        cust[col] = params[idx] ?? null;
      }
    });
    cust.updated_at = new Date().toISOString();
    return { rows: [cust] };
  }

  // DELETE CUSTOMER
  if (/DELETE FROM customers WHERE id=\$1/i.test(cleanSql)) {
    const idx = memoryDb.customers.findIndex(c => c.id === params[0]);
    if (idx !== -1) {
      const deleted = memoryDb.customers.splice(idx, 1);
      return { rows: deleted };
    }
    return { rows: [] };
  }

  // CUSTOMER FOLLOWUPS LIST
  if (/SELECT f\.\*,u\.name created_by_name FROM customer_followups f/i.test(cleanSql)) {
    const custId = params[0];
    const list = memoryDb.customer_followups.filter(f => f.customer_id === custId);
    list.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const rows = list.map(f => {
      const usr = memoryDb.users.find(u => u.id === f.created_by);
      return { ...f, created_by_name: usr ? usr.name : 'System' };
    });
    return { rows };
  }

  // INSERT CUSTOMER FOLLOWUP
  if (/INSERT INTO customer_followups/i.test(cleanSql)) {
    const fup = {
      id: crypto.randomUUID(),
      customer_id: params[0],
      note: params[1],
      follow_up_date: params[2] || null,
      created_by: params[3],
      created_at: new Date().toISOString(),
    };
    memoryDb.customer_followups.unshift(fup);
    return { rows: [fup] };
  }

  // PRODUCTS LIST
  if (/SELECT \*, count\(\*\) over\(\) total FROM products/i.test(cleanSql)) {
    const limit = Number(params[0]) || 20;
    const offset = Number(params[1]) || 0;
    let list = memoryDb.products.slice().sort((a,b) => a.name.localeCompare(b.name));
    const total = list.length;
    const paged = list.slice(offset, offset + limit).map(p => ({ ...p, total: String(total) }));
    return { rows: paged };
  }

  // INSERT PRODUCT
  if (/INSERT INTO products/i.test(cleanSql)) {
    // Check SKU duplicate
    if (memoryDb.products.some(p => p.sku.toLowerCase() === String(params[1]).toLowerCase())) {
      const err: any = new Error('Product SKU already exists');
      err.code = '23505';
      throw err;
    }
    const newProd = {
      id: crypto.randomUUID(),
      name: params[0],
      sku: params[1],
      category: params[2],
      unit_price: String(params[3]),
      current_stock: Number(params[4]),
      min_stock: Number(params[5]),
      location: params[6],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.products.push(newProd);
    return { rows: [newProd] };
  }

  // SINGLE PRODUCT
  if (/SELECT \* FROM products WHERE id=\$1/i.test(cleanSql)) {
    const prod = memoryDb.products.find(p => p.id === params[0]);
    return { rows: prod ? [prod] : [] };
  }

  // UPDATE PRODUCT STOCK or GENERAL PRODUCT UPDATE
  if (/UPDATE products SET/i.test(cleanSql)) {
    const id = params[params.length - 1];
    const prod = memoryDb.products.find(p => p.id === id);
    if (!prod) return { rows: [] };

    if (/current_stock=current_stock-\$1/i.test(cleanSql)) {
      prod.current_stock -= Number(params[0]);
      prod.updated_at = new Date().toISOString();
      return { rows: [prod] };
    }
    if (/current_stock=current_stock\+\$1/i.test(cleanSql)) {
      prod.current_stock += Number(params[0]);
      prod.updated_at = new Date().toISOString();
      return { rows: [prod] };
    }
    if (/current_stock=\$1/i.test(cleanSql)) {
      prod.current_stock = Number(params[0]);
      prod.updated_at = new Date().toISOString();
      return { rows: [prod] };
    }

    // Specific field updates
    if (params.length >= 6) {
      prod.name = params[0];
      prod.category = params[1];
      prod.unit_price = String(params[2]);
      prod.min_stock = Number(params[3]);
      prod.location = params[4];
      prod.updated_at = new Date().toISOString();
    }
    return { rows: [prod] };
  }

  // DELETE PRODUCT
  if (/DELETE FROM products WHERE id=\$1/i.test(cleanSql)) {
    const idx = memoryDb.products.findIndex(p => p.id === params[0]);
    if (idx !== -1) {
      const deleted = memoryDb.products.splice(idx, 1);
      return { rows: deleted };
    }
    return { rows: [] };
  }

  // INSERT STOCK MOVEMENT
  if (/INSERT INTO stock_movements/i.test(cleanSql)) {
    const mov = {
      id: crypto.randomUUID(),
      product_id: params[0],
      quantity: Number(params[1]),
      type: params[2],
      reason: params[3],
      created_by: params[4],
      created_at: new Date().toISOString(),
    };
    memoryDb.stock_movements.unshift(mov);
    return { rows: [mov] };
  }

  // STOCK MOVEMENTS LIST
  if (/SELECT sm\.\*,p\.name product_name/i.test(cleanSql)) {
    const list = memoryDb.stock_movements.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);
    const rows = list.map(sm => {
      const p = memoryDb.products.find(x => x.id === sm.product_id);
      const u = memoryDb.users.find(x => x.id === sm.created_by);
      return {
        ...sm,
        product_name: p ? p.name : 'Unknown Product',
        sku: p ? p.sku : '—',
        created_by_name: u ? u.name : 'System',
      };
    });
    return { rows };
  }

  // CHALLANS LIST
  if (/SELECT ch\.\*,c\.business_name/i.test(cleanSql)) {
    const list = memoryDb.challans.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const rows = list.map(ch => {
      const c = memoryDb.customers.find(x => x.id === ch.customer_id);
      const u = memoryDb.users.find(x => x.id === ch.created_by);
      return {
        ...ch,
        business_name: c ? c.business_name : 'Unknown',
        customer_name: c ? c.name : 'Unknown',
        created_by_name: u ? u.name : 'System',
      };
    });
    return { rows };
  }

  // SINGLE CHALLAN WITH CUSTOMER META
  if (/SELECT ch\.\*, c\.name customer_name/i.test(cleanSql) || /FROM challans ch WHERE ch\.id=\$1/i.test(cleanSql)) {
    const ch = memoryDb.challans.find(x => x.id === params[0]);
    if (!ch) return { rows: [] };
    const c = memoryDb.customers.find(x => x.id === ch.customer_id);
    const u = memoryDb.users.find(x => x.id === ch.created_by);
    return {
      rows: [{
        ...ch,
        customer_name: c ? c.name : 'Unknown',
        business_name: c ? c.business_name : 'Unknown',
        customer_mobile: c ? c.mobile : '',
        customer_email: c ? c.email : '',
        customer_address: c ? c.address : '',
        customer_gst: c ? c.gst_number : '',
        created_by_name: u ? u.name : 'System',
      }]
    };
  }

  // CHALLAN ITEMS FOR A CHALLAN
  if (/SELECT ci\.\* FROM challan_items/i.test(cleanSql) || /FROM challan_items WHERE challan_id=\$1/i.test(cleanSql)) {
    const items = memoryDb.challan_items.filter(ci => ci.challan_id === params[0]);
    return { rows: items };
  }

  // SINGLE CHALLAN RECORD
  if (/SELECT \* FROM challans WHERE id=\$1/i.test(cleanSql)) {
    const ch = memoryDb.challans.find(x => x.id === params[0]);
    return { rows: ch ? [ch] : [] };
  }

  // UPDATE CHALLAN STATUS
  if (/UPDATE challans SET status=/i.test(cleanSql)) {
    const id = params[params.length - 1];
    const ch = memoryDb.challans.find(x => x.id === id);
    if (ch) {
      if (params.length > 1) {
        ch.status = params[0];
      } else {
        const match = cleanSql.match(/status='([^']+)'/i);
        if (match) ch.status = match[1];
      }
    }
    return { rows: ch ? [ch] : [] };
  }

  // INSERT CHALLAN
  if (/INSERT INTO challans/i.test(cleanSql)) {
    const ch = {
      id: crypto.randomUUID(),
      challan_number: params[0],
      customer_id: params[1],
      status: params[2],
      total_quantity: Number(params[3]),
      created_by: params[4],
      created_at: new Date().toISOString(),
    };
    memoryDb.challans.unshift(ch);
    return { rows: [ch] };
  }

  // INSERT CHALLAN ITEM
  if (/INSERT INTO challan_items/i.test(cleanSql)) {
    const item = {
      id: crypto.randomUUID(),
      challan_id: params[0],
      product_id: params[1],
      product_name: params[2],
      sku: params[3],
      unit_price: String(params[4]),
      quantity: Number(params[5]),
    };
    memoryDb.challan_items.push(item);
    return { rows: [item] };
  }

  return { rows: [] };
}

// Database client abstraction supporting both pg and fallback
export const db = {
  query: async (text: string, params: any[] = []): Promise<{ rows: any[] }> => {
    if (useFallback) {
      return executeMemoryQuery(text, params);
    }

    if (!realPool && process.env.DATABASE_URL) {
      try {
        realPool = new Pool({ connectionString: process.env.DATABASE_URL });
      } catch {
        useFallback = true;
        console.log('[DB] Switching to zero-config in-memory database engine.');
        return executeMemoryQuery(text, params);
      }
    }

    if (realPool) {
      try {
        return await realPool.query(text, params);
      } catch (err: any) {
        // If Postgres fails due to connection refuse, switch to fallback
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect ECONNREFUSED')) {
          useFallback = true;
          console.log('[DB] PostgreSQL unavailable. Operating in zero-config in-memory mode.');
          return executeMemoryQuery(text, params);
        }
        throw err;
      }
    }

    useFallback = true;
    return executeMemoryQuery(text, params);
  },
  end: async () => {
    if (realPool) await realPool.end();
  }
};

export async function transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  if (useFallback || !process.env.DATABASE_URL) {
    const mockClient = {
      query: (text: string, params: any[]) => executeMemoryQuery(text, params)
    };
    return fn(mockClient);
  }

  if (!realPool) {
    try {
      realPool = new Pool({ connectionString: process.env.DATABASE_URL });
    } catch {
      useFallback = true;
      const mockClient = {
        query: (text: string, params: any[]) => executeMemoryQuery(text, params)
      };
      return fn(mockClient);
    }
  }

  try {
    const c = await realPool.connect();
    try {
      await c.query('BEGIN');
      const result = await fn(c);
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect ECONNREFUSED')) {
      useFallback = true;
      console.log('[DB] PostgreSQL transaction unavailable. Executing in zero-config in-memory transaction mode.');
      const mockClient = {
        query: (text: string, params: any[]) => executeMemoryQuery(text, params)
      };
      return fn(mockClient);
    }
    throw err;
  }
}
