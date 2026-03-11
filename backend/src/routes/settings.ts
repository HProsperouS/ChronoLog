import type { FastifyInstance } from 'fastify';
import * as SettingsService from '../services/settings.service';
import type { PrivacyExclusions } from '../store/settings.store';

export default async function settingsRoutes(app: FastifyInstance) {
  app.get('/privacy', async (_request, reply) => {
    const privacy = SettingsService.getPrivacy();
    return reply.send({ privacy });
  });

  app.patch<{ Body: Partial<PrivacyExclusions> }>('/privacy', async (request, reply) => {
    const privacy = SettingsService.updatePrivacy(request.body);
    return reply.send({ privacy });
  });

  app.get('/data-summary', async (_request, reply) => {
    const summary = SettingsService.getDataSummary();
    return reply.send({ summary });
  });

  app.post<{ Body: { olderThanDays: number } }>('/data/clear-old', async (request, reply) => {
    const days = Number(request.body.olderThanDays);
    if (!Number.isFinite(days) || days <= 0) {
      return reply.code(400).send({ error: 'olderThanDays must be a positive number' });
    }
    SettingsService.clearDataOlderThan(days);
    const summary = SettingsService.getDataSummary();
    return reply.send({ summary });
  });

  app.delete('/data/all', async (_request, reply) => {
    SettingsService.deleteAllData();
    const summary = SettingsService.getDataSummary();
    return reply.send({ summary });
  });

  app.get('/data/export', async (_request, reply) => {
    const payload = SettingsService.exportAllData();
    return reply
      .header('Content-Type', 'application/json')
      .send(payload);
  });
}

