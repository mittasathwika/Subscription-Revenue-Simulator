const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Check if DynamoDB should be used
const useDynamoDB = process.env.USE_DYNAMODB === 'true';

let client = null;
let docClient = null;

if (useDynamoDB) {
    client = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    docClient = DynamoDBDocumentClient.from(client);
}

// Table names
const TABLES = {
    USERS: 'simulator-users',
    SCENARIOS: 'simulator-scenarios',
    REAL_METRICS: 'simulator-real-metrics',
    SIMULATIONS: 'simulator-simulations'
};

// User functions
async function getUserByEmail(email) {
    if (!docClient) return null;
    
    // Query by email using Scan (since email is not the partition key)
    const command = new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email
        }
    });
    
    const result = await docClient.send(command);
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

async function createUser(userData) {
    if (!docClient) return null;
    
    const command = new PutCommand({
        TableName: TABLES.USERS,
        Item: {
            id: uuidv4(),                    // Partition key (UUID)
            email: userData.email,           // Email attribute
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            phone: userData.phone || '',
            password: userData.password || '',
            auth_provider: userData.auth_provider || 'local', // local, google, facebook, phone
            social_id: userData.social_id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    });
    
    await docClient.send(command);
    return userData;
}

// Get or create user by social auth (Google, Facebook, Phone)
async function getOrCreateSocialUser(provider, socialId, email, firstName, lastName) {
    if (!docClient) return null;
    
    // Try to find existing user by email first
    let user = await getUserByEmail(email);
    
    if (user) {
        // Update social auth info if not already set
        if (!user.auth_provider || user.auth_provider === 'local') {
            const command = new PutCommand({
                TableName: TABLES.USERS,
                Item: {
                    ...user,
                    auth_provider: provider,
                    social_id: socialId,
                    first_name: firstName || user.first_name || '',
                    last_name: lastName || user.last_name || '',
                    updated_at: new Date().toISOString()
                }
            });
            await docClient.send(command);
            user.auth_provider = provider;
            user.social_id = socialId;
        }
        return user;
    }
    
    // Create new social user
    const newUser = {
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        auth_provider: provider,
        social_id: socialId,
        password: '' // Social users don't have local password
    };
    
    await createUser(newUser);
    return newUser;
}

// Update user profile
async function updateUser(email, updates) {
    if (!docClient) return null;
    
    const user = await getUserByEmail(email);
    if (!user) return null;
    
    const command = new PutCommand({
        TableName: TABLES.USERS,
        Item: {
            ...user,
            ...updates,
            id: user.id, // Ensure id is preserved
            email: user.email, // Ensure email is preserved
            updated_at: new Date().toISOString()
        }
    });
    
    await docClient.send(command);
    return { ...user, ...updates };
}

// Scenario functions
async function getScenarios(userEmail) {
    if (!docClient) return [];
    
    const command = new QueryCommand({
        TableName: TABLES.SCENARIOS,
        IndexName: 'user_id-index',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
            ':userId': userEmail
        }
    });
    
    const result = await docClient.send(command);
    return result.Items || [];
}

async function createScenario(userEmail, scenarioData) {
    if (!docClient) return null;
    
    const item = {
        id: scenarioData.id,
        user_id: userEmail,
        name: scenarioData.name,
        price: scenarioData.price || 99,
        churn_rate: scenarioData.churn_rate || 0.05,
        ad_spend: scenarioData.ad_spend || 5000,
        growth_rate: scenarioData.growth_rate || 0.10,
        initial_customers: scenarioData.initial_customers || 100,
        cac: scenarioData.cac || 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const command = new PutCommand({
        TableName: TABLES.SCENARIOS,
        Item: item
    });
    
    await docClient.send(command);
    return item;
}

async function getScenarioById(scenarioId) {
    if (!docClient) return null;
    
    const command = new GetCommand({
        TableName: TABLES.SCENARIOS,
        Key: { id: scenarioId }
    });
    
    const result = await docClient.send(command);
    return result.Item;
}

async function deleteScenario(scenarioId) {
    if (!docClient) return false;
    
    const command = new DeleteCommand({
        TableName: TABLES.SCENARIOS,
        Key: { id: scenarioId }
    });
    
    await docClient.send(command);
    return true;
}

// Real metrics functions
async function getRealMetrics(userEmail) {
    if (!docClient) return null;
    
    try {
        // Try Get first (if user_id is partition key)
        const command = new GetCommand({
            TableName: TABLES.REAL_METRICS,
            Key: { user_id: userEmail }
        });
        
        const result = await docClient.send(command);
        if (result.Item) return result.Item;
    } catch (e) {
        // Table may not exist or key mismatch - try Scan as fallback
        try {
            const scanCommand = new ScanCommand({
                TableName: TABLES.REAL_METRICS,
                FilterExpression: 'user_id = :uid',
                ExpressionAttributeValues: { ':uid': userEmail }
            });
            const scanResult = await docClient.send(scanCommand);
            return scanResult.Items && scanResult.Items.length > 0 ? scanResult.Items[0] : null;
        } catch (scanErr) {
            console.error('Real metrics table error:', scanErr.message);
            return null;
        }
    }
    
    return null;
}

async function saveRealMetrics(userEmail, metricsData) {
    if (!docClient) return null;
    
    const command = new PutCommand({
        TableName: TABLES.REAL_METRICS,
        Item: {
            user_id: userEmail,
            ...metricsData,
            updated_at: new Date().toISOString()
        }
    });
    
    await docClient.send(command);
    return metricsData;
}

module.exports = {
    useDynamoDB,
    getUserByEmail,
    createUser,
    getOrCreateSocialUser,
    updateUser,
    getScenarios,
    createScenario,
    getScenarioById,
    deleteScenario,
    getRealMetrics,
    saveRealMetrics
};
