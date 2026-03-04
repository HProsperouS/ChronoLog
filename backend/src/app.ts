import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import activitiesRoutes from './routes/activities';
import categoryRulesRoutes from './routes/category-rules';
import statsRoutes from './routes/stats';
import insightsRoutes from './routes/insights';

export async function buildApp() {
  const app = Fastify({
    ignoreTrailingSlash: true,
    logger: {
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow any localhost origin (any port) and requests with no origin (curl, Postman)
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  await app.register(activitiesRoutes,    { prefix: '/api/activities' });
  await app.register(categoryRulesRoutes, { prefix: '/api/category-rules' });
  await app.register(statsRoutes,         { prefix: '/api/stats' });
  await app.register(insightsRoutes,      { prefix: '/api/insights' });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
