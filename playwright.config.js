const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/browser", timeout: 30000,
  use: { baseURL: process.env.ATLAS_BASE_URL || "http://127.0.0.1:8766/zero-carbon-park-atlas/", channel: process.env.CI ? undefined : "msedge", trace: "retain-on-failure" },
  webServer: process.env.ATLAS_BASE_URL ? undefined : { command: "python scripts/serve_subpath.py", url: "http://127.0.0.1:8766/zero-carbon-park-atlas/", reuseExistingServer: true }
});
