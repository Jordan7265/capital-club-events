# Entry points used by CI and review workflows. Each target wraps an npm script.
.PHONY: build check lint test

build:
	npm run build

# Types and Astro template diagnostics.
check:
	npm run check

# Project rules: no network calls, no API routes, no em dashes, no report.html, scripts parse.
lint:
	npm run lint

# Build, verify the three noindex layers, then run the Playwright suite (it serves dist/ itself).
test: build
	npm run verify:noindex
	npm run test:e2e
