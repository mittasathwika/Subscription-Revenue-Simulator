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
            id: uuidv4(),             // Partition key (UUID)
            email: userData.email,    // Email attribute
            password: userData.password,
            created_at: new Date().toISOString()
        }
    });
    
    await docClient.send(command);
    return userData;
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
    
    const command = new GetCommand({
        TableName: TABLES.REAL_METRICS,
        Key: { user_id: userEmail }
    });
    
    const result = await docClient.send(command);
    return result.Item;
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
    getScenarios,
    createScenario,
    getScenarioById,
    deleteScenario,
    getRealMetrics,
    saveRealMetrics
};
