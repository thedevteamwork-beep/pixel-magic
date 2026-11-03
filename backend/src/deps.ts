import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import type { Knex } from "knex";
import type winston from "winston";
import { createFalClient, type FalClient } from "./clients/fal.js";
import {
  createFalKeySource,
  type FalPublicKeys,
} from "./clients/falWebhook.js";
import { createPaddleClient, type PaddleClient } from "./clients/paddle.js";
import {
  createSupabaseStorage,
  type StorageClient,
} from "./clients/storage.js";
import { createTaskQueue, type TaskQueue } from "./clients/tasks.js";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "./credits/defaultTieredCreditMapping.js";
import {
  validateCreditMapping,
  type TieredCreditMapping,
} from "./credits/tieredCredits.js";
import type { Config } from "./config.js";
import { createDb } from "./db/knex.js";
import type { Clock } from "./lib/time.js";
import { systemClock } from "./lib/time.js";
import { createLogger } from "./logger.js";
import { listModels } from "./models/registry.js";

export type Deps = {
  config: Config;
  db: Knex;
  logger: winston.Logger;
  paddle: PaddleClient;
  storage: StorageClient;
  fal: FalClient;
  falKeys: FalPublicKeys;
  queue: TaskQueue;
  clock: Clock;
  jwks: JWTVerifyGetKey;
  creditMapping: TieredCreditMapping;
};

export function createDeps(config: Config): Deps {
  // A bad mapping stops the app here, before it serves a request.
  const creditMapping = validateCreditMapping(
    config.TIERED_CREDIT_MAPPING ?? DEFAULT_TIERED_CREDIT_MAPPING,
    listModels(),
  );
  const logger = createLogger(config.LOG_LEVEL);
  return {
    config,
    db: createDb(config.DATABASE_URL, config.DB_POOL_MAX),
    logger,
    paddle: createPaddleClient(config),
    storage: createSupabaseStorage(config),
    fal: createFalClient(config),
    falKeys: createFalKeySource(config.FAL_JWKS_URL, systemClock),
    queue: createTaskQueue(config, logger),
    clock: systemClock,
    jwks: createRemoteJWKSet(
      new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    ),
    creditMapping,
  };
}
