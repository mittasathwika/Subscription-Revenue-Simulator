const bcrypt = require('bcryptjs');

// Generate correct hash for password123
const password = 'password123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in DynamoDB console:');
console.log(JSON.stringify({
  id: { S: "user-dhaval-123" },
  email: { S: "dhaval@gmail.com" },
  password: { S: hash },
  created_at: { S: new Date().toISOString() }
}, null, 2));
