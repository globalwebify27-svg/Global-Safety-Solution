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

    const leadId = '28a1788c-0bf2-49b4-911b-1a39ae3d5514';

    console.log('Sending POST to generate quick quotation...');
    const quoteRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/quotations/lead/${leadId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response Status Code:', quoteRes.statusCode);
    console.log('Response Body:', JSON.stringify(quoteRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
