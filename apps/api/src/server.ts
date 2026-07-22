import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, transaction } from './db.js';
import { allow, AuthRequest, requireAuth, signToken } from './auth.js';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json());

const asyncRoute = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
const page = (query: any) => ({ limit: Math.min(Number(query.limit) || 20, 100), offset: ((Number(query.page) || 1) - 1) * (Number(query.limit) || 20) });

app.get('/', (_req, res) => res.json({ name: 'Orbit Ops API', status: 'online', health: '/health', version: '1.0.0' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'orbit-ops-api', time: new Date().toISOString() }));

app.post('/auth/login', asyncRoute(async (req: any, res: any) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const { rows } = await db.query('SELECT id,name,email,password_hash,role FROM users WHERE email=$1', [input.email.toLowerCase()]);
  const user = rows[0];
  if (!user || !await bcrypt.compare(input.password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get('/auth/me', requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));

app.get('/dashboard', requireAuth, asyncRoute(async (_req: any, res: any) => {
  const { rows } = await db.query("SELECT (SELECT count(*) FROM customers WHERE status='ACTIVE') active_customers, (SELECT count(*) FROM products WHERE current_stock <= min_stock) low_stock, (SELECT count(*) FROM challans WHERE status='CONFIRMED' AND created_at::date=current_date) dispatched_today, (SELECT count(*) FROM customers WHERE follow_up_date <= current_date AND status='LEAD') due_followups");
  const activity = await db.query("SELECT sm.created_at,sm.type,sm.quantity,sm.reason,p.name product_name FROM stock_movements sm JOIN products p ON p.id=sm.product_id ORDER BY sm.created_at DESC LIMIT 6");
  res.json({ metrics: rows[0], activity: activity.rows });
}));

const customerInput = z.object({
  name: z.string().min(2),
  mobile: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().min(2),
  gstNumber: z.string().optional(),
  type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional()
});

app.get('/customers', requireAuth, asyncRoute(async (req: any, res: any) => {
  const { limit, offset } = page(req.query);
  const q = String(req.query.q || '');
  const r = await db.query("SELECT *, count(*) over() total FROM customers WHERE name ILIKE $1 OR business_name ILIKE $1 OR mobile ILIKE $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3", [`%${q}%`, limit, offset]);
  res.json({ data: r.rows, pagination: { total: Number(r.rows[0]?.total || 0), limit, offset } });
}));

app.post('/customers', requireAuth, allow('ADMIN', 'SALES'), asyncRoute(async (req: any, res: any) => {
  const x = customerInput.parse(req.body);
  const r = await db.query('INSERT INTO customers(name,mobile,email,business_name,gst_number,type,address,status,follow_up_date,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [x.name, x.mobile, x.email || null, x.businessName, x.gstNumber || null, x.type, x.address || null, x.status, x.followUpDate || null, x.notes || null]);
  res.status(201).json(r.rows[0]);
}));

app.get('/customers/:id', requireAuth, asyncRoute(async (req: any, res: any) => {
  const c = await db.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
  if (!c.rows[0]) return res.status(404).json({ error: 'Customer not found' });
  const f = await db.query('SELECT f.*,u.name created_by_name FROM customer_followups f LEFT JOIN users u ON u.id=f.created_by WHERE customer_id=$1 ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...c.rows[0], followups: f.rows });
}));

app.patch('/customers/:id', requireAuth, allow('ADMIN', 'SALES'), asyncRoute(async (req: any, res: any) => {
  const x = customerInput.partial().parse(req.body);
  const map: any = { businessName: 'business_name', gstNumber: 'gst_number', followUpDate: 'follow_up_date' };
  const entries = Object.entries(x);
  if (!entries.length) return res.status(400).json({ error: 'No changes supplied' });
  const sets = entries.map(([k], i) => `${map[k] || k}=$${i + 1}`);
  const values = entries.map(([, v]) => v || null);
  const r = await db.query(`UPDATE customers SET ${sets.join(',')},updated_at=now() WHERE id=$${values.length + 1} RETURNING *`, [...values, req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Customer not found' });
  res.json(r.rows[0]);
}));

app.delete('/customers/:id', requireAuth, allow('ADMIN'), asyncRoute(async (req: any, res: any) => {
  const r = await db.query('DELETE FROM customers WHERE id=$1 RETURNING *', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Customer not found' });
  res.json({ message: 'Customer deleted successfully', customer: r.rows[0] });
}));

app.post('/customers/:id/followups', requireAuth, allow('ADMIN', 'SALES'), asyncRoute(async (req: AuthRequest, res: any) => {
  const x = z.object({ note: z.string().min(2), followUpDate: z.string().optional() }).parse(req.body);
  const r = await db.query('INSERT INTO customer_followups(customer_id,note,follow_up_date,created_by) VALUES($1,$2,$3,$4) RETURNING *', [req.params.id, x.note, x.followUpDate || null, req.user!.id]);
  await db.query('UPDATE customers SET follow_up_date=COALESCE($1,follow_up_date),updated_at=now() WHERE id=$2', [x.followUpDate || null, req.params.id]);
  res.status(201).json(r.rows[0]);
}));

const productInput = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative(),
  minStock: z.coerce.number().int().nonnegative(),
  location: z.string().min(2)
});

app.get('/products', requireAuth, asyncRoute(async (req: any, res: any) => {
  const { limit, offset } = page(req.query);
  const r = await db.query('SELECT *, count(*) over() total FROM products ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
  res.json({ data: r.rows, pagination: { total: Number(r.rows[0]?.total || 0), limit, offset } });
}));

app.post('/products', requireAuth, allow('ADMIN', 'WAREHOUSE'), asyncRoute(async (req: any, res: any) => {
  const x = productInput.parse(req.body);
  const r = await db.query('INSERT INTO products(name,sku,category,unit_price,current_stock,min_stock,location) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [x.name, x.sku, x.category, x.unitPrice, x.currentStock, x.minStock, x.location]);
  res.status(201).json(r.rows[0]);
}));

app.patch('/products/:id', requireAuth, allow('ADMIN', 'WAREHOUSE'), asyncRoute(async (req: any, res: any) => {
  const x = productInput.partial().parse(req.body);
  const r = await db.query('UPDATE products SET name=COALESCE($1,name), category=COALESCE($2,category), unit_price=COALESCE($3,unit_price), min_stock=COALESCE($4,min_stock), location=COALESCE($5,location), updated_at=now() WHERE id=$6 RETURNING *', [x.name || null, x.category || null, x.unitPrice ?? null, x.minStock ?? null, x.location || null, req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json(r.rows[0]);
}));

app.delete('/products/:id', requireAuth, allow('ADMIN'), asyncRoute(async (req: any, res: any) => {
  const r = await db.query('DELETE FROM products WHERE id=$1 RETURNING *', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted successfully', product: r.rows[0] });
}));

app.post('/products/:id/movements', requireAuth, allow('ADMIN', 'WAREHOUSE'), asyncRoute(async (req: AuthRequest, res: any) => {
  const x = z.object({ quantity: z.coerce.number().int().positive(), type: z.enum(['IN', 'OUT']), reason: z.string().min(2) }).parse(req.body);
  const r = await transaction(async c => {
    const p = await c.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!p.rows[0]) throw Object.assign(new Error('Product not found'), { status: 404 });
    const stock = Number(p.rows[0].current_stock) + (x.type === 'IN' ? x.quantity : -x.quantity);
    if (stock < 0) throw Object.assign(new Error('Insufficient stock for this movement'), { status: 409 });
    await c.query('UPDATE products SET current_stock=$1,updated_at=now() WHERE id=$2', [stock, req.params.id]);
    return c.query('INSERT INTO stock_movements(product_id,quantity,type,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.params.id, x.quantity, x.type, x.reason, req.user!.id]);
  });
  res.status(201).json(r.rows[0]);
}));

app.get('/stock-movements', requireAuth, asyncRoute(async (_req: any, res: any) => {
  const r = await db.query('SELECT sm.*,p.name product_name,p.sku,u.name created_by_name FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN users u ON u.id=sm.created_by ORDER BY sm.created_at DESC LIMIT 100');
  res.json({ data: r.rows });
}));

const challanInput = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive() })).min(1),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT')
});

app.get('/challans', requireAuth, asyncRoute(async (_req: any, res: any) => {
  const r = await db.query('SELECT ch.*,c.business_name,c.name customer_name,u.name created_by_name FROM challans ch JOIN customers c ON c.id=ch.customer_id LEFT JOIN users u ON u.id=ch.created_by ORDER BY ch.created_at DESC');
  res.json({ data: r.rows });
}));

app.get('/challans/:id', requireAuth, asyncRoute(async (req: any, res: any) => {
  const ch = await db.query('SELECT ch.*, c.name customer_name, c.business_name, c.mobile customer_mobile, c.email customer_email, c.address customer_address, c.gst_number customer_gst, u.name created_by_name FROM challans ch JOIN customers c ON c.id=ch.customer_id LEFT JOIN users u ON u.id=ch.created_by WHERE ch.id=$1', [req.params.id]);
  if (!ch.rows[0]) return res.status(404).json({ error: 'Challan not found' });
  const items = await db.query('SELECT ci.* FROM challan_items ci WHERE ci.challan_id=$1', [req.params.id]);
  res.json({ ...ch.rows[0], items: items.rows });
}));

app.post('/challans', requireAuth, allow('ADMIN', 'SALES'), asyncRoute(async (req: AuthRequest, res: any) => {
  const x = challanInput.parse(req.body);
  const result = await transaction(async c => {
    const no = `SC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const ch = (await c.query('INSERT INTO challans(challan_number,customer_id,status,total_quantity,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [no, x.customerId, x.status, x.items.reduce((a, i) => a + i.quantity, 0), req.user!.id])).rows[0];
    for (const i of x.items) {
      const p = (await c.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [i.productId])).rows[0];
      if (!p) throw Object.assign(new Error('A selected product no longer exists'), { status: 404 });
      if (x.status === 'CONFIRMED' && Number(p.current_stock) < i.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${p.name}`), { status: 409 });
      }
      await c.query('INSERT INTO challan_items(challan_id,product_id,product_name,sku,unit_price,quantity) VALUES($1,$2,$3,$4,$5,$6)', [ch.id, p.id, p.name, p.sku, p.unit_price, i.quantity]);
      if (x.status === 'CONFIRMED') {
        await c.query('UPDATE products SET current_stock=current_stock-$1,updated_at=now() WHERE id=$2', [i.quantity, p.id]);
        await c.query("INSERT INTO stock_movements(product_id,quantity,type,reason,created_by) VALUES($1,$2,'OUT',$3,$4)", [p.id, i.quantity, `Confirmed challan ${no}`, req.user!.id]);
      }
    }
    return ch;
  });
  res.status(201).json(result);
}));

app.post('/challans/:id/cancel', requireAuth, allow('ADMIN', 'SALES'), asyncRoute(async (req: AuthRequest, res: any) => {
  const result = await transaction(async c => {
    const ch = (await c.query('SELECT * FROM challans WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!ch) throw Object.assign(new Error('Challan not found'), { status: 404 });
    if (ch.status === 'CANCELLED') throw Object.assign(new Error('Challan is already cancelled'), { status: 400 });

    const items = (await c.query('SELECT * FROM challan_items WHERE challan_id=$1', [req.params.id])).rows;
    if (ch.status === 'CONFIRMED') {
      for (const item of items) {
        await c.query('UPDATE products SET current_stock=current_stock+$1,updated_at=now() WHERE id=$2', [item.quantity, item.product_id]);
        await c.query("INSERT INTO stock_movements(product_id,quantity,type,reason,created_by) VALUES($1,$2,'IN',$3,$4)", [item.product_id, item.quantity, `Cancelled challan ${ch.challan_number}`, req.user!.id]);
      }
    }
    const updated = (await c.query("UPDATE challans SET status='CANCELLED' WHERE id=$1 RETURNING *", [req.params.id])).rows[0];
    return updated;
  });
  res.json(result);
}));

app.get('/challans/:id/invoice', requireAuth, asyncRoute(async (req: any, res: any) => {
  const ch = (await db.query('SELECT ch.*, c.name customer_name, c.business_name, c.mobile customer_mobile, c.email customer_email, c.address customer_address, c.gst_number customer_gst, u.name created_by_name FROM challans ch JOIN customers c ON c.id=ch.customer_id LEFT JOIN users u ON u.id=ch.created_by WHERE ch.id=$1', [req.params.id])).rows[0];
  if (!ch) return res.status(404).json({ error: 'Challan not found' });
  const items = (await db.query('SELECT ci.* FROM challan_items ci WHERE ci.challan_id=$1', [req.params.id])).rows;

  const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.unit_price) * Number(item.quantity)), 0);
  const gstTax = subtotal * 0.18;
  const grandTotal = subtotal + gstTax;

  res.json({
    challan: ch,
    items,
    financials: {
      subtotal: subtotal.toFixed(2),
      tax: gstTax.toFixed(2),
      taxRate: '18% GST',
      grandTotal: grandTotal.toFixed(2),
    }
  });
}));

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof z.ZodError) return res.status(422).json({ error: 'Validation failed', details: err.flatten() });
  if (err.code === '23505') return res.status(409).json({ error: 'A record with that unique value already exists' });
  res.status(err.status || 500).json({ error: err.message || 'Unexpected server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(process.env.PORT) || 4000, () => console.log('Orbit Ops API running on port ' + (process.env.PORT || 4000)));
}

export default app;
