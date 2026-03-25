import type { FastifyInstance } from 'fastify';
import * as CategoryService from '../services/category.service';
import type { CreateCategoryRuleBody, UpdateCategoryRuleBody } from '../types';

const CATEGORY_ENUM = ['Work', 'Study', 'Entertainment', 'Other', 'Uncategorized'];

function normalizeKeywords(values?: string[]): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export default async function categoryRulesRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    return reply.send({ rules: CategoryService.listRules() });
  });

  app.post<{ Body: CreateCategoryRuleBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['appName', 'category', 'isAutomatic'],
          additionalProperties: false,
          properties: {
            appName: { type: 'string', minLength: 1 },
            category: { type: 'string', enum: CATEGORY_ENUM },
            isAutomatic: { type: 'boolean' },
            keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      const normalizedBody: CreateCategoryRuleBody = {
        appName: body.appName.trim(),
        category: body.category,
        isAutomatic: body.isAutomatic,
        keywords: normalizeKeywords(body.keywords),
      };

      if (!normalizedBody.appName) {
        return reply.status(400).send({ error: 'appName is required.' });
      }

      if (!normalizedBody.isAutomatic && (normalizedBody.keywords?.length ?? 0) === 0) {
        return reply.status(400).send({
          error: 'Manual rules must include at least one keyword.',
        });
      }

      if (normalizedBody.isAutomatic) {
        normalizedBody.keywords = [];
      }

      const rule = CategoryService.createRule(normalizedBody);
      return reply.status(201).send({ rule });
    }
  );

  app.patch<{ Params: { id: string }; Body: UpdateCategoryRuleBody }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            category: { type: 'string', enum: CATEGORY_ENUM },
            isAutomatic: { type: 'boolean' },
            keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;

      const existingRule = CategoryService.listRules().find((r) => r.id === id);
      if (!existingRule) {
        return reply.status(404).send({ error: 'Rule not found.' });
      }

      const nextIsAutomatic =
        body.isAutomatic !== undefined ? body.isAutomatic : existingRule.isAutomatic;

      const nextKeywords =
        body.keywords !== undefined
          ? normalizeKeywords(body.keywords)
          : existingRule.keywords ?? [];

      if (!nextIsAutomatic && nextKeywords.length === 0) {
        return reply.status(400).send({
          error: 'Manual rules must include at least one keyword.',
        });
      }

      const updateBody: UpdateCategoryRuleBody = {};

      if (body.category !== undefined) updateBody.category = body.category;
      if (body.isAutomatic !== undefined) updateBody.isAutomatic = body.isAutomatic;
      if (body.keywords !== undefined) {
        updateBody.keywords = nextIsAutomatic ? [] : nextKeywords;
      }

      const rule = CategoryService.updateRule(id, updateBody);

      if (!rule) {
        return reply.status(404).send({ error: 'Rule not found.' });
      }

      return reply.send({ rule });
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const deleted = CategoryService.deleteRule(id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Rule not found.' });
      }

      return reply.status(204).send();
    }
  );
}