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

    // Find a DRAFT/SENT quotation to convert
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const quotation = await prisma.quotation.findFirst({
      where: {
        status: { in: ['DRAFT', 'SENT'] }
      }
    });
    await prisma.$disconnect();

    if (!quotation) {
      console.log('No DRAFT or SENT quotation found to convert.');
      return;
    }

    console.log(`Found quotation to convert: ${quotation.quote_number} (ID: ${quotation.id})`);

    // Send POST to convert it
    console.log('Sending POST to convert quotation...');
    const convertRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/quotations/${quotation.id}/convert`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response Status Code:', convertRes.statusCode);
    console.log('Response Body:', JSON.stringify(convertRes.body, null, 2));

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
