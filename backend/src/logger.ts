import winston from "winston";

const SEVERITY: Record<string, string> = {
  error: "ERROR",
  warn: "WARNING",
  info: "INFO",
  debug: "DEBUG",
};

const severity = winston.format((info) => {
  info.severity = SEVERITY[info.level] ?? info.level.toUpperCase();
  return info;
});

// Winston only serializes Error values it receives as the message; errors passed
// as metadata would otherwise be dumped as `{}`.
const serializeErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      info[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
  }
  return info;
});

export function createLogger(
  level: string,
  transports?: winston.transport[],
): winston.Logger {
  return winston.createLogger({
    level,
    levels: { error: 0, warn: 1, info: 2, debug: 3 },
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      serializeErrors(),
      severity(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: transports ?? [new winston.transports.Console()],
  });
}
