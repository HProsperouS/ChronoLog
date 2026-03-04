import type { FastifyInstance } from 'fastify';
import * as AiService from '../services/ai.service';
import * as StatsService from '../services/stats.service';

export default async function insightsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const insights = AiService.getInsights(request.query.date);
    return reply.send({ insights });
  });

  app.post<{ Body: { date?: string } }>('/generate', async (request, reply) => {
    const date = request.body?.date ?? new Date().toISOString().slice(0, 10);
    try {
      const stats = StatsService.getDailyStats(date);
      const insights = await AiService.generateInsights(stats);
      return reply.send({ insights });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI service error';
      return reply.code(503).send({ error: message });
    }
  });
}
