import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import { paddleEnv } from "@/lib/env";

export class PaddleUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaddleUnavailableError";
  }
}

/** Loads Paddle.js. Rejects with PaddleUnavailableError if it can't be used. */
export async function loadPaddle(
  p: {
    init?: typeof initializePaddle;
    onEvent?: (e: PaddleEventData) => void;
  } = {},
): Promise<Paddle> {
  const init = p.init ?? initializePaddle;

  let env: ReturnType<typeof paddleEnv>;
  try {
    env = paddleEnv();
  } catch {
    throw new PaddleUnavailableError("Paddle is not configured");
  }

  let paddle: Paddle | undefined;
  try {
    paddle = await init({
      environment: env.environment,
      token: env.clientToken,
      eventCallback: p.onEvent,
    });
  } catch {
    throw new PaddleUnavailableError("Paddle.js failed to load");
  }
  if (!paddle) throw new PaddleUnavailableError("Paddle.js failed to load");
  return paddle;
}
