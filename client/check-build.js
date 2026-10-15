const http = require('http');

console.log('🔍 Checking localhost:7283...\n');

const options = {
  hostname: 'localhost',
  port: 7283,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is running!`);
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📄 Response length: ${data.length} bytes`);
    if (data.length < 500) {
      console.log('\n📄 Response content:');
      console.log(data);
    } else {
      console.log('\n📄 First 500 chars:');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
  console.error('\n💡 Make sure the dev server is running:');
  console.error('   cd client');
  console.error('   npm start');
});

req.on('timeout', () => {
  console.error('❌ Request timed out');
  req.destroy();
});

req.end();
