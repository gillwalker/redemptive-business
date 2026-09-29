/*
  Site settings.
  After you deploy the Cloudflare Worker (see README.md), paste its URL below (no trailing slash).
*/
window.TAW_CONFIG = {
  // e.g. "https://taw-spotlight-gateway.YOURNAME.workers.dev"
  WORKER_URL: "https://taw-spotlight-gateway.gill-c11.workers.dev/",

  // Version tag stored with the draft. Bump it if you ever change field names
  // in a way that should discard members' half-finished drafts.
  DRAFT_VERSION: 1
};
