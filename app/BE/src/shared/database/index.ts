export function isPostgres(): boolean {
  return (process.env.DB_DIALECT || '').toLowerCase() === 'postgres';
}

export { getDb } from './sqlite';
export { getPgPool } from './postgres';


