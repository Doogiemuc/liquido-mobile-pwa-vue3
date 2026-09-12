#!/bin/sh
# Run a Cypress e2e spec locally, directly against this machine's own Caddy - no dependency on
# public DNS at all. This only makes sense run ON GISMO itself (the box that actually serves
# https://liquido.dynv6.net): Claude Code sessions in this project run there directly, not via
# SSH from a laptop - see CLAUDE.md's [[gismo-deployment-setup]] note.
#
# Why this exists: liquido.dynv6.net's public DNS record has repeatedly gone stale (the FritzBox's
# DDNS client doesn't reliably update it when the home connection's public IP rotates - see
# AGENTS.md/CLAUDE.md). That only affects reaching the site from OUTSIDE this machine. Local runs
# don't need to go anywhere near the public internet or its DNS at all.
#
# Technique: an unprivileged user+mount namespace (`unshare -Urm`) bind-mounts a private copy of
# /etc/hosts (the real entries, plus `127.0.0.1 liquido.dynv6.net`) over /etc/hosts inside that
# namespace only - the real system /etc/hosts is never touched. Cypress's browser then resolves
# liquido.dynv6.net straight to 127.0.0.1, so requests hit Caddy directly on this host, with the
# correct Host/SNI header for Caddy's site block to match (https://liquido.dynv6.net { ... } in
# /etc/caddy/Caddyfile) - it just happens to be the same machine on the other end.
#
# For genuine outside-the-network verification (proving the public DNS + FritzBox port-forwarding
# + Caddy's real TLS cert all actually work end to end), that has to run from somewhere else
# entirely - a `Agent(isolation: "remote")` cloud agent, not this script.
#
# Usage:
#   ./deploy/test-e2e-local.sh                              # full happy-case.cy.js
#   ./deploy/test-e2e-local.sh tests/e2e/specs/polly.cy.js   # a specific spec

set -e

SPEC="${1:-tests/e2e/specs/happy-case.cy.js}"
HOSTS_FILE=$(mktemp)
cat /etc/hosts > "$HOSTS_FILE"
echo "127.0.0.1 liquido.dynv6.net" >> "$HOSTS_FILE"

echo "Running $SPEC locally against this machine's own Caddy (liquido.dynv6.net -> 127.0.0.1) ..."

# DISPLAY: Cypress's own internal Electron shell needs a real X display or Xvfb even for a fully
# headless run (the browser under test needs neither) - GISMO already has one via its desktop
# session (lightdm), consistently at :1 in practice. Override with an env var if that ever changes.
unshare -Urm sh -c "
	mount --bind '$HOSTS_FILE' /etc/hosts
	export DISPLAY=\"\${DISPLAY:-:1}\"
	npx cypress run --config-file cypress.config.remote.js --spec '$SPEC'
"

rm -f "$HOSTS_FILE"
