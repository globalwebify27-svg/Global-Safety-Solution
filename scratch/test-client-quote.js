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

    console.log('Fetching clients...');
    const clientsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/clients',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const clients = clientsRes.body;
    console.log(`Found ${clients.length} clients.`);
    const kiran = clients.find(c => c.name.toLowerCase().includes('kiran'));
    if (!kiran) {
      console.log('Kiran Enterprises not found in client list! Here are first 3 clients:', clients.slice(0, 3));
      return;
    }

    console.log('Found Kiran Enterprises:', kiran.id, kiran.name);

    // Replicate the exact payload from the screenshot
    const quotationPayload = JSON.stringify({
      lead_id: undefined,
      client_id: kiran.id,
      notes: 'urgent needed',
      apply_gst: false,
      discount: 50000,
      items: [
        {
          description: 'shos',
          quantity: 100,
          unit_price: 5000
        }
      ]
    });

    console.log('Sending POST to generate client quotation...');
    const quoteRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/quotations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(quotationPayload),
        'Authorization': `Bearer ${token}`
      }
    }, quotationPayload);

    console.log('Response Status Code:', quoteRes.statusCode);
    console.log('Response Body:', JSON.stringify(quoteRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
