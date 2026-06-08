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
      console.error('Login failed, no token returned!');
      return;
    }

    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/clients',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Status Code:', res.statusCode);
    console.log('Response Type:', typeof res.body);
    console.log('Response IsArray:', Array.isArray(res.body));
    console.log('Response Keys:', Object.keys(res.body));
    console.log('Response Preview:', JSON.stringify(res.body, null, 2).substring(0, 1000));

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
