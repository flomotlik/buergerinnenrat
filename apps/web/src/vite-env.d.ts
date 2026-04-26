/// <reference types="vite/client" />

// Build-time globals injected via vite.config.ts `define` (see Task 3 of
// issue #54). These are static string literals replaced at bundle-build
// time, not runtime variables.
declare const __GIT_SHA__: string;
declare const __BUILD_DATE__: string;
