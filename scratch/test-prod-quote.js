const https = require('https');

const loginPayload = JSON.stringify({
  email: 'admin@globalsafety.com',
  password: 'superadmin123'
});

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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
    console.log('Logging in to PRODUCTION...');
    const loginRes = await request({
      hostname: 'global-safety-solution.onrender.com',
      port: 443,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, loginPayload);

    const token = loginRes.body.access_token;
    if (!token) {
      console.error('No token found in login response!', loginRes.body);
      return;
    }
    console.log('Successfully authenticated on production!');

    console.log('Fetching active quotations from production to check structure...');
    const listRes = await request({
      hostname: 'global-safety-solution.onrender.com',
      port: 443,
      path: '/quotations',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Production Response Status Code:', listRes.statusCode);
    if (listRes.statusCode === 200 && Array.isArray(listRes.body)) {
      console.log('Active quotations found in production:', listRes.body.length);
      const firstQuote = listRes.body[0];
      if (firstQuote) {
        console.log('Quotation schema check (discount exists?):', 'discount' in firstQuote ? '✅ YES' : '❌ NO');
        console.log('Sample Quotation:', {
          quote_number: firstQuote.quote_number,
          subtotal: firstQuote.subtotal,
          discount: firstQuote.discount,
          total_amount: firstQuote.total_amount
        });
      } else {
        console.log('No quotations exist yet on production to inspect.');
      }
    } else {
      console.log('Production response error:', listRes.body);
    }

  } catch (err) {
    console.error('Error running test on production:', err);
  }
}

run();
