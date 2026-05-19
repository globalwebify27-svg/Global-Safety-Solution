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
      console.error('No token found');
      return;
    }

    console.log('Fetching all users...');
    const usersRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Users found:', usersRes.body.length);
    usersRes.body.forEach(u => {
      console.log(`- ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Designation: ${u.designation} | Department: ${u.department}`);
    });

  } catch (err) {
    console.error(err);
  }
}

run();
