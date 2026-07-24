const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/store/login', {
      phone: '13800138001',
      password: 'store123'
    });
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
