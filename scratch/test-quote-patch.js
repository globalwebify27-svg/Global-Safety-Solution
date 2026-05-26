const http = require('http');

const loginPayload = JSON.stringify({
  email: 'admin@globalsafety.com',
  password: 'superadmin123'
});

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, loginPayload);

    const token = loginRes.body.access_token;
    if (!token) {
      console.error('No token found in login response!', loginRes.body);
      return;
    }

    console.log('Fetching existing quotations...');
    const listRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/quotations',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const quotes = listRes.body;
    if (!quotes || quotes.length === 0) {
      console.log('No quotations found to edit.');
      return;
    }

    const testQuote = quotes[0];
    console.log(`Paching quotation ${testQuote.quote_number} (ID: ${testQuote.id})...`);

    // Let's modify the discount and add an item
    const patchPayload = JSON.stringify({
      lead_id: testQuote.lead_id || undefined,
      client_id: testQuote.client_id || undefined,
      notes: 'updated notes through patch test',
      apply_gst: true,
      discount: 75000,
      items: [
        {
          description: 'shos upgraded',
          quantity: 120,
          unit_price: 5500
        },
        {
          description: 'extra services',
          quantity: 1,
          unit_price: 15000
        }
      ]
    });

    const patchRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/quotations/${testQuote.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(patchPayload),
        'Authorization': `Bearer ${token}`
      }
    }, patchPayload);

    console.log('Response Status Code:', patchRes.statusCode);
    console.log('Response Body:', JSON.stringify(patchRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
