const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\n🔐 Step 1: Login...');
  const loginRes = await request({
    hostname: 'localhost', port: 3001, path: '/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@globalsafety.com', password: 'superadmin123' }));

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('❌ Login failed:', loginRes);
    return;
  }
  const token = loginRes.body.access_token;
  console.log('✅ Login OK');

  // Get a client
  console.log('\n📋 Step 2: Fetching clients...');
  const clientsRes = await request({
    hostname: 'localhost', port: 3001, path: '/clients', method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const clients = clientsRes.body;
  if (!Array.isArray(clients) || clients.length === 0) {
    console.error('❌ No clients found');
    return;
  }
  const client = clients[0];
  console.log(`✅ Using client: ${client.name}`);

  // Test 1: Create invoice with manual invoice_number, date, po_number, po_date
  console.log('\n📄 Step 3: Creating invoice with manual no, date, PO fields...');
  const manualInvNo = `TEST-INV-${Date.now()}`;
  const createRes = await request({
    hostname: 'localhost', port: 3001, path: '/invoices', method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, JSON.stringify({
    client_id: client.id,
    invoice_number: manualInvNo,
    date: new Date('2026-05-01').toISOString(),
    due_date: new Date('2026-06-01').toISOString(),
    po_number: 'PO-2026-TEST-001',
    po_date: new Date('2026-04-28').toISOString(),
    notes: 'Test PO Invoice',
    items: [{ description: 'Safety Audit Service', quantity: 2, unit_price: 5000, total: 10000 }]
  }));

  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('❌ Invoice creation failed:', JSON.stringify(createRes.body, null, 2));
    return;
  }
  const inv = createRes.body;
  console.log(`✅ Invoice created!`);
  console.log(`   Invoice No : ${inv.invoice_number} (expected: ${manualInvNo}) ${inv.invoice_number === manualInvNo ? '✅' : '❌ MISMATCH'}`);
  console.log(`   PO Number  : ${inv.po_number} ${inv.po_number === 'PO-2026-TEST-001' ? '✅' : '❌ MISMATCH'}`);
  console.log(`   PO Date    : ${inv.po_date ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Date       : ${inv.date ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Total      : ₹${Number(inv.total_amount).toLocaleString()}`);

  // Test 2: Fetch the invoice back and verify po fields persist
  console.log('\n🔍 Step 4: Fetching invoice list to confirm PO data persists...');
  const listRes = await request({
    hostname: 'localhost', port: 3001, path: '/invoices', method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const found = listRes.body.find(i => i.invoice_number === manualInvNo);
  if (!found) {
    console.error('❌ Invoice not found in list');
  } else {
    console.log(`✅ Invoice found in list`);
    console.log(`   po_number  : ${found.po_number || '(empty)'} ${found.po_number ? '✅' : '❌ Missing'}`);
    console.log(`   po_date    : ${found.po_date || '(empty)'} ${found.po_date ? '✅' : '❌ Missing'}`);
  }

  // Test 3: PATCH (modify) invoice with new PO info
  console.log('\n✏️  Step 5: Updating invoice PO details via PATCH...');
  const patchRes = await request({
    hostname: 'localhost', port: 3001, path: `/invoices/${inv.id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, JSON.stringify({
    po_number: 'PO-2026-UPDATED-999',
    po_date: new Date('2026-05-15').toISOString(),
    date: new Date('2026-05-10').toISOString(),
    due_date: new Date('2026-06-15').toISOString()
  }));

  if (patchRes.status === 200 || patchRes.status === 201) {
    console.log(`✅ PATCH succeeded`);
    console.log(`   po_number  : ${patchRes.body.po_number || '(empty)'} ${patchRes.body.po_number === 'PO-2026-UPDATED-999' ? '✅' : '❌'}`);
  } else {
    console.error('❌ PATCH failed:', JSON.stringify(patchRes.body, null, 2));
  }

  // Cleanup: delete the test invoice
  console.log('\n🗑️  Step 6: Cleaning up test invoice...');
  const delRes = await request({
    hostname: 'localhost', port: 3001, path: `/invoices/${inv.id}`, method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(delRes.status === 200 || delRes.status === 204 ? '✅ Test invoice deleted' : `⚠️  Delete status: ${delRes.status}`);

  console.log('\n🎉 All tests complete!\n');
}

run().catch(console.error);
