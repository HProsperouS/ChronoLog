import type { FastifyInstance } from 'fastify';
import * as AiService from '../services/ai.service';

export default async function insightsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const insights = AiService.getInsights(request.query.date);
    return reply.send({ insights });
  });

  app.post<{ Body: { date?: string } }>('/generate', async (request, reply) => {
    const date = request.body?.date ?? new Date().toISOString().slice(0, 10);
    try {
      const insights = await AiService.generateInsights(date);
      return reply.send({ insights });
    } catch (err: unknown) {
      if (err instanceof AiService.InsightCooldownError) {
        return reply.code(429).send({
          error: err.message,
          quota: {
            ...AiService.getInsightsGenerateQuota(date),
          },
        });
      }
      if (err instanceof AiService.InsightQuotaError) {
        return reply.code(429).send({
          error: err.message,
          quota: AiService.getInsightsGenerateQuota(date),
        });
      }
      const message = err instanceof Error ? err.message : 'AI service error';
      return reply.code(503).send({ error: message });
    }
  });

  app.get<{ Querystring: { date?: string } }>('/quota', async (request, reply) => {
    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    const quota = AiService.getInsightsGenerateQuota(date);
    return reply.send({ quota });
  });

  // Weekly insights routes
  app.post<{ Body: { startDate?: string } }>('/weekly/generate', async (request, reply) => {
    const startDate = request.body?.startDate ?? new Date().toISOString().slice(0, 10);
    try {
      const insights = await AiService.generateWeeklyInsights(startDate);
      return reply.send({ insights });
    } catch (err: unknown) {
      if (err instanceof AiService.InsightCooldownError) {
        return reply.code(429).send({
          error: err.message,
          quota: {
            ...AiService.getWeeklyInsightsGenerateQuota(startDate),
          },
        });
      }
      if (err instanceof AiService.InsightQuotaError) {
        return reply.code(429).send({
          error: err.message,
          quota: AiService.getWeeklyInsightsGenerateQuota(startDate),
        });
      }
      const message = err instanceof Error ? err.message : 'AI service error';
      return reply.code(503).send({ error: message });
    }
  });

  app.get<{ Querystring: { startDate?: string } }>('/weekly/quota', async (request, reply) => {
    const startDate = request.query.startDate ?? new Date().toISOString().slice(0, 10);
    const quota = AiService.getWeeklyInsightsGenerateQuota(startDate);
    return reply.send({ quota });
  });
}
