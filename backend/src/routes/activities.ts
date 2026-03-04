import type { FastifyInstance } from 'fastify';
import * as ActivityService from '../services/activity.service';
import type { CreateActivityBody } from '../types';

export default async function activitiesRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateActivityBody }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['appName', 'duration', 'startTime', 'endTime'],
        properties: {
          appName:     { type: 'string', minLength: 1 },
          windowTitle: { type: 'string' },
          url:         { type: 'string' },
          category:    { type: 'string' },
          duration:    { type: 'number', minimum: 0 },
          startTime:   { type: 'string' },
          endTime:     { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const activity = ActivityService.createActivity(request.body);
      return reply.code(201).send({ activity });
    },
  });

  app.get<{ Querystring: { date?: string; from?: string; to?: string } }>('/', async (request, reply) => {
    const { date, from, to } = request.query;
    if (from && to) {
      return reply.send({ activities: ActivityService.listActivitiesRange(from, to) });
    }
    const target = date ?? new Date().toISOString().slice(0, 10);
    return reply.send({ activities: ActivityService.listActivities(target) });
  });

  app.get('/dates', async (_request, reply) => {
    return reply.send({ dates: ActivityService.availableDates() });
  });

  app.delete<{ Params: { id: string }; Querystring: { date: string } }>('/:id', async (request, reply) => {
    const deleted = ActivityService.deleteActivity(
      Number(request.params.id),
      request.query.date
    );
    if (!deleted) return reply.code(404).send({ error: 'Activity not found' });
    return reply.code(204).send();
  });
}
