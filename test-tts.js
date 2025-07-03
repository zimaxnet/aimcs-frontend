// Test the gpt-4o-mini-tts model directly
async function testTTS() {
  const AZURE_OPENAI_ENDPOINT = 'https://aimcs-foundry.cognitiveservices.azure.com/';
  const AZURE_OPENAI_API_KEY = '30vLeLOdqgJJ0lAAHvPQLDexkKcMNuxGTEeMlUaQ80ETKzrMHfCeJQQJ99BFACHYHv6XJ3w3AAAAACOGJTb3';
  const TTS_DEPLOYMENT_NAME = 'gpt-4o-mini-tts';
  
  console.log('🎤 Testing gpt-4o-mini-tts audio/speech endpoint...');
  console.log(`Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
  console.log(`Deployment: ${TTS_DEPLOYMENT_NAME}`);
  console.log(`API Key: ${AZURE_OPENAI_API_KEY.substring(0, 8)}...`);
  
  try {
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${TTS_DEPLOYMENT_NAME}/audio/speech?api-version=2025-03-01-preview`;
    
    console.log(`\n📡 Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: 'Hello! How can I assist you today?',
        voice: 'alloy',
        response_format: 'mp3'
      }),
    });

    console.log(`\n📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer).toString('base64');
    
    console.log(`✅ Success! Audio generated`);
    console.log(`🎵 Audio data size: ${audioData.length} bytes`);
    console.log(`🎵 Audio format: mp3`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTTS(); 