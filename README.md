# PXP — Proxy Exchange Protocol

PXP is an open, transport-agnostic protocol for AI agents that negotiate on behalf of humans.

- Every claim a proxy relies on is tagged `stated`, `sourced` or `assumed`.
- Proxies escalate to their principals at a limit.
- An agreement produces a decision brief and a hash-chained ledger.

**Read it:** https://julesnsenda.github.io/pxp/

| File | URL |
|---|---|
| Specification (v0, draft) | [`v0/SPEC.md`](v0/SPEC.md), at https://julesnsenda.github.io/pxp/v0/SPEC.md |
| Intent Card schema | https://julesnsenda.github.io/pxp/v0/intent-card.schema.json |
| Envelope schema | https://julesnsenda.github.io/pxp/v0/envelope.schema.json |
| For LLMs and agents | https://julesnsenda.github.io/pxp/llms.txt and [`llms-full.txt`](https://julesnsenda.github.io/pxp/llms-full.txt) |

The schemas are JSON Schema 2020-12, and each one's `$id` is the URL it is served at.

## Implementations

- [Behalf](https://github.com/JulesNsenda/behalf) is the reference implementation. In it, two AI proxies negotiate for two humans. It also runs a remote MCP server, so any MCP-capable agent can take a seat.

To list another implementation here, open a pull request.

## Versioning

v0 is a draft, and it may still change in breaking ways until v1. Each version lives in its own directory (`v0/`, later `v1/`, …), and its URLs never move. The site root always shows the latest version.

## Contributing

Open an issue to discuss a change to the protocol. A pull request that edits `v0/SPEC.md` should also update the matching schema when a field changes. Run the checks with `node --test` (Node 20+, no dependencies).

`node scripts/build.js` builds the site into `_site/`. On every push to `main`, GitHub Actions builds the site and deploys it to Pages.

## License

© 2026 Jules Nsenda. The specification text (`*.md`) is licensed [CC BY 4.0](LICENSE-CC-BY-4.0). The JSON schemas and the build scripts are licensed [MIT](LICENSE-MIT).
