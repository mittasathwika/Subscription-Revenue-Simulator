const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'simulator-users';

async function createTestUser() {
    const email = 'dhaval@gmail.com';
    const password = 'password123';
    
    // Check if user already exists
    const scanCommand = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email }
    });
    
    const existing = await docClient.send(scanCommand);
    
    if (existing.Items && existing.Items.length > 0) {
        console.log('Test user already exists:', email);
        console.log('User ID:', existing.Items[0].id);
        return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            id: userId,
            email: email,
            password: hashedPassword,
            created_at: new Date().toISOString()
        }
    });
    
    await docClient.send(command);
    
    console.log('✅ Test user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userId);
}

createTestUser().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
