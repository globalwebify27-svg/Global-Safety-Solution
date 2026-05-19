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

    // 2. Fetch Leads to find one
    console.log('Fetching leads...');
    const fetchRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/leads',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (fetchRes.statusCode !== 200 || !Array.isArray(fetchRes.body)) {
      console.error('Failed to fetch leads:', fetchRes.body);
      return;
    }

    const testLead = fetchRes.body.find(l => l.email);
    if (!testLead) {
      console.error('No leads with emails found. Please capture a lead first.');
      return;
    }

    console.log(`Found Lead: ${testLead.contact_person} <${testLead.email}> (ID: ${testLead.id})`);

    // 3. Send Email to Lead
    console.log('Attempting to trigger send email...');
    const emailPayload = JSON.stringify({
      subject: 'Regarding safety compliance solutions',
      message: 'Hello, we are following up on your request!'
    });

    const emailRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/leads/${testLead.id}/email`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailPayload),
        'Authorization': `Bearer ${token}`
      }
    }, emailPayload);

    console.log('Email Endpoint Status:', emailRes.statusCode);
    console.log('Email Endpoint Response:', JSON.stringify(emailRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
