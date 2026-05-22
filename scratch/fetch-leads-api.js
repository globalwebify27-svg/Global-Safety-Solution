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
      console.error('Login failed!');
      return;
    }

    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('API Status Code:', res.statusCode);
    if (Array.isArray(res.body)) {
      console.log(`Total Leads returned by backend API: ${res.body.length}`);
      res.body.slice(0, 3).forEach(lead => {
        console.log(`- Lead ID: ${lead.id}, Company: ${lead.company_name}`);
      });
    } else {
      console.log('Response body:', res.body);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
