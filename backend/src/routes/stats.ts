import type { FastifyInstance } from 'fastify';
import * as StatsService from '../services/stats.service';

export default async function statsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { date?: string } }>('/daily', async (request, reply) => {
    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    return reply.send({ stats: StatsService.getDailyStats(date) });
  });

  app.get<{ Querystring: { from?: string; to?: string } }>('/weekly', async (request, reply) => {
    const today = new Date();
    const to = request.query.to ?? today.toISOString().slice(0, 10);
    const from = request.query.from ?? (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return d.toISOString().slice(0, 10);
    })();
    return reply.send({ stats: StatsService.getWeeklyStats(from, to) });
  });
}
