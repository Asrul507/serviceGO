import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  DUITKU_MERCHANT_CODE?: string;
  DUITKU_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================
// PURE JAVASCRIPT MD5 HASH (Kompatibel 100% Cloudflare Workers)
// ============================================================
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(str: string) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWordsTempOne = lMessageLength + 8;
    const lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue: number) {
    let WordToHexValue = '', WordToHexValueTemp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValueTemp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
    }
    return WordToHexValue;
  }

  let x: number[] = [], k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  x = convertToWordArray(string);
  a = 0x67452301; b = 0xefcdab89; c = 0x98badcfe; d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// Redirect Subdomain Pelanggan
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if ((url.hostname.startsWith('orders-go.') || url.hostname.startsWith('booking.')) && url.pathname === '/') {
    return c.redirect('/booking.html');
  }
  await next();
});

// ==========================================
// ENDPOINT SERVICES (CRUD)
// ==========================================

app.get('/api/services', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC'
    ).all();
    return c.json(results || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/services', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, base_price, unit } = body;

    if (!name || base_price === undefined) {
      return c.json({ error: 'Nama dan tarif wajib diisi' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO services (name, description, base_price, unit) VALUES (?, ?, ?, ?)'
    )
      .bind(String(name), String(description || ''), Number(base_price), String(unit || 'unit'))
      .run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/services/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
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
      .bind(
        name ? String(name) : null,
        description ? String(description) : null,
        base_price !== undefined ? Number(base_price) : null,
        unit ? String(unit) : null,
        id
      )
      .run();

    return c.json({ success: true, message: 'Layanan berhasil diupdate' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/services/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    await c.env.DB.prepare('UPDATE services SET is_active = 0 WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true, message: 'Layanan berhasil dihapus' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ENDPOINT ORDERS & DUITKU INTEGRATION
// ==========================================

app.get('/api/orders', async (c) => {
  try {
    const query = `
      SELECT 
        orders.id,
        orders.total_price,
        orders.scheduled_date,
        orders.status,
        COALESCE(orders.payment_method, 'cash') AS payment_method,
        COALESCE(orders.payment_status, 'unpaid') AS payment_status,
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
    const orderList = (orders || []) as any[];

    for (const ord of orderList) {
      try {
        const { results: items } = await c.env.DB.prepare(
          'SELECT service_name, qty, unit_price, subtotal FROM order_items WHERE order_id = ?'
        ).bind(Number(ord.id)).all();
        ord.items = items || [];
      } catch {
        ord.items = [];
      }
    }

    return c.json(orderList);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/orders', async (c) => {
  try {
    const body = await c.req.json();
    const { customer_name, customer_phone, customer_address, items, scheduled_date, payment_method, notes } = body;

    if (!customer_name || !customer_phone || !customer_address || !items || !Array.isArray(items) || items.length === 0 || !scheduled_date) {
      return c.json({ error: 'Formulir belum lengkap atau keranjang kosong' }, 400);
    }

    // 1. Simpan Data Pelanggan
    const custResult = await c.env.DB.prepare(
      'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)'
    )
      .bind(String(customer_name), String(customer_phone), String(customer_address))
      .run();

    const customerId = Number(custResult.meta.last_row_id);

    // 2. Hitung Total
    let grandTotal = 0;
    const validatedItems = items.map((item: any) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      const subtotal = price * qty;
      grandTotal += subtotal;
      return {
        id: Number(item.id),
        name: String(item.name || 'Layanan'),
        price: price,
        qty: qty,
        subtotal: subtotal
      };
    });

    const method = String(payment_method || 'cash');
    const firstServiceId = validatedItems[0].id;

    // 3. Simpan Pesanan Induk
    const orderResult = await c.env.DB.prepare(
      `INSERT INTO orders (customer_id, service_id, qty, total_price, scheduled_date, status, payment_method, payment_status, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, 'unpaid', ?)`
    )
      .bind(
        customerId,
        firstServiceId,
        validatedItems.length,
        grandTotal,
        String(scheduled_date),
        method,
        String(notes || '')
      )
      .run();

    const orderId = Number(orderResult.meta.last_row_id);

    // 4. Simpan Rincian Item
    for (const itm of validatedItems) {
      await c.env.DB.prepare(
        `INSERT INTO order_items (order_id, service_id, service_name, qty, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(orderId, itm.id, itm.name, itm.qty, itm.price, itm.subtotal)
        .run();
    }

    let paymentUrl = null;

    // 5. Request Pembayaran Duitku Sandbox
    if (method === 'duitku') {
      const merchantCode = c.env.DUITKU_MERCHANT_CODE || 'DS34561';
      const apiKey = c.env.DUITKU_API_KEY || '4c8a97765b05ce46465b5598f8bdfbe6';
      const merchantOrderId = `ORDER-${orderId}-${Date.now()}`;
      const paymentAmount = grandTotal;
      
      const signature = md5(`${merchantCode}${merchantOrderId}${paymentAmount}${apiKey}`);

      const duitkuPayload = {
        merchantCode: merchantCode,
        paymentAmount: paymentAmount,
        merchantOrderId: merchantOrderId,
        productDetails: `Pemesanan Layanan #${orderId}`,
        email: 'customer@servicego.id',
        phoneNumber: String(customer_phone),
        additionalParam: String(orderId),
        callbackUrl: 'https://servicego.gpro.my.id/api/duitku/callback',
        returnUrl: 'https://orders-go.gpro.my.id/booking.html',
        signature: signature,
        expiryPeriod: 1440
      };

      try {
        const duitkuRes = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duitkuPayload)
        });

        const duitkuData: any = await duitkuRes.json();
        if (duitkuData && duitkuData.paymentUrl) {
          paymentUrl = duitkuData.paymentUrl;
        } else {
          return c.json({ 
            error: `Duitku Sandbox Response: ${duitkuData.statusMessage || JSON.stringify(duitkuData)}` 
          }, 400);
        }
      } catch (e: any) {
        return c.json({ error: `Koneksi Duitku Gagal: ${e.message}` }, 500);
      }
    }

    return c.json({ 
      success: true, 
      order_id: orderId, 
      total_price: grandTotal, 
      payment_method: method,
      payment_url: paymentUrl
    }, 201);

  } catch (err: any) {
    return c.json({ error: `Database Error: ${err.message}` }, 500);
  }
});

// Endpoint Callback Notifikasi Otomatis
app.post('/api/duitku/callback', async (c) => {
  try {
    const body = await c.req.parseBody();
    const merchantCode = body['merchantCode'] as string;
    const amount = body['amount'] as string;
    const merchantOrderId = body['merchantOrderId'] as string;
    const signature = body['signature'] as string;
    const resultCode = body['resultCode'] as string;
    const additionalParam = body['additionalParam'] as string;

    const apiKey = c.env.DUITKU_API_KEY || '4c8a97765b05ce46465b5598f8bdfbe6';
    const calcSignature = md5(`${merchantCode}${amount}${merchantOrderId}${apiKey}`);

    if (calcSignature === signature && resultCode === '00') {
      const orderId = Number(additionalParam);
      if (orderId) {
        await c.env.DB.prepare(
          "UPDATE orders SET payment_status = 'paid', status = 'in_progress' WHERE id = ?"
        ).bind(orderId).run();
      }
      return c.text('SUCCESS');
    }

    return c.text('BAD SIGNATURE OR FAILED TRANSACTION', 400);
  } catch (err: any) {
    return c.text(`Error: ${err.message}`, 500);
  }
});

// Update Status Manual dari Admin
app.patch('/api/orders/:id/status', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const { status, payment_status } = body;

    await c.env.DB.prepare(
      `UPDATE orders 
       SET status = COALESCE(?, status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`
    )
      .bind(status ? String(status) : null, payment_status ? String(payment_status) : null, id)
      .run();

    return c.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
