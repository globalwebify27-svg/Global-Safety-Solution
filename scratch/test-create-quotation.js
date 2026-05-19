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
    // 1. Login
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
      console.error('No token found in login response:', loginRes.body);
      return;
    }

    // Lead ID from screenshot URL: 81ef9aee-ee17-48c8-ab68-0e79e738065a
    const leadId = '81ef9aee-ee17-48c8-ab68-0e79e738065a';

    const quotationPayload = JSON.stringify({
      lead_id: leadId,
      client_id: '',
      notes: '',
      items: [
        {
          description: 'xkbx',
          quantity: 12,
          unit_price: 8270822
        }
      ]
    });

    console.log('Sending POST to generate quotation...');
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
