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

const endpoints = [
  { name: 'Auth Module Login', path: '/auth/login', method: 'POST', body: loginPayload },
  { name: 'Users Module', path: '/users' },
  { name: 'Clients Module', path: '/clients' },
  { name: 'Leads Module', path: '/leads' },
  { name: 'Quotations Module', path: '/quotations' },
  { name: 'Inspections Module', path: '/inspections' },
  { name: 'Certificates Module', path: '/certificates' },
  { name: 'Attendance Module', path: '/attendance/all' },
  { name: 'Compliance Module', path: '/compliance' },
  { name: 'HR Module (Payroll)', path: '/hr/payroll' },
  { name: 'Invoices Module', path: '/invoices' },
  { name: 'Payments Module', path: '/payments' },
  { name: 'Expenses Module', path: '/expenses' },
  { name: 'Vendors Module', path: '/vendors' },
  { name: 'Work Orders Module', path: '/work-orders' },
  { name: 'Projects Module', path: '/projects' },
  { name: 'Tasks Module', path: '/tasks' },
  { name: 'Inventory Module', path: '/inventory' },
  { name: 'Assets Module', path: '/assets' },
  { name: 'Documents Module', path: '/documents' },
  { name: 'Service Products Module', path: '/service-products' },
  { name: 'Dashboard Stats', path: '/dashboard/stats' }
];

async function run() {
  try {
    console.log('Logging in to acquire access token...');
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
    console.log('Login successful! Testing module endpoints...\n');

    for (const ep of endpoints) {
      if (ep.method === 'POST') continue; // Already tested login

      const options = {
        hostname: 'localhost',
        port: 3001,
        path: ep.path,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      };

      try {
        const res = await request(options);
        const isOk = res.statusCode >= 200 && res.statusCode < 300;
        const statusText = isOk ? '✅ SUCCESS' : `❌ FAILED (Status: ${res.statusCode})`;
        
        console.log(`[${ep.name}] GET ${ep.path} -> ${statusText}`);
        if (!isOk) {
          console.log(`   Response: ${JSON.stringify(res.body).substring(0, 150)}`);
        }
      } catch (err) {
        console.log(`[${ep.name}] GET ${ep.path} -> ❌ ERROR: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Fatal testing error:', err);
  }
}

run();
