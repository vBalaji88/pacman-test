const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

// Middleware for logging request time
router.use((req, res, next) => {
    console.log('Time: ', new Date());
    next();
});

// Route: Retrieve cloud metadata
router.get('/metadata', async (req, res, next) => {
    console.log('[GET /loc/metadata]');
    try {
        const host = getHost();
        const { cloud, zone } = await getCloudMetadata();
        console.log(`CLOUD: ${cloud}`);
        console.log(`ZONE: ${zone}`);
        console.log(`HOST: ${host}`);
        res.json({ cloud, zone, host });
    } catch (err) {
        console.error('Error retrieving metadata:', err);
        next(err); // Pass the error to the Express error handler
    }
});

// Helper function: Get cloud metadata
async function getCloudMetadata() {
    console.log('getCloudMetadata');
    try {
        // Attempt to get metadata from various sources
        const metadata = await getK8sCloudMetadata()
            .catch(() => getAWSCloudMetadata())
            .catch(() => getAzureCloudMetadata())
            .catch(() => getGCPCloudMetadata())
            .catch(() => getOpenStackCloudMetadata());

        return metadata;
    } catch (err) {
        console.error('Failed to retrieve cloud metadata:', err);
        // Return default values if all attempts fail
        return { cloud: 'unknown', zone: 'unknown' };
    }
}

// Helper function: Fetch OpenStack metadata
async function getOpenStackCloudMetadata() {
    console.log('getOpenStackCloudMetadata');
    const options = {
        hostname: '169.254.169.254',
        port: 80,
        path: '/openstack/latest/meta_data.json',
        method: 'GET',
        timeout: 10000,
    };

    return await makeHttpRequest(options, 'OpenStack');
}

// Helper function: Fetch AWS metadata
async function getAWSCloudMetadata() {
    console.log('getAWSCloudMetadata');
    const options = {
        hostname: '169.254.169.254',
        port: 80,
        path: '/latest/meta-data/placement/availability-zone',
        method: 'GET',
        timeout: 10000,
    };

    return await makeHttpRequest(options, 'AWS');
}

// Helper function: Fetch Azure metadata
async function getAzureCloudMetadata() {
    console.log('getAzureCloudMetadata');
    const options = {
        hostname: '169.254.169.254',
        port: 80,
        path: '/metadata/instance/compute/location?api-version=2017-04-02&format=text',
        method: 'GET',
        timeout: 10000,
        headers: { 'Metadata': 'true' },
    };

    return await makeHttpRequest(options, 'Azure');
}

// Helper function: Fetch GCP metadata
async function getGCPCloudMetadata() {
    console.log('getGCPCloudMetadata');
    const options = {
        hostname: 'metadata.google.internal',
        port: 80,
        path: '/computeMetadata/v1/instance/zone',
        method: 'GET',
        timeout: 10000,
        headers: { 'Metadata-Flavor': 'Google' },
    };

    return await makeHttpRequest(options, 'GCP');
}

// Helper function: Fetch Kubernetes metadata
async function getK8sCloudMetadata() {
    console.log('getK8sCloudMetadata');
    const nodeName = process.env.MY_NODE_NAME;
    if (!nodeName) throw new Error('Node name environment variable not set');

    const saToken = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
    const caFile = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt');
    const options = {
        hostname: 'kubernetes.default.svc',
        port: 443,
        path: `/api/v1/nodes/${nodeName}`,
        method: 'GET',
        timeout: 10000,
        ca: caFile,
        headers: { 'Authorization': `Bearer ${saToken}` },
    };

    return await makeHttpsRequest(options, 'Kubernetes');
}

// Helper function: Make HTTP request
async function makeHttpRequest(options, cloudName) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${cloudName} metadata, status: ${res.statusCode}`));
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                console.log(`${cloudName} Metadata:`, data);
                resolve({ cloud: cloudName, zone: data.trim() });
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

// Helper function: Make HTTPS request
async function makeHttpsRequest(options, cloudName) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${cloudName} metadata, status: ${res.statusCode}`));
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                console.log(`${cloudName} Metadata:`, data);
                resolve({ cloud: cloudName, zone: data.trim() });
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

// Helper function: Get host information
function getHost() {
    console.log('[getHost]');
    const host = os.hostname();
    console.log(`HOST: ${host}`);
    return host;
}

module.exports = router;