#!/usr/bin/env bash
set -euo pipefail

# PNL Gemini Live - deploy only after REVOKING the previously exposed API key.
# Run in authenticated Google Cloud Shell or on a trusted administrator computer.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="phuc-nguyen-library"
FUNCTION_URL="https://asia-southeast1-${PROJECT}.cloudfunctions.net/vanDapApi"

echo "PNL Gemini Live — Firebase Functions deployment"
echo "Project: $PROJECT"
echo "The old API key shared in chat must be revoked first."
echo "You will enter a NEW Gemini API key privately in the Firebase secret prompt."
if ! command -v firebase >/dev/null 2>&1; then
  echo "Firebase CLI is not installed. Installing..."
  npm install -g firebase-tools
fi
echo "Checking account and project..."
firebase projects:list --project "$PROJECT" >/dev/null
echo "Installing function dependencies..."
npm install --prefix functions --omit=dev
echo "Store the NEW key in Secret Manager (not in GitHub or HTML):"
firebase functions:secrets:set PNL_GEMINI_API_KEY --project "$PROJECT"
echo "Deploying the PNL oral exam backend..."
firebase deploy --only functions --project "$PROJECT"
echo "Checking service health:"
curl --fail --show-error --silent --max-time 20 "$FUNCTION_URL" || {
  echo
  echo "Function did not respond; inspect Firebase deployment logs."
  exit 1
}
echo
echo "Deployment complete. Test as lecturer before enabling any student class."
