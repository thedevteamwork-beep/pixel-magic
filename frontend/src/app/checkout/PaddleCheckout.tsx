"use client";

import { CheckoutEventNames, type PaddleEventData } from "@paddle/paddle-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InvalidLink } from "@/app/checkout/InvalidLink";
import { finishPath, parseTransactionId } from "@/lib/billing/purchase";
import { loadPaddle, PaddleUnavailableError } from "@/lib/billing/paddle";
import { Button, ButtonWithLink } from "@/ui/Button";

type Status = "loading" | "ready" | "unavailable" | "unconfigured" | "error";

export function PaddleCheckout() {
  const transactionId = parseTransactionId(useSearchParams().get("_ptxn"));
  if (!transactionId) return <InvalidLink />;
  return <CheckoutFrame transactionId={transactionId} />;
}

function CheckoutFrame({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  /** Bumped by "Try again" to re-run the open effect. */
  const [attempt, setAttempt] = useState(0);

  // Paddle's eventCallback is fixed at init, so it calls through this ref
  // to always reach the latest handler.
  const onEventRef = useRef<(e: PaddleEventData) => void>(() => {});
  useEffect(() => {
    onEventRef.current = (e) => {
      if (e.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
        router.replace(finishPath(transactionId));
      } else if (e.name === CheckoutEventNames.CHECKOUT_ERROR) {
        setStatus("error");
      }
    };
  }, [router, transactionId]);

  /** The transaction and attempt we already opened a frame for. */
  const openedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${transactionId}:${attempt}`;
    let current = true;
    loadPaddle({ onEvent: (e) => onEventRef.current(e) }).then(
      (paddle) => {
        if (!current || openedRef.current === key) return;
        openedRef.current = key;
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: "inline",
            frameTarget: "paddle-checkout",
            frameInitialHeight: 450,
            frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
            theme: "dark",
            variant: "one-page",
          },
        });
        setStatus("ready");
      },
      (error) => {
        if (!current) return;
        if (error instanceof PaddleUnavailableError) {
          setStatus(error.reason === "config" ? "unconfigured" : "unavailable");
        } else {
          setStatus("error");
        }
      },
    );
    return () => {
      current = false;
    };
  }, [transactionId, attempt]);

  return (
    <div>
      {status === "loading" && <p className="text-center text-subtle">Loading checkout…</p>}
      {status === "unconfigured" && (
        <div className="text-center">
          <p>Checkout isn&apos;t set up yet. Please try again later.</p>
          <div className="mt-4 flex justify-center gap-3">
            <ButtonWithLink href="/pricing" variant="outline">
              See plans
            </ButtonWithLink>
          </div>
        </div>
      )}
      {(status === "unavailable" || status === "error") && (
        <div className="text-center">
          <p>
            {status === "unavailable"
              ? "Checkout couldn't load. If you use an ad blocker, turn it off for this site and try again."
              : "Something went wrong with the payment form."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              onClick={() => {
                setStatus("loading");
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
            <ButtonWithLink href="/pricing" variant="outline">
              See plans
            </ButtonWithLink>
          </div>
        </div>
      )}
      <div className={status === "ready" ? "paddle-checkout" : "paddle-checkout hidden"} />
      <p className="mt-6 text-center text-sm text-muted">Payments are handled by Paddle.</p>
    </div>
  );
}
