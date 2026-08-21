$ErrorActionPreference = "Stop"
$env:ATLAS_BASE_URL = "https://erwintao21.github.io/zero-carbon-park-atlas/"
& npx.cmd playwright test --reporter=line
exit $LASTEXITCODE
