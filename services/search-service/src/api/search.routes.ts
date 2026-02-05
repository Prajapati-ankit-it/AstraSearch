import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SearchEngine } from '../core/searchEngine';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface SearchQueryParams {
  q: string;
  limit?: string;
  offset?: string;
}

export class SearchRoutes {
  private searchEngine: SearchEngine;

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
  }

  registerRoutes(fastify: FastifyInstance): void {
    // Health check endpoint
    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = this.searchEngine.getStats();
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          stats
        };
      } catch (error) {
        logger.error('Health check failed:', error);
        reply.status(500);
        return {
          status: 'unhealthy',
          error: 'Search engine not available'
        };
      }
    });

    // Search endpoint
    fastify.get('/search', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'number', minimum: 1, maximum: config.search.maxLimit },
            offset: { type: 'number', minimum: 0 }
          },
          required: ['q']
        }
      }
    }, async (request: FastifyRequest<{ Querystring: SearchQueryParams }>, reply: FastifyReply) => {
      try {
        const { q, limit, offset } = request.query;

        // Parse and validate parameters
        const parsedLimit = Math.min(
          Math.max(parseInt(limit || config.search.defaultLimit.toString()), 1),
          config.search.maxLimit
        );
        
        const parsedOffset = Math.max(parseInt(offset || config.search.defaultOffset.toString()), 0);

        logger.info(`Search request: query="${q}", limit=${parsedLimit}, offset=${parsedOffset}`);

        // Perform search
        const results = await this.searchEngine.search(q, parsedLimit, parsedOffset);

        logger.info(`Search completed: ${results.results.length} results in ${results.processingTime}ms`);
        
        return results;

      } catch (error) {
        logger.error('Search request failed:', error);
        reply.status(500);
        return {
          error: 'Search failed',
          message: 'An error occurred while processing your search request'
        };
      }
    });

    // Cache management endpoint
    fastify.delete('/cache', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        this.searchEngine.clearCache();
        logger.info('Cache cleared via API');
        return {
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error('Cache clear failed:', error);
        reply.status(500);
        return {
          error: 'Failed to clear cache',
          message: 'An error occurred while clearing cache'
        };
      }
    });

    logger.info('Search routes registered');
  }
}