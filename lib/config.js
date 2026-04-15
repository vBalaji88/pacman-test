const serviceHost = process.env.MONGO_SERVICE_HOST || process.env.MONGO_NAMESPACE_SERVICE_HOST || 'localhost';
const mongoDatabase = process.env.MONGO_DATABASE || 'pacman';
const mongoPort = process.env.MY_MONGO_PORT || '27017';
const useSSL = process.env.MONGO_USE_SSL?.toLowerCase() === 'true';
const validateSSL = process.env.MONGO_VALIDATE_SSL?.toLowerCase() !== 'false'; // Default: true
const authUser = process.env.MONGO_AUTH_USER || '';
const authPwd = process.env.MONGO_AUTH_PWD || '';
const replicaSet = process.env.MONGO_REPLICA_SET || '';

let connectionDetails = ''; // Holds the connection details for all hosts

// Build authentication string
const authDetails = authUser && authPwd ? `${authUser}:${authPwd}@` : '';

// Build the connection host string
const hosts = serviceHost.split(',');
connectionDetails = hosts.map((host) => `${host}:${mongoPort}`).join(',');

// Build the MongoDB connection string
let connectionString = `mongodb://${authDetails}${connectionDetails}/${mongoDatabase}`;

// Add replica set to the connection string if defined
if (replicaSet) {
    connectionString += `?replicaSet=${replicaSet}`;
}

// Define connection options
const databaseOptions = {
    readPreference: 'secondaryPreferred', // Use secondary for reads, if available
};

if (useSSL) {
    databaseOptions.ssl = true;
    databaseOptions.sslValidate = validateSSL;
}

// Export the database configuration
const database = {
    url: connectionString,
    options: databaseOptions,
};

module.exports = { database };