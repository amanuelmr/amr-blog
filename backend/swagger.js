// swagger.js
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Server list: production URL plus a local dev entry. Override the production
// base with SWAGGER_SERVER_URL when deploying elsewhere.
const localPort = process.env.PORT || 5000;
const servers = [
  { url: process.env.SWAGGER_SERVER_URL || 'https://amr-blog.onrender.com/api/v1', description: 'Production' },
  { url: `http://localhost:${localPort}/api/v1`, description: 'Local development' },
];

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

function swaggerDocs(app) {
  app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = swaggerDocs;
