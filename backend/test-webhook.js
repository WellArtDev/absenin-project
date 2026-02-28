// Test script untuk webhook WhatsApp
// Usage: node test-webhook.js <phone_number> <message>

const fetch = require('node-fetch');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhook';
const FONNTE_WEBHOOK_URL = process.env.FONNTE_WEBHOOK_URL || 'http://localhost:3001/api/webhook/fonnte';
const PHONE = process.argv[2];
const MESSAGE = process.argv[3] || 'HADIR';

async function testWebhook() {
  if (!PHONE) {
    console.log('Usage: node test-webhook.js <phone_number> [message]');
    console.log('Example: node test-webhook.js 628123456789 HADIR');
    process.exit(1);
  }

  console.log(`🧪 Testing Webhooks...`);
  console.log(`📱 Phone: ${PHONE}`);
  console.log(`💬 Message: ${MESSAGE}`);
  console.log('');
  console.log(`🔗 Generic Webhook: ${WEBHOOK_URL}`);
  console.log(`🔗 Fonnte Webhook: ${FONNTE_WEBHOOK_URL}`);
  console.log('');

  try {
    // Test 1: Fonnte dedicated endpoint
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEST 1: Fonnte Dedicated Endpoint (RECOMMENDED)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response1 = await fetch(FONNTE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: PHONE,
        message: MESSAGE,
        device: '08123456789', // Nomor device Fonnte Anda
      }),
    });

    console.log(`Status: ${response1.status}`);
    const result1 = await response1.json();
    console.log('Response:', JSON.stringify(result1, null, 2));
    console.log('');

    // Test 2: Fonnte format with image
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEST 2: Fonnte With Image URL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response2 = await fetch(FONNTE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: PHONE,
        message: '',
        type: 'image',
        url: 'https://picsum.photos/200', // Test image URL
        device: '08123456789',
      }),
    });

    console.log(`Status: ${response2.status}`);
    const result2 = await response2.json();
    console.log('Response:', JSON.stringify(result2, null, 2));
    console.log('');

    // Test 3: Fonnte format with location
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEST 3: Fonnte With Location');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response3 = await fetch(FONNTE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: PHONE,
        message: MESSAGE,
        location: {
          latitude: -6.2088,
          longitude: 106.8456
        },
        device: '08123456789',
      }),
    });

    console.log(`Status: ${response3.status}`);
    const result3 = await response3.json();
    console.log('Response:', JSON.stringify(result3, null, 2));
    console.log('');

    // Test 4: Generic webhook (fallback)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEST 4: Generic Webhook (Fallback)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response4 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: PHONE,
        message: MESSAGE,
        device: '08123456789',
      }),
    });

    console.log(`Status: ${response4.status}`);
    const result4 = await response4.json();
    console.log('Response:', JSON.stringify(result4, null, 2));
    console.log('');

    // Test 5: Check employee exists
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEST 5: Check Employee via API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const API_URL = WEBHOOK_URL.replace('/webhook', '');
    const response5 = await fetch(`${API_URL}/employees?search=${PHONE}`);
    console.log(`Status: ${response5.status}`);
    const result5 = await response5.json();
    console.log('Response:', JSON.stringify(result5, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWebhook();
