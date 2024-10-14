const { createInstance } = require('@stoplight/prism-http');
const { getHttpOperationsFromResource } = require('@stoplight/http-spec');
const { parse } = require('url');
const path = require('path');

let prism;

const initializePrism = async () => {
  const specPath = path.join(__dirname, '../pos.yml');
  const operations = await getHttpOperationsFromResource(specPath);
  prism = createInstance({ config: { mock: { dynamic: true } } }, { operations });
};

module.exports = async (req, res) => {
  if (!prism) {
    try {
      await initializePrism();
    } catch (error) {
      console.error('Error initializing Prism:', error);
      res.statusCode = 500;
      res.end('Internal Server Error during initialization');
      return;
    }
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
  };

  // Collect the request body if present
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  if (body) {
    request.body = body;
  }

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

    if (response.body) {
      res.end(typeof response.body === 'string' ? response.body : JSON.stringify(response.body));
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error during request processing');
  }
};
