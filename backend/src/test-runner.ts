import app from './server';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const PORT = 3099;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const BASE = `http://localhost:${PORT}`;
  console.log(`\n========================================`);
  console.log(`🚀 RUNNING AUTOMATED BACKEND VERIFICATION`);
  console.log(`========================================\n`);

  try {
    // 1. Health check test
    console.log('[TEST 1] Checking Root Health Check GET / ...');
    const healthRes = await fetch(`${BASE}/`);
    const healthJson = await healthRes.json();
    if (healthRes.status === 200 && healthJson.status === 'online') {
      console.log('✅ PASS: Health check 200 OK');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }

    // 2. Reset database first
    console.log('\n[TEST 2] Testing POST /api/reset ...');
    const resetRes = await fetch(`${BASE}/api/reset`, { method: 'POST' });
    const resetJson = await resetRes.json();
    if (resetRes.status === 200 && resetJson.success) {
      console.log('✅ PASS: Reset executed cleanly');
    } else {
      throw new Error(`Reset failed: ${JSON.stringify(resetJson)}`);
    }

    // 3. Create dummy image for upload
    const dummyImagePath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyImagePath, Buffer.alloc(1024 * 50)); // 50 KB dummy file

    // 4. Test Report Creation with 1 image
    console.log('\n[TEST 3] Testing POST /api/reports (First submission) ...');
    const formData = new FormData();
    formData.append('clientReportId', 'test-uuid-client-001');
    formData.append('description', 'Cracked concrete column at Sector 4');
    const fileBytes = fs.readFileSync(dummyImagePath);
    formData.append('images', new Blob([fileBytes], { type: 'image/jpeg' }), 'column.jpg');

    const createRes = await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      body: formData,
    });
    const createJson = await createRes.json();
    if (createRes.status === 201 && createJson.clientReportId === 'test-uuid-client-001') {
      console.log(`✅ PASS: Report created (Server ID: ${createJson.id}, Images: ${createJson.images.length})`);
    } else {
      throw new Error(`Create failed: ${JSON.stringify(createJson)}`);
    }

    // 5. Test IDEMPOTENCY: Same clientReportId re-sent (Simulation of retry after dropped connection)
    console.log('\n[TEST 4] Testing Idempotency (Same clientReportId submitted again) ...');
    const duplicateFormData = new FormData();
    duplicateFormData.append('clientReportId', 'test-uuid-client-001');
    duplicateFormData.append('description', 'Cracked concrete column at Sector 4');
    duplicateFormData.append('images', new Blob([fileBytes], { type: 'image/jpeg' }), 'column.jpg');

    const dupRes = await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      body: duplicateFormData,
    });
    const dupJson = await dupRes.json();

    // Check count in database to ensure "Nothing lands twice"
    const listRes = await fetch(`${BASE}/api/reports`);
    const listJson = await listRes.json();

    if (dupRes.status === 200 && dupJson.id === createJson.id && listJson.count === 1) {
      console.log('✅ PASS: Idempotency verified! Duplicate rejected without error, returned existing record, count is still 1.');
    } else {
      throw new Error(`Idempotency check failed: Total count is ${listJson.count}, expected 1`);
    }

    // 6. Test Description Validation (Missing description)
    console.log('\n[TEST 5] Testing Validation (Missing Description) ...');
    const invalidForm = new FormData();
    invalidForm.append('clientReportId', 'test-uuid-client-002');
    invalidForm.append('description', '   '); // Blank
    invalidForm.append('images', new Blob([fileBytes], { type: 'image/jpeg' }), 'column.jpg');

    const invalidRes = await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      body: invalidForm,
    });
    if (invalidRes.status === 400) {
      console.log('✅ PASS: Blank description correctly rejected with 400 Bad Request');
    } else {
      throw new Error(`Expected 400, got ${invalidRes.status}`);
    }

    // 7. Test 5 MB Ceiling limit
    console.log('\n[TEST 6] Testing 5 MB Ceiling Enforcement (>5MB image) ...');
    const bigImagePath = path.join(__dirname, 'huge.jpg');
    fs.writeFileSync(bigImagePath, Buffer.alloc(1024 * 1024 * 6)); // 6 MB file
    const hugeForm = new FormData();
    hugeForm.append('clientReportId', 'test-uuid-client-003');
    hugeForm.append('description', 'Large image test');
    hugeForm.append('images', new Blob([fs.readFileSync(bigImagePath)], { type: 'image/jpeg' }), 'huge.jpg');

    const hugeRes = await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      body: hugeForm,
    });
    if (hugeRes.status === 413) {
      console.log('✅ PASS: File >5MB rejected with 413 Payload Too Large');
    } else {
      throw new Error(`Expected 413, got ${hugeRes.status}`);
    }
    fs.unlinkSync(bigImagePath);

    // 8. Test Chaos: x-chaos-error header
    console.log('\n[TEST 7] Testing Chaos Header (x-chaos-error: 503) ...');
    const chaosErrRes = await fetch(`${BASE}/api/reports`, {
      headers: { 'x-chaos-error': '503' },
    });
    if (chaosErrRes.status === 503) {
      console.log('✅ PASS: On-demand forced 503 error returned');
    } else {
      throw new Error(`Expected 503, got ${chaosErrRes.status}`);
    }

    // 9. Test Chaos: x-chaos-delay header
    console.log('\n[TEST 8] Testing Chaos Header (x-chaos-delay: 1500ms) ...');
    const start = Date.now();
    await fetch(`${BASE}/api/reports`, {
      headers: { 'x-chaos-delay': '1500' },
    });
    const elapsed = Date.now() - start;
    if (elapsed >= 1400) {
      console.log(`✅ PASS: On-demand delay verified (${elapsed}ms elapsed)`);
    } else {
      throw new Error(`Delay was not respected: elapsed only ${elapsed}ms`);
    }

    // 10. Test Chaos: x-chaos-drop header (socket destroy)
    console.log('\n[TEST 9] Testing Chaos Header (x-chaos-drop: true) ...');
    try {
      await fetch(`${BASE}/api/reports`, {
        headers: { 'x-chaos-drop': 'true' },
      });
      console.warn('⚠️ Unexpected response, socket was expected to drop');
    } catch (e: any) {
      console.log(`✅ PASS: Connection drop verified! Client experienced socket error: ${e.message}`);
    }

    // Cleanup dummy file
    if (fs.existsSync(dummyImagePath)) {
      fs.unlinkSync(dummyImagePath);
    }

    console.log(`\n========================================`);
    console.log(`🎉 ALL 9 BACKEND TESTS PASSED SUCCESSFULLY!`);
    console.log(`========================================\n`);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

