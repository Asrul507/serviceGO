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

    // 2. Hitung Grand Total
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

    // 3. Simpan Pesanan Induk ke Tabel orders
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

    // 4. Simpan Rincian Item Satu per Satu
    for (const itm of validatedItems) {
      await c.env.DB.prepare(
        `INSERT INTO order_items (order_id, service_id, service_name, qty, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(orderId, itm.id, itm.name, itm.qty, itm.price, itm.subtotal)
        .run();
    }

    return c.json({ 
      success: true, 
      order_id: orderId, 
      total_price: grandTotal, 
      payment_method: method 
    }, 201);

  } catch (err: any) {
    return c.json({ error: `Database Error: ${err.message}` }, 500);
  }
});
