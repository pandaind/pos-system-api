const { getHttpOperationsFromResource, createInstance } = require('@stoplight/prism-http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');

let prism;

const initializePrism = async () => {
  const specPath = path.join(__dirname, '../pos.yml');
  const specContent = fs.readFileSync(specPath, 'utf8');
  const operations = await getHttpOperationsFromResource(specContent);
  prism = createInstance({ config: { mock: { dynamic: true } } }, { operations });
};

module.exports = async (req, res) => {
  if (!prism) {
    await initializePrism();
  }

  const parsedUrl = parse(req.url, true);

  const request = {
    method: req.method,
    url: {
      path: parsedUrl.pathname,
      query: parsedUrl.query,
    },
    headers: req.headers,
    body: req,
  };

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
