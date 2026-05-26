const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@globalsafety.com', password: 'superadmin123' })
    });
    const { access_token } = await res.json();
    
    const clientRes = await fetch('http://localhost:3001/clients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        name: 'Test Client 123',
        email: 'test@example.com',
        state: 'Maharashtra',
        contacts: [
          { name: 'John Doe', designation: 'CEO' }
        ]
      })
    });
    const data = await clientRes.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
test();
