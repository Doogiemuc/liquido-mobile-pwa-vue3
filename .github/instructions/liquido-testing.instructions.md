---
applyTo: '**/*.{js,ts,vue,cy.js}'
description: 'LIQUIDO testing: points to the canonical testing guide and agent rules'
---

# LIQUIDO — Testing

The authoritative testing guide is **[docs/liquido-testing.md](../../docs/liquido-testing.md)**:
quick start from a fresh clone, the environments DEV / TEST / MOCK / INT and what to configure where,
the shared test data and its contract, all test suites, and the mock backend.

The hard rules for writing tests are in **[AGENTS.md](../../AGENTS.md) §7** — above all: never assert
on text displayed in the UI; use DOM ids and `data-*` attributes.

This file only points there, so there is one source of truth. Do not add content here.
