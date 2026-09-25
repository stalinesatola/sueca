// Aplica o esquema (lib/esquema.ts) à base de dados apontada por DATABASE_URL.
// Uso: npm run db:migrate  (localmente, com .env.local a definir DATABASE_URL)
// Em produção não é preciso: a rota /api/telegram/setup aplica o mesmo esquema.
// Idempotente — todas as instruções usam "if not exists".
import { aplicarEsquema } from '../lib/db';

aplicarEsquema()
  .then((n) => console.log(`Migração concluída: ${n} instruções aplicadas.`))
  .catch((err) => {
    console.error('Falha na migração:', err);
    process.exit(1);
  });
