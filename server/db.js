import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";

dotenv.config();

const pgPort = Number(process.env.PGPORT || 5432);

export const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: Number.isNaN(pgPort) ? 5432 : pgPort,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000),
});

export async function query(text, params) {
  return pool.query(text, params);
}

pool.on("error", (error) => {
  logger.error("pg_pool_error", { error });
});
