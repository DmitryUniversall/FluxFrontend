<div align="center">

# Flux Frontend

The **client** for Flux, a self-hosted workspace for working with HTTP APIs.

One React codebase ships two ways: as a web app served by nginx, and as a native desktop app via Tauri.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-817cff)

</div>

---

## The Flux repositories

| Repository | Role | You are here |
| :--- | :--- | :---: |
| [FluxInfra](https://github.com/DmitryUniversall/FluxInfra) | Deployment and orchestration: Docker Compose, Redis, secrets, the `run.sh` launcher | |
| [FluxBackend](https://github.com/DmitryUniversall/FluxBackend) | FastAPI API server: accounts, collections, environments, proxy, sharing | |
| **[FluxFrontend](https://github.com/DmitryUniversall/FluxFrontend)** | React single-page app plus the Tauri desktop shell | ✅ |

> This frontend needs a running [FluxBackend](https://github.com/DmitryUniversall/FluxBackend) for accounts, data and sharing. To run everything together, start from [FluxInfra](https://github.com/DmitryUniversall/FluxInfra).

---

## Table of contents

- [Variable scopes and resolution](#variable-scopes-and-resolution)
- [Block-based scripting and tests](#block-based-scripting-and-tests)
- [JSON body form builder](#json-body-form-builder)
- [Request parameters](#request-parameters)
- [Flow](#flow)
- [Auth Store](#auth-store)
- [Workspaces and collaboration](#workspaces-and-collaboration)
- [OpenAPI / Swagger import](#openapi--swagger-import)
- [Tech stack](#tech-stack)
- [Core engines](#core-engines)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Configuration](#configuration)
- [Desktop app (Tauri)](#desktop-app-tauri)
- [Docker (web build)](#docker-web-build)

---

## Variable scopes and resolution

Any `{{token}}` in any field resolves through a chain of scopes, and the editor shows you exactly which scope each token comes from while you type. A misspelled name is visible before you ever send, because it is coloured as unknown.

The scopes, in resolution order (highest precedence first):

| Scope | Colour | Lives for | Defined by |
| :--- | :--- | :--- | :--- |
| **Dynamic** `{{$...}}` | cyan | one send (recomputed every time) | built-in generators (see below) |
| **Request parameter** | gold | one request run | the request's [Inputs tab](#request-parameters) |
| **Flow variable** | green | one [flow](#flow) run | flow steps: set, capture, ask, for-each |
| **Environment** | violet | persistent | the active environment, or save-to-env |
| **Unknown** | rose | n/a | nothing, the name resolves nowhere (likely a typo) |

When more than one scope defines the same name, the higher one wins. Inside scripts, a [with-vars block](#block-based-scripting-and-tests) adds a temporary override scope on top of this chain for the blocks nested inside it, then restores the previous values when it exits.

**Scope-aware editing.** Start typing `{{` in any value field and the autocomplete dropdown offers names from every scope at once: request parameters, flow variables, environment variables and dynamics, each with its colour, a source tag and a hint. Highlighting and autocomplete share one classifier, so what you see is what will resolve.

**Dynamic variables** are generated fresh at send time, and each occurrence is independent (two `{{$uuid}}` in one request produce two different values):

```
{{$uuid}}  {{$timestamp}}  {{$isoTimestamp}}  {{$datetime:+1h}}
{{$randomInt:1:100}}  {{$randomString:12}}  {{$randomEmail}}  {{$randomFullName}}
```

**Capture from the response.** Right-click any value in a JSON response to turn it into an environment variable or an assertion in one step, with no scripting.

---

## Block-based scripting and tests

Scripts run in two phases, pre-request and post-response, on one shared engine. You can write them visually or in code, and both feed the same Tests panel.

**Blocks** are a visual builder you assemble and reorder by drag and drop, with nestable container blocks:

| Block | What it does |
| :--- | :--- |
| `assert` | Check a condition and record a pass or fail in the Tests panel. |
| `saveToEnv` | Read a value (by expression) from the response and write it to an environment variable. |
| `setEnv` | Write a literal or templated value to an environment variable. |
| `setAuth` | Override the auth used for the request from the script. |
| `log` | Emit a line to the run console. |
| `condition` | Container: run nested blocks only when a condition holds. |
| `withVars` | Container: temporarily override variable values for the blocks nested inside it, then restore them. |

**Code** is plain JavaScript with a familiar request and test API (`pm.response`, `pm.environment.set`, `pm.test`, `pm.expect`) for cases the blocks do not cover.

**Assertions and the Tests panel.** Assertions cover status (`200` / `2xx` / `200,201`), response time, a JSON value (an expression plus `exists` / `==` / `!=` / `<` / `>` / `contains` / `regex` / `is type`), and header or body checks. Each assertion has an optional label and a `stop` or `continue` mode, and results show up with a `passed/total` badge.

**One expression engine.** Everywhere a path into the response is read (captures, assertions, save-to-env) the same `path` / JMESPath engine is used, with a button to test the expression against the last response right where you write it.

---

## JSON body form builder

The request body can be edited as a structured form instead of raw text. It is a visual tree of nodes (key, type, value) where you add, nest and reorder fields, and it stays in two-way sync with the raw JSON view: edit either side and the other updates. The builder is tolerant of `{{templates}}`, so placeholders survive the round trip between the form and the raw text and are not mangled into invalid JSON.

---

## Request parameters

A request can declare its own typed **inputs** on an Inputs tab: a name, a default, whether it is required, and optional preset values. You reference an input anywhere as `{{name}}`, and on Send a form appears, prefilled from the defaults and validated against the declarations, so the same request becomes a small parameterized form. Inputs are their own variable scope (the gold one), so they take precedence over environment values for that run, and OpenAPI path parameters are imported straight into them.

---

## Flow

Flow is a distinct node type in the tree with its own step-list editor. It turns a sequence of requests into a runnable scenario without leaving the app.

**Step types:**

| Step | Purpose |
| :--- | :--- |
| `Call` | Run a saved request with parameters, and capture values out of its response. |
| `Set` / `Set env` | Write into the flow scope, or persist into the environment. |
| `Ask for input` | Pause and prompt the user for a value. |
| `Assert` | Check a condition mid-run. |
| `Set auth` | Choose the identity used by following calls. |
| `Wait / Poll` | Repeat a call until a condition holds or a timeout. |
| `If` | Branch on a condition. |
| `For each` | Loop over a captured collection. |
| `Delay` | Pause for a fixed time. |

**Flow scope.** A run gets an isolated scratchpad (the green scope) that lives only while the flow runs. Captures and `Set` write there and do not touch your environment unless you explicitly use `Set env`. Inside a `Call`, resolution order is the call's own parameters, then the flow scope, then the environment.

**Run panel.** Run and Stop, a per-step status (`pending` / `running` / `passed` / `failed` / `skipped`), step timings, the variables captured so far, and an expandable request and response for each step.

---

## Auth Store

Authentication identities are defined once and reused, rather than retyped per request. An identity is a Bearer token, Basic credentials or an API key; one can be marked as the default. A request points at an identity instead of holding its own secret, and the secret is resolved at the moment of sending, so rotating a credential is a single edit in one place. Identities are shared across a workspace, and a script or flow step can switch the active identity with `setAuth`.

---

## Workspaces and collaboration

Workspaces separate unrelated projects or clients. Every account has a personal workspace, and any other workspace can be shared with other users.

- **Roles:** owner, editor and viewer, enforced by the backend.
- **Invitations:** invite a user to a workspace; they accept or decline through in-app notifications.
- **Shared surface:** collections, environments and the Auth Store all belong to the workspace, so members see the same data.
- **Live sync:** changes from other members are pulled in automatically, and your unsaved local edits are not overwritten while you work.

The membership, roles and data all live on the backend; see [FluxBackend](https://github.com/DmitryUniversall/FluxBackend) for the model behind them.

---

## OpenAPI / Swagger import

Point Flux at an OpenAPI or Swagger document (3.x or 2.0, JSON or YAML, pasted inline or fetched by URL) and it builds ready-to-send requests:

- Pick operations one at a time, or import the whole document as a collection.
- Path parameters become [request inputs](#request-parameters).
- The request body is generated from the operation's schema.
- Security schemes map onto Flux auth with `{{access_token}}` / `{{api_key}}` placeholders, ready to wire to the [Auth Store](#auth-store) or an environment.

---

## Tech stack

| Concern | Choice |
| :--- | :--- |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3, accent `#817cff`, fonts Sora + JetBrains Mono |
| State | Zustand |
| Animation | Framer Motion |
| Icons | lucide-react |
| Routing | react-router-dom |
| Drag and drop | dnd-kit |
| Expressions and YAML | jmespath, js-yaml |
| Desktop shell | Tauri 2 (Rust) |

---

## Core engines

The `src/core/` layer is pure, dependency-light TypeScript that the distinctive features above are built on:

| Module | What it does |
| :--- | :--- |
| `template.ts` | Parses and resolves `{{tokens}}`, and classifies each token by scope so the editor can colour it. |
| `dynamics.ts` | Resolves dynamic variables like `{{$uuid}}` and `{{$randomInt:1:100}}` at send time, each occurrence independently. |
| `expression.ts` | The `path` / JMESPath engine used by captures, assertions and save-to-env. |
| `json-template.ts` | Two-way conversion between the visual JSON tree and raw JSON that tolerates `{{}}` placeholders. |
| `json-path.ts` | Path access helpers used across captures and assertions. |
| `http/http-client.ts` | Typed wrapper over `fetch` with JSON handling, a normalized error shape, and a 401-refresh-retry hook. |

---

## Architecture

Android-style layering: `core` (pure utilities) sits under `main/common` (app-wide scaffolding) which sits under `main/features/*` (the features). Inside a feature: `data` (repositories) feeds `domain` (models and use-cases) feeds `ui` (components, where a hook plays the role of a ViewModel).

```
core/              pure engines: template, dynamics, expression, json, http-client
  │
main/common/       api client, the UI kit (HighlightedInput, templateScope, ...), utils, version
  │
main/features/*    a folder per feature, each with its own data / domain / ui
```

The API client (`main/common/api`) is the one place that talks to the backend. Every feature depends on it rather than calling `fetch` directly, which is also what makes the web-versus-desktop transport switch invisible to feature code.

---

## Project layout

```
frontend/
├── index.html
├── package.json
├── vite.config.ts              # injects __APP_VERSION__, sets the dev server to :5173
├── tailwind.config.js
├── nginx.conf                  # web serving + /api proxy (used by the Docker image)
├── Dockerfile                  # multi-stage build: Vite build, then nginx
├── src/
│   ├── main.tsx  App.tsx  index.css
│   ├── core/                   # template, dynamics, expression, json, http-client
│   └── main/
│       ├── common/             # api, ui kit, platform.ts, utils, version.ts
│       └── features/           # auth, workspaces, collections, environments,
│                               #   request-editor, response-viewer, scripting, flow,
│                               #   identities, swagger-import, console, notifications,
│                               #   invitations, changelog, releases, updates, admin,
│                               #   settings, guide, shell
└── src-tauri/                  # the Rust desktop shell (see below)
    ├── src/lib.rs              # native send_http command (reqwest)
    ├── tauri.conf.json
    └── Cargo.toml
```

---

## Getting started

Requires **Node.js 18+** and npm. You also need a Flux backend running (see [FluxBackend](https://github.com/DmitryUniversall/FluxBackend)); in dev the client targets `http://localhost:7887` by default.

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

There is no Vite dev proxy: the SPA always targets an absolute API base, resolved in `src/main/common/api/server-config.ts` and overridable with `VITE_API_BASE_URL`.

---

## npm scripts

| Script | What it runs |
| :--- | :--- |
| `npm run dev` | Vite dev server with hot reload on http://localhost:5173. |
| `npm run build` | Type-check (`tsc -b`) then produce the production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | `tsc --noEmit`, no output. |
| `npm run tauri:dev` | Run the desktop app in dev: Vite on :5173 inside a native window, hot-reloading both the frontend and Rust. |
| `npm run tauri:build` | Build a distributable desktop bundle for the current OS. |

---

## Configuration

The backend location is the absolute base URL prepended to every API path. It is resolved per build mode and can be overridden at build time:

| Mode | Default API base | Override |
| :--- | :--- | :--- |
| Local dev (`vite` / `tauri dev`) | `http://localhost:7887` | `VITE_API_BASE_URL` |
| Production build (web / desktop) | the hosted Flux API | `VITE_API_BASE_URL` |

```bash
# Point a build at a specific backend.
VITE_API_BASE_URL=https://flux.example.com npm run build
```

The desktop build additionally lets the user choose any server from the sign-in screen (the **Server** field), which is persisted and wins over the build-time default. The single source of the app version is `package.json`, injected into the build as `__APP_VERSION__`.

---

## Desktop app (Tauri)

The same frontend runs in a native window. The key difference: requests from the editor are sent **natively from Rust** (reqwest) instead of through the backend proxy. Because of that:

- `localhost`, `127.0.0.1`, VPN hosts and private networks are all reachable, with no CORS at all.
- For loopback hosts only, the TLS certificate is not verified, so a self-signed HTTPS dev server works out of the box. Every other host is verified normally.
- The request timeout is 30 seconds (`TIMEOUT_SECONDS` in `src-tauri/src/lib.rs`).

The native surface is deliberately tiny: a single `send_http` command that mirrors the backend's `POST /api/v2/proxy` contract field for field, so the TypeScript side switches transports with no mapping layer.

The desktop app still needs a Flux backend (accounts, collections, environments, sharing), either local or remote. The server URL is set on the sign-in screen (default `http://localhost:7887`) and remembered.

### Requirements

- **Node.js 18+** and npm.
- **Rust (stable)** via [rustup](https://rustup.rs).
- Platform dependencies for Tauri (see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)):
  - **Linux** (Debian / Ubuntu): `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`.
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`).
  - **Windows:** Microsoft C++ Build Tools ("Desktop development with C++") and the WebView2 Runtime.

### Build

```bash
npm install
npm run tauri:dev               # dev window with hot reload
npm run tauri:build             # distributable, output under src-tauri/target/release/bundle/
```

Linux build sometimes requires

```bash
NO_STRIP=true npm run tauri:build
```

| OS | Artifacts |
| :--- | :--- |
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.app`, `.dmg` |
| Windows | `.msi`, NSIS `setup.exe` |

Tauri does not cross-compile between operating systems out of the box, so build each platform on that platform or in CI.

---

## Docker (web build)

The included `Dockerfile` is a two-stage build: Vite compiles the SPA, then nginx serves it and proxies `/api` to the backend. The API base can be baked in at build time:

```bash
docker build --build-arg VITE_API_BASE_URL=https://flux.example.com -t flux-frontend .
docker run -p 8080:80 flux-frontend
```

For the full stack (this UI together with the backend and Redis), use [FluxInfra](https://github.com/DmitryUniversall/FluxInfra), which builds this image as one of its services.

---

<div align="center">

Part of the Flux project &nbsp;•&nbsp; [FluxInfra](https://github.com/DmitryUniversall/FluxInfra) &nbsp;·&nbsp; [FluxBackend](https://github.com/DmitryUniversall/FluxBackend) &nbsp;·&nbsp; [FluxFrontend](https://github.com/DmitryUniversall/FluxFrontend)

</div>
