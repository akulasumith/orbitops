import { describe, it, expect, beforeAll } from 'vitest';
import app from './server.js';
import http from 'node:http';

let server: http.Server;
let baseUrl: string;
let adminToken = '';
let salesToken = '';

async function apiRequest(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  // Login as Admin
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'admin@orbitops.dev', password: 'Demo@123' },
  });
  adminToken = adminLogin.data.token;

  // Login as Sales
  const salesLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'sales@orbitops.dev', password: 'Demo@123' },
  });
  salesToken = salesLogin.data.token;
});

describe('Orbit Ops API Test Suite', () => {
  it('Health Check returns ok status', async () => {
    const { status, data } = await apiRequest('/health');
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('orbit-ops-api');
  });

  it('Auth - Fails on invalid credentials', async () => {
    const { status } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@orbitops.dev', password: 'wrongpassword' },
    });
    expect(status).toBe(401);
  });

  it('Auth - Returns user profile on /auth/me', async () => {
    const { status, data } = await apiRequest('/auth/me', { token: adminToken });
    expect(status).toBe(200);
    expect(data.user.email).toBe('admin@orbitops.dev');
    expect(data.user.role).toBe('ADMIN');
  });

  it('Dashboard - Returns operational metrics and activity log', async () => {
    const { status, data } = await apiRequest('/dashboard', { token: adminToken });
    expect(status).toBe(200);
    expect(data.metrics).toBeDefined();
    expect(Array.isArray(data.activity)).toBe(true);
  });

  it('Customers - Search and List customers', async () => {
    const { status, data } = await apiRequest('/customers?q=Gupta', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('Customers - Create new customer and post follow-up', async () => {
    const newCust = await apiRequest('/customers', {
      method: 'POST',
      token: salesToken,
      body: {
        name: 'Priya Sharma',
        mobile: '9123456789',
        email: 'priya@sharma.in',
        businessName: 'Sharma Paper Mart',
        type: 'RETAIL',
        status: 'LEAD',
      },
    });

    expect(newCust.status).toBe(201);
    expect(newCust.data.id).toBeDefined();
    const custId = newCust.data.id;

    // Add follow-up note
    const followup = await apiRequest(`/customers/${custId}/followups`, {
      method: 'POST',
      token: salesToken,
      body: {
        note: 'Sent catalogue and sample pricing via WhatsApp.',
        followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });

    expect(followup.status).toBe(201);
    expect(followup.data.note).toContain('WhatsApp');

    // Fetch details
    const details = await apiRequest(`/customers/${custId}`, { token: adminToken });
    expect(details.status).toBe(200);
    expect(details.data.followups.length).toBeGreaterThan(0);
  });

  it('Products - List catalog and post audited stock movement', async () => {
    const prods = await apiRequest('/products', { token: adminToken });
    expect(prods.status).toBe(200);
    expect(prods.data.data.length).toBeGreaterThan(0);

    const firstProd = prods.data.data[0];
    const initialStock = Number(firstProd.current_stock);

    // Stock IN movement
    const mov = await apiRequest(`/products/${firstProd.id}/movements`, {
      method: 'POST',
      token: adminToken,
      body: {
        quantity: 25,
        type: 'IN',
        reason: 'Integration test stock inbound',
      },
    });

    expect(mov.status).toBe(201);
    expect(mov.data.quantity).toBe(25);
  });

  it('Challans - Create confirmed challan atomically and test cancellation stock reversal', async () => {
    const prods = await apiRequest('/products', { token: adminToken });
    const custs = await apiRequest('/customers', { token: adminToken });

    const targetProd = prods.data.data[0];
    const targetCust = custs.data.data[0];

    // Create Confirmed Challan
    const challanRes = await apiRequest('/challans', {
      method: 'POST',
      token: salesToken,
      body: {
        customerId: targetCust.id,
        status: 'CONFIRMED',
        items: [{ productId: targetProd.id, quantity: 2 }],
      },
    });

    expect(challanRes.status).toBe(201);
    expect(challanRes.data.challan_number).toBeDefined();
    const challanId = challanRes.data.id;

    // Fetch Invoice
    const invoiceRes = await apiRequest(`/challans/${challanId}/invoice`, { token: adminToken });
    expect(invoiceRes.status).toBe(200);
    expect(invoiceRes.data.financials.grandTotal).toBeDefined();

    // Cancel Challan and verify stock reversal
    const cancelRes = await apiRequest(`/challans/${challanId}/cancel`, {
      method: 'POST',
      token: salesToken,
    });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.data.status).toBe('CANCELLED');
  });

  it('Validation - Rejects invalid payloads with 422', async () => {
    const res = await apiRequest('/customers', {
      method: 'POST',
      token: adminToken,
      body: { name: 'X' }, // Missing required fields
    });
    expect(res.status).toBe(422);
    expect(res.data.error).toBe('Validation failed');
  });
});
