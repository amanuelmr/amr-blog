// swagger.js
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

// Server list. A relative "/api/v1" makes "Try it out" hit whatever host is
// serving the docs (works on Vercel, Render, or localhost without config).
const localPort = process.env.PORT || 5000;
const servers = [
  { url: '/api/v1', description: 'This server' },
  { url: `http://localhost:${localPort}/api/v1`, description: 'Local development' },
];
if (process.env.SWAGGER_SERVER_URL) {
  servers.push({ url: process.env.SWAGGER_SERVER_URL, description: 'Configured' });
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: 'A simple API for managing blogs',
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Absolute path so JSDoc scanning is not dependent on the process CWD.
  apis: [path.join(__dirname, 'routes', '*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

// swagger-ui-express serves its CSS/JS from the swagger-ui-dist package via
// express.static, which is unreliable on serverless hosts (e.g. Vercel), where
// the stylesheet 503s and the page renders unstyled. Instead we serve a tiny
// HTML page that loads Swagger UI from a CDN and reads the spec from
// /swagger.json — no static package files are served by the function.
const SWAGGER_UI_VERSION = '5.17.14';
const CDN = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Blog API — Documentation</title>
  <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
  <link rel="icon" type="image/png" href="${CDN}/favicon-32x32.png" sizes="32x32" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.addEventListener('load', function () {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
      });
    });
  </script>
</body>
</html>`;

function swaggerDocs(app) {
  // Raw OpenAPI spec consumed by the CDN-hosted UI.
  app.get('/swagger.json', (req, res) => res.json(swaggerSpec));

  const sendDocs = (req, res) => {
    // Scope the CSP for this route so Helmet's global policy doesn't block the
    // CDN assets or the inline init script.
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "img-src 'self' data: https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "connect-src 'self'",
      ].join('; ')
    );
    res.type('html').send(docsHtml);
  };

  app.get('/swagger-ui', sendDocs);
  app.get('/swagger-ui/', sendDocs);
}

module.exports = swaggerDocs;
