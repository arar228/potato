import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseDir = join(projectRoot, '.runtime', 'postgres');
await mkdir(databaseDir, { recursive: true });

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'arcade',
  password: 'arcade',
  port: 5432,
  persistent: true,
  onLog: () => {},
  onError: (error) => console.error('[local-postgres]', error),
});

if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
  console.log('[local-postgres] Initialising PostgreSQL 16 cluster...');
  await postgres.initialise();
}

await postgres.start();

const client = postgres.getPgClient();
await client.connect();
const databaseResult = await client.query("SELECT 1 FROM pg_database WHERE datname = 'arcade'");
await client.end();
if (databaseResult.rowCount === 0) await postgres.createDatabase('arcade');

console.log('[local-postgres] Ready on postgresql://arcade:arcade@localhost:5432/arcade');

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
};
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
await new Promise(() => {});
