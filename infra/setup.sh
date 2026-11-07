#!/usr/bin/env bash
# Idempotent deploy of Pixel Magic to GCP: Cloud Run (API, worker, migrate job),
# Cloud Tasks queues, Cloud Scheduler jobs, Secret Manager, service accounts.
# Usage: bash infra/setup.sh [path/to/deploy.env]   (default infra/deploy.env)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/infra/deploy.env}"

REPO_NAME="pixel-magic"
API_SERVICE="pixel-magic-api"
WORKER_SERVICE="pixel-magic-worker"
MIGRATE_JOB="pixel-magic-migrate"
QUEUE_GENERATION="generation"
QUEUE_FINALIZATION="finalization"

# Secret env var -> Secret Manager name.
SECRET_NAMES=(
  "DATABASE_URL:pm-database-url"
  "DATABASE_MIGRATION_URL:pm-database-migration-url"
  "SUPABASE_SECRET_KEY:pm-supabase-secret-key"
  "FAL_KEY:pm-fal-key"
  "PADDLE_API_KEY:pm-paddle-api-key"
  "PADDLE_WEBHOOK_SECRET:pm-paddle-webhook-secret"
)

step() { printf '\n==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
quiet() { "$@" >/dev/null 2>&1; }

# ---- Settings ---------------------------------------------------------------

load_settings() {
  [ -f "$ENV_FILE" ] || fail "settings file not found: $ENV_FILE (copy infra/deploy.env.example)"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000}"
  PADDLE_ENV="${PADDLE_ENV:-sandbox}"
  STORAGE_BUCKET_INPUTS="${STORAGE_BUCKET_INPUTS:-inputs}"
  STORAGE_BUCKET_OUTPUTS="${STORAGE_BUCKET_OUTPUTS:-outputs}"
  FREE_PLAN_NAME="${FREE_PLAN_NAME:-free}"
  FAL_WEBHOOK_USER_ID="${FAL_WEBHOOK_USER_ID:-}"
  TIERED_CREDIT_MAPPING="${TIERED_CREDIT_MAPPING:-}"
}

require_settings() {
  local name
  for name in GCP_PROJECT_ID GCP_REGION SUPABASE_URL DATABASE_URL \
    DATABASE_MIGRATION_URL SUPABASE_SECRET_KEY FAL_KEY PADDLE_API_KEY \
    PADDLE_WEBHOOK_SECRET; do
    [ -n "${!name:-}" ] || fail "required value is empty: $name (set it in $ENV_FILE)"
  done
}

# ---- Small helpers ----------------------------------------------------------

sha256_of() { # stdin -> hex digest
  if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi
}

sa_email() { printf '%s@%s.iam.gserviceaccount.com' "$1" "$GCP_PROJECT_ID"; }

# Writes KEY: "value" lines (JSON-style quoting) for --env-vars-file.
yaml_line() {
  local value="${2//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s: "%s"\n' "$1" "$value"
}

write_env_file() { # $1 = MODE (api|worker), prints the file path
  local file
  file="$(mktemp)"
  {
    yaml_line MODE "$1"
    yaml_line NODE_ENV production
    yaml_line TASKS_MODE cloud
    yaml_line GCP_PROJECT_ID "$GCP_PROJECT_ID"
    yaml_line GCP_REGION "$GCP_REGION"
    yaml_line TASKS_SERVICE_ACCOUNT "$(sa_email tasks-sa)"
    yaml_line API_PUBLIC_URL "$API_URL"
    yaml_line WORKER_URL "$WORKER_URL"
    yaml_line SUPABASE_URL "$SUPABASE_URL"
    yaml_line CORS_ORIGINS "$CORS_ORIGINS"
    yaml_line PADDLE_ENV "$PADDLE_ENV"
    yaml_line STORAGE_BUCKET_INPUTS "$STORAGE_BUCKET_INPUTS"
    yaml_line STORAGE_BUCKET_OUTPUTS "$STORAGE_BUCKET_OUTPUTS"
    yaml_line FREE_PLAN_NAME "$FREE_PLAN_NAME"
    yaml_line DB_POOL_MAX 5
    [ -z "$FAL_WEBHOOK_USER_ID" ] || yaml_line FAL_WEBHOOK_USER_ID "$FAL_WEBHOOK_USER_ID"
    [ -z "$TIERED_CREDIT_MAPPING" ] || yaml_line TIERED_CREDIT_MAPPING "$TIERED_CREDIT_MAPPING"
  } >"$file"
  printf '%s' "$file"
}

secrets_flag() { # ENV=secret:latest,... for every secret
  local pair out=""
  for pair in "${SECRET_NAMES[@]}"; do
    out+="${out:+,}${pair%%:*}=${pair#*:}:latest"
  done
  printf '%s' "$out"
}

# ---- Steps ------------------------------------------------------------------

check_gcloud() {
  step "1. Check gcloud and enable services"
  command -v gcloud >/dev/null 2>&1 || fail "gcloud is not installed"
  [ -n "$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" ] ||
    fail "gcloud is not logged in (run: gcloud auth login)"
  quiet gcloud projects describe "$GCP_PROJECT_ID" || fail "project not found or no access: $GCP_PROJECT_ID"
  gcloud config set project "$GCP_PROJECT_ID" >/dev/null 2>&1
  PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com cloudtasks.googleapis.com \
    cloudscheduler.googleapis.com secretmanager.googleapis.com \
    iam.googleapis.com --project "$GCP_PROJECT_ID"
  # Cloud Run's deterministic URL format, known before the first deploy.
  API_URL="https://${API_SERVICE}-${PROJECT_NUMBER}.${GCP_REGION}.run.app"
  WORKER_URL="https://${WORKER_SERVICE}-${PROJECT_NUMBER}.${GCP_REGION}.run.app"
}

create_artifact_repo() {
  step "2. Artifact Registry repository"
  quiet gcloud artifacts repositories describe "$REPO_NAME" --location "$GCP_REGION" ||
    gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker \
      --location "$GCP_REGION" --description="Pixel Magic images"
}

build_image() {
  step "3. Build and push the image"
  local tag
  tag="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
  if [ -n "$(git -C "$ROOT" status --porcelain -- backend 2>/dev/null)" ]; then
    tag="${tag}-dirty-$(date +%H%M%S)"
  fi
  IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO_NAME}/backend:${tag}"
  gcloud builds submit "$ROOT/backend" --tag "$IMAGE" --project "$GCP_PROJECT_ID"
}

create_service_account() { # $1 = short name
  quiet gcloud iam service-accounts describe "$(sa_email "$1")" ||
    gcloud iam service-accounts create "$1" --display-name "Pixel Magic $1"
}

store_secret() { # $1 = Secret Manager name, $2 = value; new version only if changed
  local name="$1" value="$2" current=""
  if quiet gcloud secrets describe "$name"; then
    current="$(gcloud secrets versions access latest --secret "$name" 2>/dev/null | sha256_of || true)"
    if [ "$current" = "$(printf '%s' "$value" | sha256_of)" ]; then
      echo "secret $name unchanged"
      return
    fi
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
    echo "secret $name: new version added"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=- >/dev/null
    echo "secret $name: created"
  fi
}

create_accounts_and_secrets() {
  step "4. Service accounts, secrets and IAM"
  local sa pair name var
  for sa in api-sa worker-sa tasks-sa scheduler-sa; do create_service_account "$sa"; done
  for pair in "${SECRET_NAMES[@]}"; do
    name="${pair#*:}"
    var="${pair%%:*}"
    store_secret "$name" "${!var}"
    for sa in api-sa worker-sa; do
      gcloud secrets add-iam-policy-binding "$name" \
        --member "serviceAccount:$(sa_email "$sa")" \
        --role roles/secretmanager.secretAccessor >/dev/null
    done
  done
  for sa in api-sa worker-sa; do
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
      --member "serviceAccount:$(sa_email "$sa")" \
      --role roles/cloudtasks.enqueuer --condition=None >/dev/null
    gcloud iam service-accounts add-iam-policy-binding "$(sa_email tasks-sa)" \
      --member "serviceAccount:$(sa_email "$sa")" \
      --role roles/iam.serviceAccountUser >/dev/null
  done
  # run.invoker for tasks-sa and scheduler-sa is bound on the worker in step 7,
  # once the worker service exists.
}

upsert_queue() { # $1 name, $2 max attempts, $3 max concurrent dispatches
  local verb=create
  quiet gcloud tasks queues describe "$1" --location "$GCP_REGION" && verb=update
  gcloud tasks queues "$verb" "$1" --location "$GCP_REGION" \
    --max-attempts "$2" --min-backoff 10s --max-backoff 300s --max-doublings 4 \
    --max-concurrent-dispatches "$3"
}

create_queues() {
  step "5. Cloud Tasks queues"
  upsert_queue "$QUEUE_GENERATION" 5 10
  upsert_queue "$QUEUE_FINALIZATION" 10 5
}

run_migrations() {
  step "6. Migrate and seed (Cloud Run job $MIGRATE_JOB)"
  # Plain node: tsx is not in the image. The seed reads DATABASE_URL, so both
  # variables get the session-pooler URL here.
  gcloud run jobs deploy "$MIGRATE_JOB" --image "$IMAGE" --region "$GCP_REGION" \
    --service-account "$(sa_email worker-sa)" \
    --command sh --args=-c,"node dist/db/migrate.js && node dist/db/seeds/run.js" \
    --set-secrets "DATABASE_MIGRATION_URL=pm-database-migration-url:latest,DATABASE_URL=pm-database-migration-url:latest" \
    --set-env-vars NODE_ENV=production \
    --max-retries 0 --task-timeout 600s --cpu 1 --memory 512Mi
  gcloud run jobs execute "$MIGRATE_JOB" --region "$GCP_REGION" --wait
}

deploy_worker() {
  step "7. Deploy $WORKER_SERVICE (private)"
  local env_file
  env_file="$(write_env_file worker)"
  gcloud run deploy "$WORKER_SERVICE" --image "$IMAGE" --region "$GCP_REGION" \
    --service-account "$(sa_email worker-sa)" --no-allow-unauthenticated \
    --env-vars-file "$env_file" --set-secrets "$(secrets_flag)" \
    --timeout 900 --cpu 1 --memory 1Gi --concurrency 8 \
    --min-instances 0 --max-instances 5
  rm -f "$env_file"
  # Only the tasks and scheduler accounts may call the worker.
  local sa
  for sa in tasks-sa scheduler-sa; do
    gcloud run services add-iam-policy-binding "$WORKER_SERVICE" --region "$GCP_REGION" \
      --member "serviceAccount:$(sa_email "$sa")" --role roles/run.invoker >/dev/null
  done
}

deploy_api() {
  step "8. Deploy $API_SERVICE (public)"
  local env_file
  env_file="$(write_env_file api)"
  gcloud run deploy "$API_SERVICE" --image "$IMAGE" --region "$GCP_REGION" \
    --service-account "$(sa_email api-sa)" --allow-unauthenticated \
    --env-vars-file "$env_file" --set-secrets "$(secrets_flag)" \
    --timeout 300 --cpu 1 --memory 512Mi --concurrency 80 \
    --min-instances 0 --max-instances 10
  rm -f "$env_file"
}

check_service_url() { # $1 service, $2 expected URL
  local actual urls
  actual="$(gcloud run services describe "$1" --region "$GCP_REGION" --format='value(status.url)')"
  [ "$actual" = "$2" ] && return
  # status.url may use the older URL form; accept the expected one if listed.
  urls="$(gcloud run services describe "$1" --region "$GCP_REGION" \
    --format="value(metadata.annotations['run.googleapis.com/urls'])")"
  case "$urls" in *"$2"*) return ;; esac
  fail "$1 URL mismatch: expected $2 but Cloud Run reports $actual"
}

confirm_urls() {
  step "9. Confirm service URLs"
  check_service_url "$WORKER_SERVICE" "$WORKER_URL"
  check_service_url "$API_SERVICE" "$API_URL"
  echo "API_PUBLIC_URL and WORKER_URL match the deployed services"
}

upsert_scheduler_job() { # $1 name, $2 cron, $3 path
  local verb=create
  quiet gcloud scheduler jobs describe "$1" --location "$GCP_REGION" && verb=update
  gcloud scheduler jobs "$verb" http "$1" --location "$GCP_REGION" \
    --schedule "$2" --time-zone UTC --http-method POST --uri "${WORKER_URL}$3" \
    --oidc-service-account-email "$(sa_email scheduler-sa)" \
    --oidc-token-audience "$WORKER_URL"
}

create_scheduler_jobs() {
  step "10. Cloud Scheduler jobs"
  upsert_scheduler_job pixel-magic-reconcile "*/5 * * * *" /tasks/reconcile
  upsert_scheduler_job pixel-magic-billing-sweep "0 * * * *" /tasks/billing-sweep
}

print_summary() {
  step "11. Done"
  cat <<EOT
API URL:         $API_URL
Worker URL:      $WORKER_URL (private)
Paddle webhook:  $API_URL/webhooks/paddle

Left to do by hand:
  [ ] Paddle: add a notification destination with the webhook URL above,
      subscribe to subscription.* and transaction.*, put its secret in
      PADDLE_WEBHOOK_SECRET in $ENV_FILE and run this script again.
  [ ] Vercel: set NEXT_PUBLIC_API_URL=$API_URL (plus the two Supabase
      NEXT_PUBLIC_* values), deploy, then add the Vercel URL to CORS_ORIGINS
      in $ENV_FILE and run this script again.
  [ ] Supabase: Auth > URL Configuration: set the Site URL and add redirect URLs
      http://localhost:3000/auth/callback and <vercel-url>/auth/callback.
EOT
  [ -n "$FAL_WEBHOOK_USER_ID" ] ||
    echo "  [ ] FAL_WEBHOOK_USER_ID is empty: set it once known (see backend/README.md)."
}

main() {
  load_settings
  require_settings
  check_gcloud
  create_artifact_repo
  build_image
  create_accounts_and_secrets
  create_queues
  run_migrations
  deploy_worker
  deploy_api
  confirm_urls
  create_scheduler_jobs
  print_summary
}

main
