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

    // 2. Fetch Clients & Users (Engineers) to get IDs
    console.log('Fetching clients...');
    const clientsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/clients',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const engineersRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const client = clientsRes.body[0];
    const engineer = engineersRes.body[0];

    if (!client || !engineer) {
      console.error('Missing client or engineer to create inspection:', { client, engineer });
      return;
    }

    console.log(`Using Client: ${client.name} (ID: ${client.id})`);
    console.log(`Using Engineer: ${engineer.name} (ID: ${engineer.id})`);

    // 3. Attempt to schedule site inspection
    console.log('Attempting to create site inspection...');
    const schedulePayload = JSON.stringify({
      client_id: client.id,
      engineer_id: engineer.id,
      scheduled_date: new Date().toISOString().split('T')[0],
      items: [
        { description: 'Check Fire Safety Extinguishers' },
        { description: 'Check Electrical Wiring Compliance' }
      ]
    });

    const inspectRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/inspections',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(schedulePayload),
        'Authorization': `Bearer ${token}`
      }
    }, schedulePayload);

    console.log('Inspection Creation Status:', inspectRes.statusCode);
    console.log('Inspection Creation Response:', JSON.stringify(inspectRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
