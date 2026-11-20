#!/usr/bin/env bash
# Rebuilds the whole demo video: start the app, record every scene, compose the video.
#   npm run demo        (in another terminal: builds and serves http://localhost:3000)
#   bash demo/make_video.sh
set -euo pipefail
cd "$(dirname "$0")/.."
node demo/record/record.mjs "$@"
node demo/make_video.mjs
