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

    console.log('Login Response Status:', loginRes.statusCode);
    const token = loginRes.body.access_token;
    if (!token) {
      console.error('No token found in login response:', loginRes.body);
      return;
    }

    // 2. Capture Lead
    console.log('Attempting to create lead...');
    const leadPayload = JSON.stringify({
      company_name: 'Test Acme Corp',
      contact_person: 'John Lead',
      email: 'john@acme.com',
      phone: '+91 98765 43210',
      source: 'Website',
      notes: 'Test lead creation notes',
      closure_probability: 50,
      next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    const leadRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(leadPayload),
        'Authorization': `Bearer ${token}`
      }
    }, leadPayload);

    console.log('Lead Creation Status:', leadRes.statusCode);
    console.log('Lead Creation Body:', JSON.stringify(leadRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
