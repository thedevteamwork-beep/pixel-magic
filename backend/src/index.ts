import { createApp } from "./api/server.js";
import { loadConfig } from "./config.js";
import { createDeps } from "./deps.js";
import { createLogger } from "./logger.js";
import { createWorkerApp } from "./worker/server.js";

let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  createLogger("error").error("Invalid configuration", { err });
  process.exit(1);
}

const deps = createDeps(config);
const app = config.MODE === "api" ? createApp(deps) : createWorkerApp(deps);
app.listen(config.PORT, () => {
  deps.logger.info("Server listening", {
    mode: config.MODE,
    port: config.PORT,
  });
});
