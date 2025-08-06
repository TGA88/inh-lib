#!/usr/bin/env node

/**
 * Test script for Simplified Fastify Telemetry Example
 * ทดสอบ API endpoints และดู telemetry output
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';

/**
 * Make HTTP request
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test suite
 */
async function runTests() {
  console.log('🧪 ===========================================');
  console.log('🧪 Testing Fastify Telemetry Example API');
  console.log('🧪 ===========================================\n');

  try {
    // 1. Health check
    console.log('1️⃣  Testing health check...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
    });
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response:`, healthResponse.body);
    console.log('');

    // 2. Get all users (should be empty initially)
    console.log('2️⃣  Getting all users (initial)...');
    const getAllResponse1 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'GET',
    });
    console.log(`   Status: ${getAllResponse1.statusCode}`);
    console.log(`   Users count: ${getAllResponse1.body?.data?.length || 0}`);
    console.log('');

    // 3. Create first user
    console.log('3️⃣  Creating first user...');
    const createUser1Response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      name: 'John Doe',
      email: 'john@example.com',
    });
    console.log(`   Status: ${createUser1Response.statusCode}`);
    console.log(`   Created user:`, createUser1Response.body?.data);
    const user1Id = createUser1Response.body?.data?.id;
    console.log('');

    // 4. Create second user
    console.log('4️⃣  Creating second user...');
    const createUser2Response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      name: 'Jane Smith',
      email: 'jane@example.com',
    });
    console.log(`   Status: ${createUser2Response.statusCode}`);
    console.log(`   Created user:`, createUser2Response.body?.data);
    const user2Id = createUser2Response.body?.data?.id;
    console.log('');

    // 5. Get all users (should have 2 users)
    console.log('5️⃣  Getting all users (after creating)...');
    const getAllResponse2 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'GET',
    });
    console.log(`   Status: ${getAllResponse2.statusCode}`);
    console.log(`   Users count: ${getAllResponse2.body?.data?.length || 0}`);
    console.log('');

    // 6. Get user by ID
    console.log(`6️⃣  Getting user by ID (${user1Id})...`);
    const getUserResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${user1Id}`,
      method: 'GET',
    });
    console.log(`   Status: ${getUserResponse.statusCode}`);
    console.log(`   User:`, getUserResponse.body?.data);
    console.log('');

    // 7. Update user
    console.log(`7️⃣  Updating user (${user1Id})...`);
    const updateUserResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${user1Id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      name: 'John Updated',
      email: 'john.updated@example.com',
    });
    console.log(`   Status: ${updateUserResponse.statusCode}`);
    console.log(`   Updated user:`, updateUserResponse.body?.data);
    console.log('');

    // 8. Test not found
    console.log('8️⃣  Testing not found (user ID 999)...');
    const notFoundResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users/999',
      method: 'GET',
    });
    console.log(`   Status: ${notFoundResponse.statusCode}`);
    console.log(`   Error:`, notFoundResponse.body?.error);
    console.log('');

    // 9. Test validation error
    console.log('9️⃣  Testing validation error (missing name)...');
    const validationErrorResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      email: 'incomplete@example.com',
    });
    console.log(`   Status: ${validationErrorResponse.statusCode}`);
    console.log(`   Error:`, validationErrorResponse.body?.error);
    console.log('');

    // 10. Delete user
    console.log(`🔟 Deleting user (${user2Id})...`);
    const deleteUserResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${user2Id}`,
      method: 'DELETE',
    });
    console.log(`   Status: ${deleteUserResponse.statusCode}`);
    console.log(`   Deleted:`, deleteUserResponse.body?.data?.deleted);
    console.log('');

    // 11. Final users count
    console.log('1️⃣1️⃣ Final users count...');
    const finalGetAllResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users',
      method: 'GET',
    });
    console.log(`   Status: ${finalGetAllResponse.statusCode}`);
    console.log(`   Users count: ${finalGetAllResponse.body?.data?.length || 0}`);
    console.log('');

    console.log('✅ ===========================================');
    console.log('✅ All tests completed successfully!');
    console.log('✅ ===========================================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Wait for server to be ready
function waitForServer(retries = 10) {
  return new Promise((resolve, reject) => {
    const checkServer = (attempt) => {
      if (attempt >= retries) {
        reject(new Error('Server not ready after maximum retries'));
        return;
      }

      makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/health',
        method: 'GET',
      }).then(() => {
        resolve();
      }).catch(() => {
        console.log(`⏳ Waiting for server... (attempt ${attempt + 1}/${retries})`);
        setTimeout(() => checkServer(attempt + 1), 1000);
      });
    };

    checkServer(0);
  });
}

// Main execution
async function main() {
  console.log('⏳ Waiting for server to be ready...');
  
  try {
    await waitForServer();
    console.log('✅ Server is ready!\n');
    await runTests();
  } catch (error) {
    console.error('❌ Failed to run tests:', error.message);
    process.exit(1);
  }
}

main();
