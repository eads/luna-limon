// setup-airtable-webhook.js
// This method works on ANY Airtable plan!
import 'dotenv/config';

// Load from environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_TOKEN; // From your .env file
const BASE_ID = process.env.AIRTABLE_BASE; // From your .env file  
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-sst-api.amazonaws.com/webhook/airtable'; // From SST output

async function createAirtableWebhook() {
  console.group('🔗 Existing webhooks');
  const response = await fetch(`https://api.airtable.com/v0/bases/${BASE_ID}/webhooks`, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
  });
  const data = await response.json();
  console.log('Webhooks:', data.webhooks);

  try {
    console.log('🚀 Creating webhook via Airtable API...');
    
    const response = await fetch(`https://api.airtable.com/v0/bases/${BASE_ID}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationUrl: WEBHOOK_URL,
        specification: {
          options: {
            filters: {
              dataTypes: ['tableData'], // Listen to table data changes
              // Optional: filter by specific tables
              // recordChangeScope: ['tblXXXXXXXXXXXXXX'] // Replace with your table ID(s)
            }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Response:', error);
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const webhook = await response.json();
    console.log('✅ Webhook created successfully!');
    console.log('Webhook ID:', webhook.id);
    console.log('Webhook URL:', webhook.notificationUrl);
    
    return webhook;
  } catch (error) {
    console.error('❌ Failed to create webhook:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Tips:');
      console.log('1. Make sure your AIRTABLE_TOKEN is correct');
      console.log('2. Get a Personal Access Token from: https://airtable.com/create/tokens');
      console.log('3. Make sure the token has "data:records:read" and "webhook:manage" scopes');
    }
    
    throw error;
  }
}

// Function to test if your webhook URL is accessible
async function testWebhookURL(url) {
  try {
    console.log('🧪 Testing webhook URL accessibility...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`Response status: ${response.status}`);
    if (response.status === 401) {
      console.log('✅ Good! Got 401 (expected - missing signature)');
    } else if (response.status === 200) {
      console.log('✅ Webhook URL is accessible');
    } else {
      console.log('⚠️  Unexpected status, but URL seems reachable');
    }
  } catch (error) {
    console.error('❌ Webhook URL not accessible:', error.message);
    throw error;
  }
}

// Instructions for getting your info
function printInstructions() {
  console.log('\n📋 How to get your Airtable info:');
  console.log('1. API Key: Go to https://airtable.com/create/tokens');
  console.log('   - Click "Create new token"');
  console.log('   - Add scopes: "data:records:read" and "webhook:manage"');
  console.log('   - Add your base to the token');
  console.log('');
  console.log('2. Base ID: From your Airtable URL');
  console.log('   - airtable.com/appXXXXXXXXXXXXXX (the appXXX part)');
  console.log('');
  console.log('3. Webhook URL: From your SST deployment');
  console.log('   - Run: npx sst deploy --stage production');
  console.log('   - Copy the WebhookUrl from the output');
}

async function main() {
  console.log('🔧 Airtable Webhook Setup (API Method)');
  console.log('=====================================');
  
  // Validate inputs
  if (!AIRTABLE_API_KEY || AIRTABLE_API_KEY.includes('xxxxx')) {
    console.log('❌ Please set your AIRTABLE_API_KEY');
    printInstructions();
    return;
  }
  
  if (!BASE_ID || BASE_ID.includes('XXXXX')) {
    console.log('❌ Please set your BASE_ID');
    printInstructions();
    return;
  }
  
  if (!WEBHOOK_URL || WEBHOOK_URL.includes('your-sst')) {
    console.log('❌ Please set your WEBHOOK_URL');
    printInstructions();
    return;
  }
  
  try {
    // Test webhook URL first
    await testWebhookURL(WEBHOOK_URL);
    
    // Create the webhook
    await createAirtableWebhook();
    
    console.log('\n✨ Setup complete!');
    console.log('Now make a change to your Airtable base to test it.');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    printInstructions();
  }
}

// Run it
main().catch(console.error);