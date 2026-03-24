import type { FastifyInstance } from 'fastify';
import * as CategoryService from '../services/category.service';
import type { CreateCategoryRuleBody, UpdateCategoryRuleBody } from '../types';

export default async function categoryRulesRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    return reply.send({ rules: CategoryService.listRules() });
  });

  app.post<{ Body: CreateCategoryRuleBody }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['appName', 'category', 'isAutomatic'],
        properties: {
          appName:     { type: 'string', minLength: 1 },
          category:    { type: 'string' },
          keywords:    { type: 'array', items: { type: 'string' } },
          isAutomatic: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const rule = CategoryService.createRule(request.body);
      return reply.code(201).send({ rule });
    },
  });

  app.patch<{ Params: { id: string }; Body: UpdateCategoryRuleBody }>('/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          category:    { type: 'string' },
          keywords:    { type: 'array', items: { type: 'string' } },
          isAutomatic: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const rule = CategoryService.updateRule(request.params.id, request.body);
      if (!rule) return reply.code(404).send({ error: 'Rule not found' });
      return reply.send({ rule });
    },
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = CategoryService.deleteRule(request.params.id);
    if (!deleted) return reply.code(404).send({ error: 'Rule not found' });
    return reply.code(204).send();
  });

}
