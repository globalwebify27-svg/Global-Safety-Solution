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

    // Fetch clients and users
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

    // Create a new inspection
    const schedulePayload = JSON.stringify({
      client_id: client.id,
      engineer_id: engineer.id,
      scheduled_date: new Date().toISOString().split('T')[0],
      items: [
        { description: 'Check Fire Safety Extinguishers' }
      ]
    });

    console.log('Creating a new inspection...');
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

    const newInspection = inspectRes.body;
    console.log('Created Inspection ID:', newInspection.id);

    // Send PATCH to complete it
    const patchPayload = JSON.stringify({
      status: 'COMPLETED',
      completed_date: new Date().toISOString(),
      lat: 12.34567,
      lng: 78.91011,
      remarks: 'Verification Photos: ["http://localhost:3001/public/OTHER/test.png"]'
    });

    console.log('Sending PATCH request to complete the newly created inspection...');
    const patchRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${newInspection.id}`,
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
