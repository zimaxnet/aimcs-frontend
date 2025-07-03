// Test the o4-mini model directly
async function testO4Mini() {
  const AZURE_OPENAI_ENDPOINT = 'https://aimcs-foundry.cognitiveservices.azure.com/';
  const AZURE_OPENAI_API_KEY = '30vLeLOdqgJJ0lAAHvPQLDexkKcMNuxGTEeMlUaQ80ETKzrMHfCeJQQJ99BFACHYHv6XJ3w3AAAAACOGJTb3';
  const DEPLOYMENT_NAME = 'o4-mini';
  
  console.log('🧪 Testing o4-mini model...');
  console.log(`Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
  console.log(`Deployment: ${DEPLOYMENT_NAME}`);
  console.log(`API Key: ${AZURE_OPENAI_API_KEY.substring(0, 8)}...`);
  
  try {
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-12-01-preview`;
    
    console.log(`\n📡 Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "text" }
      }),
    });

    console.log(`\n📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2));
    
    const aiResponse = data.choices?.[0]?.message?.content;
    console.log(`\n🤖 AI Response: "${aiResponse}"`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testO4Mini(); 