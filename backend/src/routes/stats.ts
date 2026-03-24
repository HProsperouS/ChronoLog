import type { FastifyInstance } from 'fastify';
import * as StatsService from '../services/stats.service';

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function statsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { date?: string } }>('/daily', async (request, reply) => {
    const date = request.query.date ?? localDateString();
    return reply.send({ stats: StatsService.getDailyStats(date) });
  });

  app.get<{ Querystring: { from?: string; to?: string } }>('/weekly', async (request, reply) => {
    const today = new Date();
    const to = request.query.to ?? localDateString(today);
    const from = request.query.from ?? (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return localDateString(d);
    })();
    return reply.send({ stats: StatsService.getWeeklyStats(from, to) });
  });
}
