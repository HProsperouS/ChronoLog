import './load-env';
import { buildApp } from './app';
import { startWeeklyInsightsScheduler } from './services/ai.service';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`ChronoLog API running at http://${HOST}:${PORT}`);
    startWeeklyInsightsScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
