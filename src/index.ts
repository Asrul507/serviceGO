import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Redirect Subdomain Pelanggan
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if ((url.hostname.startsWith('orders-go.') || url.hostname.startsWith('booking.')) && url.pathname === '/') {
    return c.redirect('/booking.html');
  }
  await next();
});

// ==========================================
// 2. ENDPOINT SERVICES (CRUD)
// ==========================================

app.get('/api/services', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC'
  ).all();
  return c.json(results || []);
});

app.post('/api/services', async (c) => {
  const body = await c.req.json();
  const { name, description, base_price, unit } = body;

  if (!name || base_price === undefined) {
    return c.json({ error: 'Nama dan tarif wajib diisi' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO services (name, description, base_price, unit) VALUES (?, ?, ?, ?)'
  )
    .bind(name, description || '', Number(base_price), unit || 'unit')
    .run();

  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

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

app.delete('/api/services/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE services SET is_active = 0 WHERE id = ?')
    .bind(id)
    .run();

  return c.json({ success: true, message: 'Layanan berhasil dihapus' });
});

// ==========================================
// 3. ENDPOINT ORDERS (MULTI-ITEMS CART)
// ==========================================

app.get('/api/orders', async (c) => {
  const query = `
    SELECT 
      orders.id,
      orders.total_price,
      orders.scheduled_date,
      orders.status,
      orders.payment_method,
      orders.payment_status,
      orders.notes,
      orders.created_at,
      customers.name AS customer_name,
      customers.phone AS customer_phone,
      customers.address AS customer_address
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
    ORDER BY orders.id DESC
  `;
  const { results: orders } = await c.env.DB.prepare(query).all();

  // Ambil rincian item layanan untuk setiap pesanan
  const orderList = orders || [];
  for (const ord of orderList) {
    const { results: items } = await c.env.DB.prepare(
      'SELECT service_name, qty, unit_price, subtotal FROM order_items WHERE order_id = ?'
    ).bind(ord.id).all();
    ord.items = items || [];
  }

  return c.json(orderList);
});

app.post('/api/orders', async (c) => {
  const body = await c.req.json();
  const { customer_name, customer_phone, customer_address, items, scheduled_date, payment_method, notes } = body;

  if (!customer_name || !customer_phone || !customer_address || !items || !items.length || !scheduled_date) {
    return c.json({ error: 'Data formulir pesanan belum lengkap atau keranjang kosong' }, 400);
  }

  // 1. Simpan Data Pelanggan
  const custResult = await c.env.DB.prepare(
    'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)'
  )
    .bind(customer_name, customer_phone, customer_address)
    .run();

  const customerId = custResult.meta.last_row_id;

  // 2. Hitung Grand Total dari seluruh item di keranjang
  let grandTotal = 0;
  items.forEach((item: any) => {
    grandTotal += Number(item.price) * Number(item.qty);
  });

  const method = payment_method || 'cash';

  // 3. Simpan Pesanan Utama
  const orderResult = await c.env.DB.prepare(
    `INSERT INTO orders (customer_id, service_id, qty, total_price, scheduled_date, status, payment_method, payment_status, notes)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, 'unpaid', ?)`
  )
    .bind(customerId, items[0].id, items.length, grandTotal, scheduled_date, method, notes || '')
    .run();

  const orderId = orderResult.meta.last_row_id;

  // 4. Simpan Rincian Semua Item Layanan
  for (const itm of items) {
    const subtotal = Number(itm.price) * Number(itm.qty);
    await c.env.DB.prepare(
      `INSERT INTO order_items (order_id, service_id, service_name, qty, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(orderId, itm.id, itm.name, itm.qty, itm.price, subtotal)
      .run();
  }

  return c.json({ success: true, order_id: orderId, total_price: grandTotal, payment_method: method }, 201);
});

app.patch('/api/orders/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status, payment_status } = body;

  await c.env.DB.prepare(
    `UPDATE orders 
     SET status = COALESCE(?, status),
         payment_status = COALESCE(?, payment_status)
     WHERE id = ?`
  )
    .bind(status || null, payment_status || null, id)
    .run();

  return c.json({ success: true, message: 'Status berhasil diperbarui' });
});

export default app;
