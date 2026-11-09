#!/usr/bin/env bash
# Rolls a new backend image out to the existing Cloud Run services and job.
# It never creates resources or touches secrets: run infra/setup.sh first.
# Needs GCP_PROJECT_ID and GCP_REGION; IMAGE_TAG defaults to the short git SHA.
# Usage: GCP_PROJECT_ID=... GCP_REGION=... bash infra/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REPO_NAME="pixel-magic"
API_SERVICE="pixel-magic-api"
WORKER_SERVICE="pixel-magic-worker"
MIGRATE_JOB="pixel-magic-migrate"

step() { printf '\n==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
quiet() { "$@" >/dev/null 2>&1; }

[ -n "${GCP_PROJECT_ID:-}" ] || fail "GCP_PROJECT_ID is not set"
[ -n "${GCP_REGION:-}" ] || fail "GCP_REGION is not set"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD)}"
IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO_NAME}/backend:${IMAGE_TAG}"

# Every gcloud command targets this project, without touching gcloud's config.
export CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"

check_targets_exist() {
  step "1. Check that the services and job exist"
  local name
  for name in "$WORKER_SERVICE" "$API_SERVICE"; do
    quiet gcloud run services describe "$name" --region "$GCP_REGION" ||
      fail "Cloud Run service $name not found. Run infra/setup.sh first."
  done
  quiet gcloud run jobs describe "$MIGRATE_JOB" --region "$GCP_REGION" ||
    fail "Cloud Run job $MIGRATE_JOB not found. Run infra/setup.sh first."
}

build_image() {
  step "2. Build and push $IMAGE"
  gcloud builds submit "$ROOT/backend" --tag "$IMAGE"
}

run_migrations() {
  step "3. Migrate and seed (Cloud Run job $MIGRATE_JOB)"
  gcloud run jobs update "$MIGRATE_JOB" --image "$IMAGE" --region "$GCP_REGION"
  gcloud run jobs execute "$MIGRATE_JOB" --region "$GCP_REGION" --wait
}

roll_out() { # $1 = service; worker first, then the API
  step "$2. Roll out $1"
  gcloud run services update "$1" --image "$IMAGE" --region "$GCP_REGION"
  # After a manual rollback new revisions get 0% traffic; this moves forward.
  gcloud run services update-traffic "$1" --region "$GCP_REGION" --to-latest
}

main() {
  check_targets_exist
  build_image
  run_migrations
  roll_out "$WORKER_SERVICE" 4
  roll_out "$API_SERVICE" 5
  step "Done: $IMAGE"
}

main
