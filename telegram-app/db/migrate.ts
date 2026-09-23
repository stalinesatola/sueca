// Aplica db/schema.sql à base de dados apontada por DATABASE_URL.
// Uso: npm run db:migrate  (localmente, com .env.local a definir DATABASE_URL)
// Idempotente — todas as instruções usam "if not exists", por isso é seguro correr
// outra vez após alterações ao schema.sql (adições aditivas).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Pool } from '@neondatabase/serverless';

const aqui = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL não definida. Define-a no .env.local ou no ambiente antes de correr a migração.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const schema = readFileSync(path.join(aqui, 'schema.sql'), 'utf8');

  // pool.query aceita várias instruções separadas por ';' numa só chamada
  // quando não há parâmetros — mas dividir por instrução dá melhor feedback
  // de progresso e isola o ponto de falha, se houver.
  const instrucoes = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const instrucao of instrucoes) {
    console.log('→', instrucao.slice(0, 72).replace(/\s+/g, ' ') + '…');
    await pool.query(instrucao);
  }
  await pool.end();
  console.log(`Migração concluída: ${instrucoes.length} instruções aplicadas.`);
}

main().catch((err) => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
