const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Api Yucines',
      version: '1.0.0',
      description: 'Documentación de la API Yucines',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Cambia esto según tu entorno
      },
    ],
  },
  apis: ['./*.js'], // Ruta a tus archivos de rutas
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};
