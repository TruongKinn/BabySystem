#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-}"
if [[ -z "${BASE_REF}" ]]; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    BASE_REF="$(git merge-base origin/main HEAD)"
  elif git rev-parse --verify origin/master >/dev/null 2>&1; then
    BASE_REF="$(git merge-base origin/master HEAD)"
  elif git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    BASE_REF="HEAD~1"
  else
    echo "[api-permission-rule] Skip: repository has only one commit."
    exit 0
  fi
fi

RANGE="${BASE_REF}...HEAD"
CONTROLLER_GLOB='codebase/backend/**/src/main/java/**/*Controller.java'
PERMISSION_MIGRATION_GLOB='codebase/backend/authentication-service/src/main/resources/db/migration/*.sql'

added_api_mappings=$(git diff --unified=0 "${RANGE}" -- "${CONTROLLER_GLOB}" \
  | grep -E '^\+\s{4}@(Get|Post|Put|Delete|Patch|Request)Mapping' || true)

if [[ -z "${added_api_mappings}" ]]; then
  echo "[api-permission-rule] Pass: no new API mapping detected."
  exit 0
fi

changed_permission_migrations=$(git diff --name-only "${RANGE}" -- "${PERMISSION_MIGRATION_GLOB}" || true)
if [[ -z "${changed_permission_migrations}" ]]; then
  echo "[api-permission-rule] FAIL: new API mapping detected but no permission migration file changed."
  echo "[api-permission-rule] Required path: ${PERMISSION_MIGRATION_GLOB}"
  exit 1
fi

permission_diff_lines=$(git diff --unified=0 "${RANGE}" -- "${PERMISSION_MIGRATION_GLOB}" \
  | grep -E '^\+.*(tbl_permission|tbl_role_has_permission|API:|api_path)' || true)

if [[ -z "${permission_diff_lines}" ]]; then
  echo "[api-permission-rule] FAIL: permission migration changed but no permission mapping content found."
  echo "[api-permission-rule] Add INSERT/UPDATE for tbl_permission and tbl_role_has_permission."
  exit 1
fi

echo "[api-permission-rule] Pass: detected new API mapping and matching permission migration updates."
