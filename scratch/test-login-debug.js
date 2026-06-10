const http = require('http');

function testLogin(email, password) {
  const payload = JSON.stringify({ email, password });
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Email: ${email}, Password: ${password}`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    });
    req.on('error', (err) => {
      console.log(`Error connecting for ${email}:`, err.message);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("Testing with superadmin123...");
  await testLogin('admin@globalsafety.com', 'superadmin123');
  console.log("\nTesting with Staff@123...");
  await testLogin('admin@globalsafety.com', 'Staff@123');
}

run();
