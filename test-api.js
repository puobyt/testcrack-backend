// Save this as test-api.js and run with: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  try {
    console.log('🧪 Testing Test Crack API...\n');

    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(BASE_URL);
    console.log('✅ Server is running:', healthResponse.data.message);

    // Test 2: Register a new user
    console.log('\n2. Testing user registration...');
    const signupData = {
      email: `test${Date.now()}@example.com`, // Unique email
      password: 'password123'
    };
    
    const signupResponse = await axios.post(`${BASE_URL}/api/auth/signup`, signupData);
    console.log('✅ User registered successfully');
    console.log('📧 Email:', signupData.email);
    
    const token = signupResponse.data.token;
    console.log('🔑 Token received');

    // Test 3: Get assessment content
    console.log('\n3. Testing assessment content...');
    const contentResponse = await axios.get(`${BASE_URL}/api/assessment/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Assessment content retrieved');
    console.log('📖 Passage word count:', contentResponse.data.data.wordCount);
    console.log('❓ Number of questions:', contentResponse.data.data.questions.length);

    // Test 4: Submit assessment
    console.log('\n4. Testing assessment submission...');
    const submissionData = {
      userAnswers: [1, 1, 1, 2], // Sample answers
      readingTimeSeconds: 45,
      questionTimeSeconds: 30
    };
    
    const submitResponse = await axios.post(`${BASE_URL}/api/assessment/submit`, submissionData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Assessment submitted successfully');
    console.log('🏆 Speed Score:', submitResponse.data.data.speedScore);
    console.log('🎯 Accuracy:', submitResponse.data.data.accuracy + '%');
    console.log('📚 Words Per Minute:', submitResponse.data.data.wordsPerMinute);

    // Test 5: Get user progress
    console.log('\n5. Testing user progress...');
    const progressResponse = await axios.get(`${BASE_URL}/api/user/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ User progress retrieved');
    console.log('📊 Total Assessments:', progressResponse.data.data.user.totalAssessments);
    console.log('📈 Average Speed Score:', progressResponse.data.data.user.averageSpeedScore);

    console.log('\n🎉 All tests passed! Your API is working perfectly!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message || error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure your server is running with: npm run dev');
    }
  }
}

testAPI();