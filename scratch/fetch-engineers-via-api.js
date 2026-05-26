const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@globalsafety.com',
  password: 'superadmin123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const auth = JSON.parse(body);
      const token = auth.access_token || auth.token;
      if (!token) {
        console.log("No token in response:", body);
        return;
      }
      
      const reqUsers = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/users',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (resUsers) => {
        let usersBody = '';
        resUsers.on('data', (chunk) => usersBody += chunk);
        resUsers.on('end', () => {
          try {
            const users = JSON.parse(usersBody);
            console.log("FOUND USERS:", JSON.stringify(users.slice(0, 10), null, 2));
          } catch (e) {
            console.log("Failed to parse users:", usersBody);
          }
        });
      });
      reqUsers.end();
    } catch (e) {
      console.log("Failed to parse login:", body);
    }
  });
});

req.on('error', (e) => console.error(e));
req.write(loginData);
req.end();
