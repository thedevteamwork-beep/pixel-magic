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

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

step() { printf '\n==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
quiet() { "$@" >/dev/null 2>&1; }

# ---- Settings ---------------------------------------------------------------

load_settings() {
  [ -f "$ENV_FILE" ] || fail "settings file not found: $ENV_FILE (copy infra/deploy.env.example)"
  # Plain shell variables only: nothing from the file is exported, so the
  # secrets never reach child processes.
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  # A secret the caller's shell already exported stays exported after source.
  local pair
  for pair in "${SECRET_NAMES[@]}"; do export -n "${pair%%:*}"; done
  CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000}"
  PADDLE_ENV="${PADDLE_ENV:-sandbox}"
  STORAGE_BUCKET_INPUTS="${STORAGE_BUCKET_INPUTS:-inputs}"
  STORAGE_BUCKET_OUTPUTS="${STORAGE_BUCKET_OUTPUTS:-outputs}"
  FREE_PLAN_NAME="${FREE_PLAN_NAME:-free}"
  FAL_WEBHOOK_USER_ID="${FAL_WEBHOOK_USER_ID:-}"
  TIERED_CREDIT_MAPPING="${TIERED_CREDIT_MAPPING:-}"
  # Optional: owner/name of the GitHub repository allowed to deploy from main.
  GITHUB_REPO="${GITHUB_REPO:-}"
}

require_settings() {
  local name
  for name in GCP_PROJECT_ID GCP_REGION SUPABASE_URL DATABASE_URL \
    DATABASE_MIGRATION_URL SUPABASE_SECRET_KEY FAL_KEY PADDLE_API_KEY \
    PADDLE_WEBHOOK_SECRET; do
    [ -n "${!name:-}" ] || fail "required value is empty: $name (set it in $ENV_FILE)"
  done
  case "$GITHUB_REPO" in
    "" | */*) ;;
    *) fail "GITHUB_REPO must look like owner/name (set it in $ENV_FILE)" ;;
  esac
}

# ---- Small helpers ----------------------------------------------------------

# Retries a command a few times: a just-created service account may not be
# visible to IAM yet.
retry() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    "$@" && return 0
    sleep 5
  done
  return 1
}

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
  local file="$TMP_DIR/env-$1.yaml"
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

secrets_flag() { # ENV=secret:latest,... for the services (not the migration URL)
  local pair out=""
  for pair in "${SECRET_NAMES[@]}"; do
    [ "${pair%%:*}" = DATABASE_MIGRATION_URL ] && continue
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
  PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com cloudtasks.googleapis.com \
    cloudscheduler.googleapis.com secretmanager.googleapis.com \
    iam.googleapis.com compute.googleapis.com --project "$GCP_PROJECT_ID"
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

# The identity `gcloud builds submit` runs builds as.
build_identity_email() {
  local build_sa
  build_sa="$(gcloud builds get-default-service-account --format='value(serviceAccountEmail)')"
  build_sa="${build_sa##*/}"
  [ -n "$build_sa" ] || fail "could not find the default Cloud Build service account"
  printf '%s' "$build_sa"
}

# Newer projects give the default build identity no roles; grant what a build needs.
grant_build_identity() {
  local build_sa bucket="${GCP_PROJECT_ID}_cloudbuild"
  build_sa="$(build_identity_email)"
  # The Compute Engine default account only exists once compute.googleapis.com is on.
  case "$build_sa" in
    *-compute@developer.gserviceaccount.com)
      retry quiet gcloud iam service-accounts describe "$build_sa" ||
        fail "Compute Engine default service account not found ($build_sa) - enable compute.googleapis.com and re-run"
      ;;
  esac
  quiet gcloud storage buckets describe "gs://$bucket" ||
    gcloud storage buckets create "gs://$bucket" --location "$GCP_REGION"
  retry gcloud artifacts repositories add-iam-policy-binding "$REPO_NAME" \
    --location "$GCP_REGION" --member "serviceAccount:$build_sa" \
    --role roles/artifactregistry.writer >/dev/null
  retry gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member "serviceAccount:$build_sa" --role roles/logging.logWriter \
    --condition=None >/dev/null
  retry gcloud storage buckets add-iam-policy-binding "gs://$bucket" \
    --member "serviceAccount:$build_sa" --role roles/storage.objectViewer >/dev/null
}

build_image() {
  step "3. Build and push the image"
  local tag
  tag="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
  if [ -n "$(git -C "$ROOT" status --porcelain -- backend 2>/dev/null)" ]; then
    tag="${tag}-dirty-$(date +%H%M%S)"
  fi
  IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO_NAME}/backend:${tag}"
  grant_build_identity
  # IAM grants can take a minute to apply, so a first 403 gets one retry.
  if ! gcloud builds submit "$ROOT/backend" --tag "$IMAGE" --project "$GCP_PROJECT_ID"; then
    echo "Build failed; waiting 60 s for IAM grants to apply, then retrying once"
    sleep 60
    gcloud builds submit "$ROOT/backend" --tag "$IMAGE" --project "$GCP_PROJECT_ID"
  fi
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
    # The migration URL is only for the migrate job, which runs as worker-sa.
    for sa in api-sa worker-sa; do
      [ "$var" = DATABASE_MIGRATION_URL ] && [ "$sa" = api-sa ] && continue
      retry gcloud secrets add-iam-policy-binding "$name" \
        --member "serviceAccount:$(sa_email "$sa")" \
        --role roles/secretmanager.secretAccessor >/dev/null
    done
  done
  for sa in api-sa worker-sa; do
    retry gcloud iam service-accounts add-iam-policy-binding "$(sa_email tasks-sa)" \
      --member "serviceAccount:$(sa_email "$sa")" \
      --role roles/iam.serviceAccountUser >/dev/null
  done
  # cloudtasks.enqueuer is bound per queue in step 5. run.invoker for tasks-sa and scheduler-sa is bound on the worker in step 7,
  # once the worker service exists.
}

upsert_queue() { # $1 name, $2 max attempts, $3 max concurrent dispatches
  local verb=create
  quiet gcloud tasks queues describe "$1" --location "$GCP_REGION" && verb=update
  gcloud tasks queues "$verb" "$1" --location "$GCP_REGION" \
    --max-attempts "$2" --min-backoff 10s --max-backoff 300s --max-doublings 4 \
    --max-concurrent-dispatches "$3"
  # Enqueue rights on this queue only.
  local sa
  for sa in api-sa worker-sa; do
    retry gcloud tasks queues add-iam-policy-binding "$1" --location "$GCP_REGION" \
      --member "serviceAccount:$(sa_email "$sa")" --role roles/cloudtasks.enqueuer >/dev/null
  done
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

# After a manual rollback new revisions get 0% traffic; a re-run moves forward.
send_traffic_to_latest() {
  gcloud run services update-traffic "$1" --region "$GCP_REGION" --to-latest
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
  send_traffic_to_latest "$WORKER_SERVICE"
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
  send_traffic_to_latest "$API_SERVICE"
  check_api_is_public
}

# gcloud only warns when it cannot make the API public, so check the policy.
check_api_is_public() {
  local policy
  policy="$(gcloud run services get-iam-policy "$API_SERVICE" --region "$GCP_REGION" \
    --flatten='bindings[].members' \
    --filter='bindings.role=roles/run.invoker AND bindings.members=allUsers' \
    --format='value(bindings.members)')"
  [ -z "$policy" ] || return 0
  fail "$API_SERVICE is not public (no allUsers run.invoker). An organisation policy such as Domain Restricted Sharing (iam.allowedPolicyMemberDomains) probably blocks it; allow allUsers for this project or change the policy, then run again."
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

# Lets GitHub Actions in $GITHUB_REPO (main branch only) deploy as deployer-sa,
# with no stored key: Workload Identity Federation.
setup_github_deploy() {
  step "11. GitHub Actions deploy access (Workload Identity Federation)"
  local pool=github provider=github-actions deployer pool_name build_sa sa bucket
  deployer="$(sa_email deployer-sa)"
  bucket="${GCP_PROJECT_ID}_cloudbuild"
  gcloud services enable iamcredentials.googleapis.com sts.googleapis.com \
    --project "$GCP_PROJECT_ID"

  quiet gcloud iam workload-identity-pools describe "$pool" --location global ||
    gcloud iam workload-identity-pools create "$pool" --location global \
      --display-name "GitHub"
  # The condition is kept in sync on every run, so changing GITHUB_REPO applies.
  local provider_verb=create-oidc
  quiet gcloud iam workload-identity-pools providers describe "$provider" \
    --workload-identity-pool "$pool" --location global && provider_verb=update-oidc
  gcloud iam workload-identity-pools providers "$provider_verb" "$provider" \
    --workload-identity-pool "$pool" --location global \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository=='${GITHUB_REPO}' && assertion.ref=='refs/heads/main'"
  GCP_WIF_PROVIDER="$(gcloud iam workload-identity-pools providers describe "$provider" \
    --workload-identity-pool "$pool" --location global --format='value(name)')"

  create_service_account deployer-sa
  pool_name="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${pool}"
  retry gcloud iam service-accounts add-iam-policy-binding "$deployer" \
    --member "principalSet://iam.googleapis.com/${pool_name}/attribute.repository/${GITHUB_REPO}" \
    --role roles/iam.workloadIdentityUser >/dev/null

  local role
  for role in roles/run.developer roles/cloudbuild.builds.editor \
    roles/serviceusage.serviceUsageConsumer; do
    retry gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
      --member "serviceAccount:$deployer" --role "$role" --condition=None >/dev/null
  done
  # Uploads the build source; this bucket only.
  retry gcloud storage buckets add-iam-policy-binding "gs://$bucket" \
    --member "serviceAccount:$deployer" --role roles/storage.admin >/dev/null
  # Deploying a revision acts as the runtime accounts; these only.
  for sa in api-sa worker-sa; do
    retry gcloud iam service-accounts add-iam-policy-binding "$(sa_email "$sa")" \
      --member "serviceAccount:$deployer" --role roles/iam.serviceAccountUser >/dev/null
  done
  # `gcloud builds submit` acts as the Cloud Build default identity.
  build_sa="$(build_identity_email)"
  retry gcloud iam service-accounts add-iam-policy-binding "$build_sa" \
    --member "serviceAccount:$deployer" --role roles/iam.serviceAccountUser >/dev/null
}

print_summary() {
  step "12. Done"
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
  [ ] Supabase: Auth > URL Configuration: set the Site URL to the production
      URL (https://<your-vercel-domain>) and add the redirect URLs
      http://localhost:3000/** and https://<your-vercel-domain>/**
      (wildcards are required: the app sends /auth/callback?next=..., and
      exact entries never match the query string).
EOT
  if [ -n "$GITHUB_REPO" ]; then
    cat <<EOT

GitHub: set these repository variables (Settings > Secrets and variables >
Actions > Variables, not secrets) in $GITHUB_REPO. Pushes to main that change
backend/ or infra/ then deploy through .github/workflows/deploy.yml.
  GCP_PROJECT_ID    $GCP_PROJECT_ID
  GCP_REGION        $GCP_REGION
  GCP_WIF_PROVIDER  $GCP_WIF_PROVIDER
  GCP_DEPLOY_SA     $(sa_email deployer-sa)
EOT
  fi
  if [ "$PADDLE_WEBHOOK_SECRET" = pending ]; then
    echo
    echo "WARNING: PADDLE_WEBHOOK_SECRET is the placeholder 'pending', so Paddle webhooks are rejected until you replace it."
  fi
  [ -n "$FAL_WEBHOOK_USER_ID" ] ||
    echo "  [ ] FAL_WEBHOOK_USER_ID is empty: set it once known (see backend/README.md)."
}

main() {
  load_settings
  require_settings
  # Every gcloud command targets this project, without touching gcloud's config.
  export CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"
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
  [ -z "$GITHUB_REPO" ] || setup_github_deploy
  print_summary
}

main
