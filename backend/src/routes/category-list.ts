import type { FastifyInstance } from 'fastify';
import * as CategoriesService from '../services/category-list.service';

export default async function categoriesRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    return reply.send({ categories: CategoriesService.listCategories() });
  });

  app.post<{
    Body: {
      name: string;
      color: string;
      productivityType: 'productive' | 'non_productive' | 'neutral';
    };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'color', 'productivityType'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1 },
            color: { type: 'string', minLength: 1 },
            productivityType: {
              type: 'string',
              enum: ['productive', 'non_productive', 'neutral'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const created = CategoriesService.createCategory(
          request.body.name,
          request.body.color,
          request.body.productivityType
          
        );

        return reply.status(201).send({ category: created });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create category.';
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.patch<{
    Body: {
      name: string;
      color: string;
      productivityType: 'productive' | 'non_productive' | 'neutral';
    };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'color', 'productivityType'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1 },
            color: { type: 'string', minLength: 1 },
            productivityType: {
              type: 'string',
              enum: ['productive', 'non_productive', 'neutral'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const updated = CategoriesService.updateCategory(
        request.body.name,
        request.body.color,
        request.body.productivityType
      );

      if (!updated) {
        return reply.status(404).send({ error: 'Category not found.' });
      }

      return reply.send({ category: updated });
    }
  );

  app.delete<{
    Body: {
      name: string;
    };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const deleted = CategoriesService.deleteCategory(request.body.name);

        if (!deleted) {
          return reply.status(404).send({ error: 'Category not found.' });
        }

        return reply.status(204).send();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete category.';
        return reply.status(400).send({ error: message });
      }
    }
  );
}