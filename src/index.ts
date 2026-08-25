import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Redirect otomatis subdomain pelanggan ke booking.html
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  
  // Jika diakses melalui subdomain orders-go dan membuka halaman utama "/"
  if (url.hostname.startsWith('orders-go.') && url.pathname === '/') {
    return c.redirect('/booking.html');
  }
  
  await next();
});

// ==========================================
// 2. ENDPOINT LAYANAN (SERVICES)
// ==========================================

// GET: Ambil semua layanan aktif
app.get('/api/services', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC'
  ).all();
  return c.json(results || []);
});

// POST: Tambah layanan baru
app.post('/api/services', async (c) => {
  const body = await c.req.json();
  const { name, description, base_price, unit } = body;

  if (!name || base_price === undefined) {
    return c.json({ error: 'Nama dan harga wajib diisi' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO services (name, description, base_price, unit) VALUES (?, ?, ?, ?)'
  )
    .bind(name, description || '', Number(base_price), unit || 'unit')
    .run();

  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

// PUT: Edit layanan
app.put('/api/services/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, description, base_price, unit } = body;

  await c.env.DB.prepare(
    `UPDATE services 
     SET name = COALESCE(?, name), 
         description = COALESCE(?, description), 
         base_price = COALESCE(?, base_price), 
         unit = COALESCE(?, unit),
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`
  )
    .bind(name, description, base_price !== undefined ? Number(base_price) : null, unit, id)
    .run();

  return c.json({ success: true, message: 'Layanan berhasil diupdate' });
});

// DELETE: Hapus layanan
app.delete('/api/services/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE services SET is_active = 0 WHERE id = ?')
    .bind(id)
    .run();

  return c.json({ success: true, message: 'Layanan berhasil dihapus' });
});

// ==========================================
// 3. ENDPOINT PESANAN / BOOKING (ORDERS)
// ==========================================

// GET: Ambil daftar seluruh booking
app.get('/api/orders', async (c) => {
  const query = `
    SELECT 
      orders.id,
      orders.qty,
      orders.total_price,
      orders.scheduled_date,
      orders.status,
      orders.notes,
      orders.created_at,
      customers.name AS customer_name,
      customers.phone AS customer_phone,
      customers.address AS customer_address,
      services.name AS service_name,
      services.unit AS service_unit
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
    JOIN services ON orders.service_id = services.id
    ORDER BY orders.id DESC
  `;
  const { results } = await c.env.DB.prepare(query).all();
  return c.json(results || []);
});

// POST: Buat pesanan baru
app.post('/api/orders', async (c) => {
  const body = await c.req.json();
  const { customer_name, customer_phone, customer_address, service_id, qty, scheduled_date, notes } = body;

  if (!customer_name || !customer_phone || !customer_address || !service_id || !scheduled_date) {
    return c.json({ error: 'Data formulir pesanan belum lengkap' }, 400);
  }

  const custResult = await c.env.DB.prepare(
    'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)'
  )
    .bind(customer_name, customer_phone, customer_address)
    .run();

  const customerId = custResult.meta.last_row_id;

  const service = await c.env.DB.prepare('SELECT base_price FROM services WHERE id = ?')
    .bind(service_id)
    .first<{ base_price: number }>();

  const unitPrice = service ? service.base_price : 0;
  const quantity = Number(qty) || 1;
  const totalPrice = unitPrice * quantity;

  const orderResult = await c.env.DB.prepare(
    `INSERT INTO orders (customer_id, service_id, qty, total_price, scheduled_date, status, notes)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  )
    .bind(customerId, service_id, quantity, totalPrice, scheduled_date, notes || '')
    .run();

  return c.json({ success: true, order_id: orderResult.meta.last_row_id }, 201);
});

// PATCH: Update status pesanan
app.patch('/api/orders/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status } = body;

  await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .bind(status, id)
    .run();

  return c.json({ success: true, message: 'Status pesanan berhasil diperbarui' });
});

export default app;
