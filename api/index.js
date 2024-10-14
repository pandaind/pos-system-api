// index.js
const { createInstance } = require('@stoplight/prism-http');
const { createLogger } = require('@stoplight/prism-core');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml'); // For parsing YAML OpenAPI files

async function initPrism() {
  try {
    const specPath = path.join(__dirname, '../pos.yml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.load(specContent); // YAML parser

    // Create Prism instance
    const prism = createInstance(
      { config: { mock: { dynamic: true } }, components: { logger: createLogger() } },
      spec
    );

    return prism;
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    throw new Error('Failed to initialize Prism: ' + error.message);
  }
}


async function handleRequest(req, res) {
  try {
    const prism = await initPrism();

    // Create the request object for Prism
    const request = {
      method: req.method,
      url: {
        path: req.url,
        query: req.query,
      },
      headers: req.headers,
      body: req.body,
    };

    console.log('Sending request to Prism:', request);

    // Get the mocked response from Prism
    const response = await prism.request(request);

    if (!response) {
      throw new Error('Prism response is undefined');
    }

    // Return the response to the client
    res.status(response.output.statusCode).set(response.output.headers || {}).send(response.output.body);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: 'An error occurred', details: error.message });
  }
}


// Export the handler for use with serverless functions or local development
module.exports = handleRequest;
