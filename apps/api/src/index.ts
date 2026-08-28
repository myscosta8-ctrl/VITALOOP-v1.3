/**
 * Entrypoint da API. Falha rápido em configuração inválida.
 */

import { loadConfig } from '@vitaloop/config';
import { buildServer } from './server.js';

const config = loadConfig();
const { app } = buildServer(config);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

app
  .listen({ port: config.env.PORT, host: '0.0.0.0' })
  .then((addr) => app.log.info({ addr }, 'vitaloop api listening'))
  .catch((err) => {
    app.log.error({ err }, 'failed to start');
    process.exit(1);
  });
