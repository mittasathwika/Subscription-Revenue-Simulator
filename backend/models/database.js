// DynamoDB-only database module
// SQLite has been removed - all data stored in DynamoDB

function initializeDatabase() {
    console.log('🔹 DynamoDB mode - no local database initialization needed');
}

function getDatabase() {
    // Returns null - DynamoDB is used instead via dynamodb.js
    return null;
}

module.exports = {
    getDatabase,
    initializeDatabase
};
