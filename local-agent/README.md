# inkwell-local-agent

A small, standalone Node.js/TypeScript service that lets the Inkwell browser
editor compile real LaTeX documents on your machine using a locally installed
TeX distribution (`pdflatex` / `xelatex` / `lualatex` driven via `latexmk`,
with `bibtex`/`biber` handled automatically by `latexmk`).

This is a completely separate runtime from the Next.js app — it has its own
`package.json`, is never bundled by Next.js, and never runs in the browser.
The browser app talks to it over HTTP/WebSocket on `localhost`.

## Requirements

- Node.js >= 18
- A TeX Live (or similar) installation with at least one of `pdflatex`,
  `xelatex`, `lualatex` and, always, `latexmk` on your `PATH`.

## Running

```bash
cd local-agent
npm install

# iterate without a build step
npm run dev

# or build once and run the compiled output
npm run build
npm start
```

On startup the agent probes for available compilers and prints a summary,
e.g.:

```
Inkwell local agent listening on http://localhost:47823
  pdflatex   ✓ (pdfTeX 3.14159265-2.6-1.40.25)
  xelatex    ✗ not found
  lualatex   ✓ (This is LuaHBTeX, Version 1.17.0)
  latexmk    ✓ (Latexmk, John Collins)
  bibtex     ✓ (BibTeX 0.99d)
  biber      ✗ not found
  workdir:  /tmp/inkwell-agent-work
  origins:  http://localhost:3000, http://127.0.0.1:3000
```

## CLI flags / environment variables

| Flag                     | Env var                          | Default                                   | Notes                                   |
|--------------------------|-----------------------------------|--------------------------------------------|------------------------------------------|
| `--port <n>`             | `INKWELL_AGENT_PORT`              | `47823`                                    | HTTP + WebSocket port                    |
| `--workdir <path>`       | —                                  | `os.tmpdir()/inkwell-agent-work`           | Per-project work directories live here   |
| `--allow-origin <url>`   | `INKWELL_AGENT_ALLOWED_ORIGINS`   | `http://localhost:3000,http://127.0.0.1:3000` | Repeatable flag; env var is comma-separated |
| `--max-project-size-mb <n>` | —                               | `50`                                       | Sum of all uploaded file content bytes   |

Example:

```bash
npm run dev -- --port 5555 --workdir /tmp/my-agent-work --allow-origin http://localhost:3000 --allow-origin http://localhost:3001
```

## API

See the wire protocol this was built against (summarized):

- `GET /version` — liveness + compiler discovery (cached after first probe;
  pass `?refresh=true` to force a re-probe).
- `POST /compile` — validates and queues a compile (`202 { buildId, status }`),
  runs `latexmk` asynchronously. Enforces per-project single-active-build
  (a new compile cancels any build already queued/running for that
  `projectId`), a max total upload size, a max file count, and a hard
  server-side compile timeout cap (180s).
- `GET /status/:buildId` — current status/log/pdfUrl for a build.
- `POST /cancel/:buildId` — kills the build's process tree.
- `GET /builds/:buildId/output.pdf` — streams the compiled PDF.
- `DELETE /project/:projectId` — cancels any active build for a project
  (called when a project's editor tab closes).
- `WS /events` — send `{"type":"subscribe","projectId":"..."}`; receive
  `{"type":"build-update", buildId, projectId, status, log, pdfUrl?, durationMs?}`
  whenever that project's active build changes state.

## Security notes

- All external processes are invoked with `execFile`/`spawn` and an argv
  array — never a shell string. The `compiler` field in a request only ever
  selects among a fixed map of `latexmk` engine flags (`-pdf` / `-xelatex` /
  `-lualatex`); it can never inject an arbitrary executable or extra flags.
- Every file path in a compile request is validated as relative, free of
  `..` segments, and (after resolving against the project's work directory)
  still inside that directory before anything is written to disk.
- Compiler binaries that aren't discovered as `available: true` at startup
  are rejected outright if requested — the agent never "tries anyway".
- On `SIGINT`/`SIGTERM` the agent kills every still-running build's process
  tree before exiting, so no orphaned `latexmk`/`pdflatex` processes are left
  behind.

## Project work directories

Uploaded files for a project are written to `<workdir>/<projectId>/` and are
**reused** across compiles of the same project so `latexmk`'s own
`.fdb_latexmk` incremental-build cache stays useful. Pass
`"options": { "clean": true }` in a `/compile` request to wipe that
directory before writing files. Compiled artifacts (PDF, `.log`, `.aux`,
etc.) live in `<workdir>/<projectId>/.build/`.
