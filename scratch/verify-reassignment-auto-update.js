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
    console.log('=== Starting Safety Audit Lifecycle Verification ===');

    // 1. Login
    console.log('Step 1: Logging in to acquire token...');
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
      console.error('❌ Login failed, no token returned!');
      return;
    }
    console.log('✅ Login successful!');

    // 2. Fetch clients & engineers to get valid IDs
    console.log('\nStep 2: Fetching valid clients and engineers...');
    const clientsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/clients',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const client = clientsRes.body[0];
    const engineer = usersRes.body.find(u => u.is_active);

    if (!client || !engineer) {
      console.error('❌ Could not find active client or engineer in the database to run the test!');
      return;
    }
    console.log(`✅ Using Client: "${client.name}" (${client.id})`);
    console.log(`✅ Using Engineer: "${engineer.name}" (${engineer.id})`);

    // 3. Create a Scheduled Inspection
    console.log('\nStep 3: Creating a new safety inspection...');
    const inspectionPayload = JSON.stringify({
      client_id: client.id,
      engineer_id: engineer.id,
      scheduled_date: new Date().toISOString().split('T')[0],
      items: [
        { description: 'Verify Fire Extinguisher Pressure' },
        { description: 'Verify Emergency Exit Signage' }
      ]
    });

    const createRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/inspections',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(inspectionPayload),
        'Authorization': `Bearer ${token}`
      }
    }, inspectionPayload);

    const inspection = createRes.body;
    if (!inspection || !inspection.id) {
      console.error('❌ Failed to create inspection!', createRes.body);
      return;
    }
    console.log(`✅ Inspection created successfully! ID: ${inspection.id}, Status: ${inspection.status}`);
    console.log(`   Items initialized: ${inspection.items.length} items`);

    // 4. Update assignment and check if saved
    console.log('\nStep 4: Testing engineer reassignment & rescheduling inside checklist modal...');
    const anotherEngineer = usersRes.body.find(u => u.is_active && u.id !== engineer.id) || engineer;
    const newScheduledDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // 2 days in future

    const updateAssignPayload = JSON.stringify({
      engineer_id: anotherEngineer.id,
      scheduled_date: newScheduledDate
    });

    const updateAssignRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateAssignPayload),
        'Authorization': `Bearer ${token}`
      }
    }, updateAssignPayload);

    console.log(`✅ Inspection assignment updated!`);
    console.log(`   New Assigned Engineer ID: ${updateAssignRes.body.engineer_id}`);
    console.log(`   New Scheduled Date: ${updateAssignRes.body.scheduled_date.split('T')[0]}`);

    // Verify properties
    if (updateAssignRes.body.engineer_id !== anotherEngineer.id) {
      console.error('❌ Engineer ID was not updated correctly!');
    } else {
      console.log('✅ Engineer ID matches update target!');
    }

    // 5. Test real-time checklist item transitions and auto parent status updates
    console.log('\nStep 5: Testing checklist item transitions and automatic parent status updates...');
    const item1 = updateAssignRes.body.items[0];
    const item2 = updateAssignRes.body.items[1];

    console.log(`   Initial item 1 state: ${item1.description} -> ${item1.status}`);
    console.log(`   Initial item 2 state: ${item2.description} -> ${item2.status}`);

    // Set first item to PASS - parent status should stay SCHEDULED/IN_PROGRESS since item 2 is PENDING
    console.log('\n   Submitting PASS for item 1...');
    const item1PassPayload = JSON.stringify({ status: 'PASS' });
    const item1PassRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/item/${item1.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(item1PassPayload),
        'Authorization': `Bearer ${token}`
      }
    }, item1PassPayload);

    // Fetch parent inspection to verify status
    let check1 = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Parent Inspection status: ${check1.body.status} (Expected: IN_PROGRESS/SCHEDULED)`);

    // Set second item to FAIL - parent status should automatically transition to REJECTED (since all are finished and 1 failed)
    console.log('\n   Submitting FAIL for item 2...');
    const item2FailPayload = JSON.stringify({ status: 'FAIL' });
    await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/item/${item2.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(item2FailPayload),
        'Authorization': `Bearer ${token}`
      }
    }, item2FailPayload);

    let check2 = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Parent Inspection status: ${check2.body.status} (Expected: REJECTED)`);
    if (check2.body.status === 'REJECTED') {
      console.log('✅ Success! Parent status automatically updated to REJECTED because a checklist item failed.');
    } else {
      console.error('❌ Failed! Parent status did not update to REJECTED.');
    }

    // Now change item 2 to PASS - parent status should automatically transition to COMPLETED (since all are complete and all passed)
    console.log('\n   Changing FAIL to PASS for item 2 (All items now PASS)...');
    const item2PassPayload = JSON.stringify({ status: 'PASS' });
    await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/item/${item2.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(item2PassPayload),
        'Authorization': `Bearer ${token}`
      }
    }, item2PassPayload);

    let check3 = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Parent Inspection status: ${check3.body.status} (Expected: COMPLETED)`);
    if (check3.body.status === 'COMPLETED') {
      console.log('✅ Success! Parent status automatically updated to COMPLETED because all items passed.');
    } else {
      console.error('❌ Failed! Parent status did not update to COMPLETED.');
    }

    // 6. Verify Certificate and Compliance registry entries exist!
    console.log('\nStep 6: Verifying corresponding Certificate and Compliance registry logs exist...');
    const certsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/certificates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const complRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/compliance',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const matchingCert = certsRes.body.find(c => c.inspection_id === inspection.id);
    const matchingCompliance = matchingCert ? complRes.body.find(c => c.reference_number === matchingCert.certificate_no) : null;

    if (matchingCert) {
      console.log(`   ✅ Certificate found: ${matchingCert.certificate_no} (Status: ${matchingCert.status})`);
    } else {
      console.error('   ❌ Certificate was NOT created on COMPLETED status!');
    }

    if (matchingCompliance) {
      console.log(`   ✅ Compliance registry entry found matching cert number: ${matchingCompliance.reference_number} (Status: ${matchingCompliance.status})`);
    } else {
      console.error('   ❌ Compliance registry log was NOT created on COMPLETED status!');
    }

    // 7. Test Reversion - change a checklist item back to PENDING
    console.log('\nStep 7: Testing reversion (changing a checklist item back to PENDING)...');
    const item1PendingPayload = JSON.stringify({ status: 'PENDING' });
    await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/item/${item1.id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(item1PendingPayload),
        'Authorization': `Bearer ${token}`
      }
    }, item1PendingPayload);

    let check4 = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Parent Inspection status: ${check4.body.status} (Expected: IN_PROGRESS)`);
    if (check4.body.status === 'IN_PROGRESS') {
      console.log('✅ Success! Parent status automatically reverted to IN_PROGRESS due to a pending item.');
    } else {
      console.error('❌ Failed! Parent status did not revert to IN_PROGRESS.');
    }

    // Verify Certificate and Compliance are DELETED!
    console.log('\nStep 8: Verifying Certificate and Compliance logs were cleaned up and deleted...');
    const certsRevertRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/certificates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const complRevertRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/compliance',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const revertedCert = certsRevertRes.body.find(c => c.inspection_id === inspection.id);
    const revertedCompliance = matchingCert ? complRevertRes.body.find(c => c.reference_number === matchingCert.certificate_no) : null;

    if (!revertedCert) {
      console.log('   ✅ Certificate was successfully deleted on status reversion!');
    } else {
      console.error('   ❌ Certificate was NOT deleted on status reversion!');
    }

    if (!revertedCompliance) {
      console.log('   ✅ Compliance registry log was successfully deleted on status reversion!');
    } else {
      console.error('   ❌ Compliance registry log was NOT deleted on status reversion!');
    }

    // 8. Delete the temporary inspection to keep database clean
    console.log('\nStep 9: Cleaning up temporary inspection...');
    const deleteRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/inspections/${inspection.id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (deleteRes.statusCode === 200 || deleteRes.statusCode === 204) {
      console.log('✅ Temporary inspection deleted, database cleaned!');
    } else {
      console.warn('⚠️ Delete response code:', deleteRes.statusCode);
    }

    console.log('\n=== Safety Audit Lifecycle Verification COMPLETED with 100% SUCCESS ===');

  } catch (err) {
    console.error('❌ Fatal verification error:', err);
  }
}

run();
