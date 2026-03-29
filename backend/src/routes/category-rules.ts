import type { FastifyInstance } from 'fastify';
import * as CategoryService from '../services/category.service';
import type {
  CreateCategoryRuleBody,
  UpdateCategoryRuleBody,
  RuleCondition,
} from '../types';

function normalizeKeywords(values?: string[]): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function normalizeConditions(values?: RuleCondition[]): RuleCondition[] {
  return (values ?? [])
    .map((condition) => ({
      field: condition.field,
      operator: condition.operator,
      value: condition.value.trim(),
    }))
    .filter((condition) => condition.value.length > 0);
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
            category: { type: 'string', minLength: 1 },
            isAutomatic: { type: 'boolean' },
            keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
            matchMode: {
              type: 'string',
              enum: ['any', 'all'],
            },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['field', 'operator', 'value'],
                additionalProperties: false,
                properties: {
                  field: {
                    type: 'string',
                    enum: ['windowTitle', 'url', 'hostname'],
                  },
                  operator: {
                    type: 'string',
                    enum: ['contains'],
                  },
                  value: { type: 'string', minLength: 1 },
                },
              },
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
        matchMode: body.matchMode ?? 'any',
        conditions: normalizeConditions(body.conditions),
      };

      if (!normalizedBody.appName) {
        return reply.status(400).send({ error: 'appName is required.' });
      }

      const hasKeywords = (normalizedBody.keywords?.length ?? 0) > 0;
      const hasConditions = (normalizedBody.conditions?.length ?? 0) > 0;

      if (!normalizedBody.isAutomatic && !hasKeywords && !hasConditions) {
        return reply.status(400).send({
          error: 'Manual rules must include at least one keyword or one advanced condition.',
        });
      }

      if (normalizedBody.isAutomatic) {
        normalizedBody.keywords = [];
        normalizedBody.conditions = [];
        normalizedBody.matchMode = 'any';
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
            category: { type: 'string', minLength: 1 },
            isAutomatic: { type: 'boolean' },
            keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
            matchMode: {
              type: 'string',
              enum: ['any', 'all'],
            },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['field', 'operator', 'value'],
                additionalProperties: false,
                properties: {
                  field: {
                    type: 'string',
                    enum: ['windowTitle', 'url', 'hostname'],
                  },
                  operator: {
                    type: 'string',
                    enum: ['contains'],
                  },
                  value: { type: 'string', minLength: 1 },
                },
              },
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

      const nextConditions =
        body.conditions !== undefined
          ? normalizeConditions(body.conditions)
          : existingRule.conditions ?? [];

      if (!nextIsAutomatic && nextKeywords.length === 0 && nextConditions.length === 0) {
        return reply.status(400).send({
          error: 'Manual rules must include at least one keyword or one advanced condition.',
        });
      }

      const updateBody: UpdateCategoryRuleBody = {};

      if (body.category !== undefined) updateBody.category = body.category;
      if (body.isAutomatic !== undefined) updateBody.isAutomatic = body.isAutomatic;
      if (body.matchMode !== undefined) updateBody.matchMode = body.matchMode;

      if (body.keywords !== undefined) {
        updateBody.keywords = nextIsAutomatic ? [] : nextKeywords;
      }

      if (body.conditions !== undefined) {
        updateBody.conditions = nextIsAutomatic ? [] : nextConditions;
      }

      if (nextIsAutomatic) {
        updateBody.keywords = [];
        updateBody.conditions = [];
        if (updateBody.matchMode === undefined) {
          updateBody.matchMode = 'any';
        }
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