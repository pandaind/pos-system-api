const { getHttpOperationsFromResource, createInstance } = require('@stoplight/prism-http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');

let prism;

const initializePrism = async () => {
  const specPath = path.join(__dirname, '../pos.yml');
  const specContent = fs.readFileSync(specPath, 'utf8');
  const operations = await getHttpOperationsFromResource(specContent);
  prism = createInstance(
    { config: { mock: { dynamic: true } } },
    { components: { logger: { info() {}, error() {}, warn() {} } }, operations }
  );
};

module.exports = async (req, res) => {
  if (!prism) {
    await initializePrism();
  }

  // Parse the URL and remove the '/api' prefix
  const parsedUrl = parse(req.url, true);
  const requestPath = parsedUrl.pathname.replace(/^\/api/, '') || '/';

  // Set up the Prism request object
  const request = {
    method: req.method,
    url: {
      path: requestPath,
      query: parsedUrl.query,
    },
    headers: req.headers,
    body: req,
  };

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const response = await prism.request(request);
    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers || {})) {
      res.setHeader(key, value);
    }
    res.end(JSON.stringify(response.body));
  } catch (error) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
