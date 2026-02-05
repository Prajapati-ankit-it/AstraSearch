import fastify from 'fastify';
import cors from '@fastify/cors';
import { SearchEngine } from './core/searchEngine';
import { SearchRoutes } from './api/search.routes';
import { logger } from './utils/logger';
import { config } from './config/config';

async function createServer() {
  const server = fastify({
    logger: false, // Using custom logger
    trustProxy: true
  });

  // Register CORS
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // Initialize search engine
  const searchEngine = new SearchEngine();
  await searchEngine.initialize();

  // Register routes
  const searchRoutes = new SearchRoutes(searchEngine);
  searchRoutes.registerRoutes(server);

  // Add global error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error('Unhandled error:', error);
    reply.status(500).send({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  });

  return { server, searchEngine };
}

async function startServer() {
  try {
    const { server, searchEngine } = await createServer();

    // Start server
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });

    logger.info(`🚀 Search service started on http://${config.host}:${config.port}`);
    logger.info(`📚 Index loaded with ${searchEngine.getStats().documents} documents`);
    logger.info(`🔍 Search endpoint available at /search`);
    logger.info(`💚 Health check available at /health`);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await server.close();
      logger.info('Server stopped');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createServer, startServer };