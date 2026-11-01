import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import type { Knex } from "knex";
import type winston from "winston";
import type { PaddleClient } from "./clients/paddle.js";
import type { Config } from "./config.js";
import { createDb } from "./db/knex.js";
import type { Clock } from "./lib/time.js";
import { systemClock } from "./lib/time.js";
import { createLogger } from "./logger.js";

export type Deps = {
  config: Config;
  db: Knex;
  logger: winston.Logger;
  paddle: PaddleClient;
  clock: Clock;
  jwks: JWTVerifyGetKey;
};

export function createDeps(config: Config): Deps {
  return {
    config,
    db: createDb(config.DATABASE_URL, config.DB_POOL_MAX),
    logger: createLogger(config.LOG_LEVEL),
    paddle: {},
    clock: systemClock,
    jwks: createRemoteJWKSet(
      new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    ),
  };
}
