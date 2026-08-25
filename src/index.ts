import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// GET: Ambil daftar layanan
app.get('/api/services', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC'
  ).all();
  return c.json(results || []);
});

// POST: Tambah layanan
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

export default app;
