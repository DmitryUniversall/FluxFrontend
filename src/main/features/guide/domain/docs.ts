// The documentation content: a small wiki rendered by DocsScreen. Sections hold
// pages, pages hold simple typed blocks so we can write a lot of prose compactly
// and render it consistently. A "demo" block embeds a live, interactive widget
// (see DocsInteractive.tsx) so readers can try Flux mechanics right here.
// Plain text only in user-facing strings (no long or medium dashes).

export type DocBlock =
    | { t: "p"; text: string }
    | { t: "h"; text: string }
    | { t: "ul"; items: string[] }
    | { t: "steps"; items: string[] }
    | { t: "code"; text: string }
    | { t: "note"; text: string }
    | { t: "demo"; kind: "template" | "dynamics" | "expression" };

export interface DocPage {
    id: string;
    title: string;
    blocks: DocBlock[];
}

export interface DocSection {
    id: string;
    title: string;
    pages: DocPage[];
    // Admin-only sections are shown in the docs nav only to users with admin.access.
    admin?: boolean;
}

export const DOCS: DocSection[] = [
    {
        id: "get-started",
        title: "Get started",
        pages: [
            {
                id: "what-is-flux",
                title: "What is Flux",
                blocks: [
                    {
                        t: "p",
                        text: "Flux is a self-hosted tool for building, sending and organising HTTP requests, similar to Postman, Insomnia or Hoppscotch. You compose a request, send it, and inspect the response, all in a fast, keyboard-friendly dark interface.",
                    },
                    {
                        t: "p",
                        text: "Beyond single requests, Flux stores reusable variables and credentials, writes checks and small scripts, chains requests into flows, imports whole APIs from an OpenAPI document, and shares everything with a team inside a workspace.",
                    },
                    { t: "h", text: "What makes Flux different" },
                    {
                        t: "ul",
                        items: [
                            "Scope-coloured templating: every {{variable}} is highlighted by where it resolves (environment, request parameter, flow variable, or dynamic), so typos and undefined names are obvious before you send.",
                            "Capture from the response by right-click: turn any value in a JSON response into a saved variable or an assertion in one click, no scripting required.",
                            "A real expression engine (dot-path and JMESPath) used everywhere a value is read: captures, asserts and saved variables.",
                            "Flows: a visual orchestrator that chains requests, captures values, loops, branches, waits and polls, with a live run panel.",
                            "An Auth store of reusable identities: set a credential once, mark a default, and rotate it in one place.",
                            "Self-hosted and storage-agnostic: runs in Docker, as a desktop app (Tauri), and keeps your data on your own backend.",
                        ],
                    },
                    { t: "h", text: "Try it: live templating" },
                    {
                        t: "p",
                        text: "This is the same resolver Flux uses on send. Edit the template or the variable values and watch it resolve. Tokens are coloured by scope.",
                    },
                    { t: "demo", kind: "template" },
                    {
                        t: "note",
                        text: "Many pages below have live playgrounds like this one. Prefer learning by doing inside the real app? Open the interactive onboarding any time from the ? menu in the top bar.",
                    },
                ],
            },
            {
                id: "account-workspace",
                title: "Account and workspace",
                blocks: [
                    {
                        t: "p",
                        text: "When you register, Flux creates a personal workspace for you automatically. A workspace is a self-contained space with its own collections, environments and stored credentials. Your personal workspace is private to you.",
                    },
                    {
                        t: "steps",
                        items: [
                            "Open the app and choose Create account on the sign-in screen.",
                            "Pick a username and a password of at least six characters.",
                            "You land straight in your personal workspace, ready to send requests.",
                        ],
                    },
                    {
                        t: "p",
                        text: "On the desktop app you can also point Flux at any Flux backend from the sign-in screen, which is useful when you self-host your own server. The active workspace name is shown in the browser tab title.",
                    },
                    {
                        t: "note",
                        text: "Right after registering, Flux offers a guided tour. You can take it then, or start it later from the ? menu.",
                    },
                ],
            },
            {
                id: "first-request",
                title: "Send your first request",
                blocks: [
                    { t: "p", text: "A request needs a method and a URL. Everything else is optional." },
                    {
                        t: "steps",
                        items: [
                            "In the sidebar, create a collection (the folder icon), then add a request to it.",
                            "Choose a method (GET, POST, and so on) and type a URL, for example https://httpbin.org/get.",
                            "Click Send, or press Cmd/Ctrl+Enter.",
                            "Read the response in the panel below: status, timing, size and body.",
                        ],
                    },
                    {
                        t: "p",
                        text: "Requests autosave as you edit, so you never lose work. Switching between requests is instant and keeps each one's last response. Close the open request or flow with the X in its header to return to an empty workspace.",
                    },
                    {
                        t: "note",
                        text: "In the web version, requests are sent through the Flux backend proxy, so there are no CORS problems. In the desktop app they are sent natively from your machine, so localhost and private hosts just work.",
                    },
                ],
            },
            {
                id: "interface",
                title: "The interface",
                blocks: [
                    { t: "p", text: "The workspace is split into a few areas:" },
                    {
                        t: "ul",
                        items: [
                            "Sidebar (left): the workspace switcher on top, then your collections and the requests and flows inside them.",
                            "Variables panel: the active environment's variables, always in view. Collapse it when you need more room.",
                            "Editor (center, top): the request or flow you are working on.",
                            "Response (center, bottom): the result of the last send, or a flow's run results.",
                            "Top bar (right): the Auth store, the request console, the environment selector, notifications and the ? help menu.",
                        ],
                    },
                    {
                        t: "note",
                        text: "The splitter between the editor and the response is draggable, and both the sidebar and the variables panel collapse, so you can shape the layout to the task. Your layout is remembered across reloads.",
                    },
                ],
            },
        ],
    },
    {
        id: "core",
        title: "Core concepts",
        pages: [
            {
                id: "collections",
                title: "Collections and requests",
                blocks: [
                    {
                        t: "p",
                        text: "Collections are folders that group related requests and flows. Create as many as you like, rename them, drag to reorder, and drag requests between them.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Add a request or a flow from a collection's menu, or with the plus buttons.",
                            "Right-click a request for quick actions: duplicate, copy as cURL, or delete.",
                            "Duplicating a request appends a numbered suffix (Foo, Foo-1, Foo-2).",
                            "Reordering and moving are saved automatically.",
                        ],
                    },
                    {
                        t: "p",
                        text: "A request can be an ordinary HTTP request or a flow. Flows are covered in their own page under Main features.",
                    },
                ],
            },
            {
                id: "request-editor",
                title: "The request editor",
                blocks: [
                    {
                        t: "p",
                        text: "The top of the editor holds the request name, the method, the URL and the Send button. Below that is a row of tabs for everything else.",
                    },
                    { t: "h", text: "URL" },
                    {
                        t: "p",
                        text: "The URL accepts variables written as {{name}}. They resolve from the active environment when you send, so you can keep base URLs and ids out of the literal text. Names are highlighted by scope as you type, and autocomplete pops up when you type two braces.",
                    },
                    { t: "h", text: "Params" },
                    {
                        t: "p",
                        text: "Query-string key and value pairs appended to the URL. Toggle individual rows on or off. Params and the URL stay in sync.",
                    },
                    { t: "h", text: "Headers" },
                    {
                        t: "p",
                        text: "Request headers. Flux suggests common ones as you type, and you can add any custom header. Values accept variables too.",
                    },
                    { t: "h", text: "Auth" },
                    {
                        t: "p",
                        text: "Bearer, Basic, API key, a stored identity, or ask-on-run. See the Authentication page.",
                    },
                    { t: "h", text: "Body" },
                    {
                        t: "p",
                        text: "Pick a body type. JSON gives you raw text plus a visual builder that adds and renames fields safely. Form sends key and value pairs. Or send no body at all.",
                    },
                    { t: "h", text: "Inputs" },
                    { t: "p", text: "Declare named parameters the request needs. See the Parameters and inputs page." },
                    { t: "h", text: "Scripts" },
                    {
                        t: "p",
                        text: "Pre-request and post-response logic built from blocks (or code). See the Scripting page.",
                    },
                ],
            },
            {
                id: "variables-templating",
                title: "Variables and templating",
                blocks: [
                    {
                        t: "p",
                        text: "Anywhere you can type a value in Flux, you can reference a variable as {{name}}. At send time Flux replaces the token with the variable's value. This keeps host names, ids and secrets out of the literal text and lets you switch contexts by switching environments.",
                    },
                    { t: "h", text: "Scope and colour" },
                    {
                        t: "p",
                        text: "Flux highlights every token by the scope it resolves against, so you can see at a glance where a value comes from and catch typos before sending:",
                    },
                    {
                        t: "ul",
                        items: [
                            "Violet: a variable from the active environment.",
                            "Gold: a parameter the request declares on its Inputs tab.",
                            "Green: a flow variable, live only during a flow run.",
                            "Cyan: a dynamic variable, generated fresh at send time.",
                            "Rose: unknown, the name is not defined in any scope (likely a typo).",
                        ],
                    },
                    {
                        t: "p",
                        text: "When more than one scope defines the same name, the higher-precedence one wins. Resolution order is dynamic, then request parameter, then flow variable, then environment.",
                    },
                    { t: "h", text: "Autocomplete" },
                    {
                        t: "p",
                        text: "Start typing two opening braces in any value field and Flux offers a scope-aware dropdown: request parameters, flow variables, environment variables and dynamic variables, each with its colour, a source tag and a hint. Arrow keys, Enter, Tab or the mouse to pick.",
                    },
                    { t: "h", text: "Try it" },
                    { t: "demo", kind: "template" },
                    {
                        t: "note",
                        text: "If you send a request with an unresolved {{variable}} in the URL, Flux returns a clear error telling you to define it or pick the right environment, rather than a confusing network failure.",
                    },
                ],
            },
            {
                id: "dynamic-variables",
                title: "Dynamic variables",
                blocks: [
                    {
                        t: "p",
                        text: "Dynamic variables are generated values, written {{$name}}, that Flux produces fresh every time you send. They are perfect for unique ids, timestamps and random test data, and they never collide with your own variables because the dollar prefix is reserved for them.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Each occurrence resolves independently, so two {{$uuid}} in one request get different values.",
                            "Some take arguments after a colon, for example {{$randomInt:1:100}}, {{$randomString:24}} or {{$datetime:+1h}}.",
                            "They are highlighted in cyan and appear in autocomplete when you type two braces and a dollar sign.",
                        ],
                    },
                    { t: "h", text: "Try it: roll some values" },
                    { t: "demo", kind: "dynamics" },
                    {
                        t: "note",
                        text: "Dynamic variables work everywhere templating does: URL, params, headers, body, auth fields, scripts and flow steps.",
                    },
                ],
            },
            {
                id: "params-inputs",
                title: "Parameters and inputs",
                blocks: [
                    {
                        t: "p",
                        text: "Inputs are named parameters a request declares on its Inputs tab. They make a request reusable: instead of hard-coding an id or a search term, you declare it once and supply a value when you send. Inside the request you reference an input as {{name}}, exactly like any other variable (it is highlighted in gold).",
                    },
                    {
                        t: "ul",
                        items: [
                            "Mark an input as required, give it a default value, or leave it free.",
                            "Offer preset choices so the value can be picked from a list.",
                            "Reference an input anywhere a variable works, for example /users/{{userId}} or in the body.",
                        ],
                    },
                    {
                        t: "p",
                        text: "When you send a request that has a required input with no default (or that uses ask-on-run auth), Flux shows a small run form so you can fill the values first. Defaults and the last values you used are pre-filled, required fields are marked, and values are validated before sending. If every input has a default, Flux sends straight away unless you tick Always show run form on the Inputs tab.",
                    },
                    {
                        t: "note",
                        text: "Inputs are also how flows pass values into the requests they call: a Call step lists the request's parameters under With parameters.",
                    },
                ],
            },
            {
                id: "expressions",
                title: "Expressions: path and JMESPath",
                blocks: [
                    {
                        t: "p",
                        text: "Whenever Flux reads a value out of a response, it uses one expression engine with two modes. You meet it when you Save to environment, add a JSON-value assertion, or capture a value in a flow.",
                    },
                    {
                        t: "ul",
                        items: [
                            "path (default): a simple dot and bracket path, for example data.meeting.id or items[0].id.",
                            "jmespath: full JMESPath, for example items[?status=='active'].id, length(items), or sort_by(items, &created_at)[-1].id.",
                        ],
                    },
                    {
                        t: "p",
                        text: "Every place that takes an expression has a mode switch and a button to test the expression against the last response, so you can dial it in before relying on it.",
                    },
                    { t: "h", text: "Try it: query a sample response" },
                    { t: "demo", kind: "expression" },
                    {
                        t: "note",
                        text: "The distinction between a matched value and no match is what powers asserts (exists) and reliable captures (only save when the path actually resolved).",
                    },
                ],
            },
            {
                id: "responses",
                title: "Reading responses",
                blocks: [
                    {
                        t: "p",
                        text: "After a send, the response panel shows the status, how long it took and the size, then the body and more in tabs.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Body: JSON renders as a collapsible tree, or switch to Raw for the exact text.",
                            "Headers: every response header.",
                            "Console: log output from your scripts.",
                            "Tests: the result of any assertions that ran, with a passed/total badge on the status row.",
                        ],
                    },
                    { t: "h", text: "Quick actions on JSON" },
                    { t: "p", text: "Right-click any value in the JSON tree to:" },
                    {
                        t: "ul",
                        items: [
                            "Add check: drop an assertion into Post-response scripts. A primitive becomes equals current value; an object adds checks for its immediate fields; an array checks existence.",
                            "Save to environment: store the value in a variable, and keep capturing it on every future send by adding a saveToEnv block.",
                            "Copy the value, its path, or the whole subtree as JSON.",
                        ],
                    },
                    {
                        t: "note",
                        text: "This right-click capture is the fastest way to turn a real response into reusable variables and tests, with no scripting.",
                    },
                ],
            },
            {
                id: "environments",
                title: "Environments and variables",
                blocks: [
                    {
                        t: "p",
                        text: "An environment is a named set of variables. The variables panel on the left always shows the active environment, and the selector in the top bar (or the panel) switches between them.",
                    },
                    {
                        t: "p",
                        text: "Anywhere you can type, {{base_url}} or {{token}} resolves to the matching variable at send time. This keeps secrets and host names in one place and lets you flip between, say, Dev and Prod by changing the active environment.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Edit variables inline in the panel; changes save automatically.",
                            "A selected variable holds one of a fixed set of options, handy for things like an environment name or a region.",
                            "Save to environment from a response writes straight into the active environment.",
                        ],
                    },
                    { t: "note", text: "Environments belong to a workspace, so each workspace has its own set." },
                ],
            },
        ],
    },
    {
        id: "features",
        title: "Main features",
        pages: [
            {
                id: "auth",
                title: "Authentication and the Auth store",
                blocks: [
                    { t: "p", text: "Set authentication on a request's Auth tab. Flux offers several schemes:" },
                    {
                        t: "ul",
                        items: [
                            "Bearer token: sends an Authorization header with your token.",
                            "Basic auth: a username and password.",
                            "API key: a key sent as a header or a query parameter.",
                            "Ask on run: nothing is stored on the request; Flux prompts you for auth each time you send.",
                            "Stored identity: reuse a credential from the workspace Auth store.",
                        ],
                    },
                    { t: "h", text: "The Auth store" },
                    {
                        t: "p",
                        text: "The Auth store (the key icon in the top bar) keeps named, reusable identities for the workspace. Create an identity once, fill its scheme and secret, and mark one as the default. Any request can then use it by choosing Stored identity, either by name or by leaving it on Workspace default.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Resolved at send time, so rotating a secret in one place updates every request that uses it.",
                            "Identities are shared with everyone in the workspace, so a team uses the same credentials without copying them around.",
                            "Token and key fields accept {{variables}}, so the actual secret can still come from the environment, for example {{access_token}}.",
                        ],
                    },
                    {
                        t: "note",
                        text: "The Auth store has its own interactive tutorial: open the Auth store and click its ? button, or pick Auth store tour from the ? menu.",
                    },
                ],
            },
            {
                id: "scripting",
                title: "Scripting with blocks",
                blocks: [
                    {
                        t: "p",
                        text: "Each request has two script stages: pre-request (before it is sent) and post-response (after the reply arrives). You build them from blocks, so no code is required, though a code option is there if you want it. The same engine powers both stages.",
                    },
                    { t: "h", text: "Common blocks" },
                    {
                        t: "ul",
                        items: [
                            "Assert: check something about the response (status, a JSON value, a header, the body). Results show on the Tests tab.",
                            "Save to environment: capture a response value into a variable by path or JMESPath.",
                            "Set variable: compute a value for later use, with {{templates}} and dynamics.",
                            "Log: write to the response Console.",
                            "Set auth: override the auth used for this send (handy to act as a different user).",
                            "With vars: a container that temporarily overrides variables for the blocks nested inside it, then restores them.",
                        ],
                    },
                    {
                        t: "p",
                        text: "Blocks run top to bottom. The fastest way to create one is to right-click a value in the response and choose Add check or Save to environment, which adds the matching block for you.",
                    },
                    { t: "h", text: "Code mode" },
                    {
                        t: "p",
                        text: "Prefer code? Each stage also has a Code tab with a Postman-like API: pm.response, pm.environment.set, pm.test and pm.expect. It runs your own scripts in the browser; it is a convenient runner, not a sandbox for untrusted code.",
                    },
                    { t: "h", text: "Editing" },
                    {
                        t: "ul",
                        items: [
                            "Drag blocks to reorder them or move them in and out of containers.",
                            "Undo and redo with Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z; history is per stage, within the session.",
                        ],
                    },
                ],
            },
            {
                id: "tests",
                title: "Tests and assertions",
                blocks: [
                    {
                        t: "p",
                        text: "Tests in Flux are just Assert blocks in the post-response stage, mixed in with your other blocks, not a separate editor. When the response arrives they run and report on the Tests tab, with a passed/total badge on the status row.",
                    },
                    { t: "h", text: "Assertion types" },
                    {
                        t: "ul",
                        items: [
                            "Status: exact (200), class (2xx) or a set (200,201).",
                            "Response time: under N milliseconds.",
                            "JSON value: an expression plus a check (exists, equals, not equals, less/greater than, contains, regex, is type).",
                            "Header: exists, equals or contains.",
                            "Body: contains, regex, is valid JSON, or equals JSON.",
                        ],
                    },
                    {
                        t: "p",
                        text: "Each assertion takes an optional label and a stop or continue mode, which matters inside flows: a failed stop assertion halts the run, a continue one is recorded and the run goes on.",
                    },
                    {
                        t: "note",
                        text: "Right-click a value in a JSON response and choose Add check to generate the matching assertion automatically.",
                    },
                ],
            },
            {
                id: "flows",
                title: "Flows",
                blocks: [
                    {
                        t: "p",
                        text: "A flow chains steps into a sequence, so you can model a real scenario: log in, capture a token, create a record, then verify it. A flow is a node in the tree with its own icon; open it and you get a step editor instead of the HTTP editor. Add a flow to a collection just like a request.",
                    },
                    { t: "h", text: "Step types" },
                    {
                        t: "ul",
                        items: [
                            "Call request: send one of your requests, pass it inputs under With parameters, and capture values from its response into flow variables.",
                            "Ask for input: pause the run and ask the user for a value, stored as a flow variable.",
                            "Set variable and Set env variable: store values for later steps, or write them into the active environment.",
                            "Assert: check a condition on the last response and optionally stop the flow.",
                            "Set auth: apply an auth for all following Call steps (for example, act as user1).",
                            "Wait / Poll: repeat a call every N ms, up to a limit or timeout, until a condition on the response holds, then optionally capture values.",
                            "If and For each: branch on a condition, or loop over an array from a response with item and index in scope.",
                            "Delay: pause briefly.",
                        ],
                    },
                    { t: "h", text: "Flow scope" },
                    {
                        t: "p",
                        text: "A flow run has its own isolated scratchpad of variables (highlighted green). They live only for the run and are not written to your environment unless you explicitly use Set env variable. Inside a Call step, resolution order is the step's parameters, then flow scope, then the environment, plus dynamics.",
                    },
                    { t: "h", text: "Running a flow" },
                    {
                        t: "steps",
                        items: [
                            "Add a Call step and pick the request it should send.",
                            "Add a capture to save a value from its response into a flow variable.",
                            "Add more steps (ask for input, set env, assert, loop) as needed.",
                            "Click Run. The flow pauses for any Ask for input step, and the run panel shows each step's status, timing, captured variables and its request and response.",
                        ],
                    },
                    {
                        t: "note",
                        text: "The flow runner is client-side and reuses the same request building, templating, expression and assertion engines as a normal send, so behaviour matches exactly.",
                    },
                ],
            },
            {
                id: "import",
                title: "Importing an API",
                blocks: [
                    {
                        t: "p",
                        text: "If you already have an API description, you can import it instead of building requests by hand. Open the import screen from the sidebar or a collection's menu.",
                    },
                    {
                        t: "steps",
                        items: [
                            "Paste an OpenAPI 3.x or Swagger 2.0 document (JSON or YAML), or load it from a URL.",
                            "Flux lists every operation grouped by tag. Select any subset, or filter by name, or take the whole collection at once.",
                            "Choose a destination: a new collection or an existing one, and set a base URL (optionally as a {{baseUrl}} variable).",
                            "Click Import. Each operation becomes a ready request with its method, URL, query, headers and body filled in.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Path parameters arrive as Inputs, request bodies are generated from the schema, and secured endpoints get auth with token placeholders like {{access_token}}, so the imported requests are ready to wire up to your environment.",
                    },
                ],
            },
            {
                id: "curl",
                title: "Importing and exporting cURL",
                blocks: [
                    {
                        t: "p",
                        text: "Flux speaks cURL both ways, which makes it easy to move requests in and out of terminals, docs and browser dev tools.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Import: paste a curl command and Flux fills in the method, URL, query, headers, body, and basic or bearer auth.",
                            "Export: Copy as cURL builds a command from the current request, with environment variables already substituted, so it runs as-is.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Copy as cURL lives in the request's overflow menu and in its right-click menu in the sidebar. It uses the current, even unsaved, state of the request.",
                    },
                ],
            },
            {
                id: "console",
                title: "The request console",
                blocks: [
                    {
                        t: "p",
                        text: "The console (the terminal icon in the top bar) is a running history of every exchange, whether it came from a manual send or a flow run.",
                    },
                    {
                        t: "ul",
                        items: [
                            "Each row is one request and its response, with method, URL, status, timing and size.",
                            "Expand a row to inspect the full request and response headers and bodies.",
                            "Filter the list by method, URL or status.",
                            "Failed and errored calls are tinted so problems stand out.",
                        ],
                    },
                ],
            },
            {
                id: "workspaces",
                title: "Workspaces and collaboration",
                blocks: [
                    {
                        t: "p",
                        text: "Everything in Flux lives inside a workspace. Switch or create workspaces from the switcher at the top of the sidebar. Separate workspaces are a clean way to split projects (for example Dev and Prod) or clients. The active workspace name appears in the browser tab title.",
                    },
                    { t: "h", text: "Sharing" },
                    {
                        t: "p",
                        text: "Your personal workspace is private. Any other workspace can be shared with teammates. Manage people in Workspace settings:",
                    },
                    {
                        t: "ul",
                        items: [
                            "Invite someone; they receive a notification and accept it from the bell.",
                            "Assign roles: owner (full control), editor (can change content), viewer (read only).",
                            "Members share the workspace collections, environments and auth store.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Changes sync between members automatically, so a collaborator's saved edits show up for you. Open requests update in place unless you have unsaved local changes, which are never overwritten.",
                    },
                ],
            },
            {
                id: "shortcuts",
                title: "Keyboard shortcuts",
                blocks: [
                    { t: "p", text: "A few shortcuts speed up the common actions:" },
                    {
                        t: "ul",
                        items: [
                            "Cmd/Ctrl+Enter: send the request, or run the flow.",
                            "Cmd/Ctrl+S: save the current request or flow.",
                            "Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z: undo and redo in the block editor.",
                            "Escape: close a dialog, a menu, or end a running tutorial.",
                        ],
                    },
                    { t: "p", text: "You can review and adjust shortcuts in Settings, under Keyboard shortcuts." },
                ],
            },
        ],
    },
    {
        id: "workflows",
        title: "Workflows and use-cases",
        pages: [
            {
                id: "dev-workflows",
                title: "Developer workflows",
                blocks: [
                    {
                        t: "p",
                        text: "A few end-to-end patterns that combine Flux's features. Each one is something you would otherwise script by hand.",
                    },
                    { t: "h", text: "1. Log in once, use the token everywhere" },
                    {
                        t: "steps",
                        items: [
                            "Send your login request, then right-click the token in the response and choose Save to environment as access_token.",
                            "In other requests, set Bearer auth to {{access_token}}, or create an Auth store identity that uses it and mark it default.",
                            "Re-running login re-captures the token automatically, so every request stays authenticated.",
                        ],
                    },
                    { t: "h", text: "2. Create then verify (a CRUD lifecycle) in a flow" },
                    {
                        t: "steps",
                        items: [
                            "Call your Create request and capture the new id into a flow variable, for example itemId from the response.",
                            "Call Get by id, passing {{itemId}} as a parameter, and add an Assert that the status is 200.",
                            "Call Delete by id with {{itemId}}, then Call Get again and assert the status is 404.",
                        ],
                    },
                    { t: "h", text: "3. Wait until something is ready (polling)" },
                    {
                        t: "steps",
                        items: [
                            "Kick off a long-running job with a Call step and capture its job id.",
                            "Add a Wait/Poll step that re-calls the status endpoint every second until a JSON value like status equals done.",
                            "Continue the flow once the condition holds, or stop on timeout.",
                        ],
                    },
                    { t: "h", text: "4. Data-driven runs with For each" },
                    {
                        t: "steps",
                        items: [
                            "Call a list endpoint and capture the array you care about.",
                            "Add a For each step over that array; inside it, Call a per-item request using {{item}} and {{index}}.",
                            "Add an Assert inside the loop so every item is checked.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Use Set auth at the top of a flow to run the whole scenario as a specific user, or switch identities part way through to test permissions.",
                    },
                ],
            },
            {
                id: "use-cases",
                title: "Where Flux fits",
                blocks: [
                    { t: "p", text: "Flux is useful any time you work with an HTTP API:" },
                    {
                        t: "ul",
                        items: [
                            "Exploring and debugging an API while you build it, with instant resends and a full console history.",
                            "Building a reusable request library for a service and sharing it with your team in a workspace.",
                            "Smoke-testing critical paths after a deploy with assertions and flows, without standing up a test framework.",
                            "Reproducing and sharing a bug: import a cURL from the browser, tweak it, and copy it back out.",
                            "Onboarding a new API fast: import its OpenAPI spec and get ready-to-send requests in seconds.",
                            "Chaining multi-step scenarios (login, create, poll, verify) that would otherwise need a script.",
                        ],
                    },
                ],
            },
            {
                id: "vs-postman",
                title: "How Flux compares",
                blocks: [
                    {
                        t: "p",
                        text: "Flux covers the everyday Postman and Insomnia workflow, with a few things that set it apart:",
                    },
                    {
                        t: "ul",
                        items: [
                            "Self-hosted by design: your accounts, collections and secrets live on your own backend, in Docker or a desktop app.",
                            "Scope-coloured templating and scope-aware autocomplete, so undefined variables and typos are visible before you send.",
                            "Right-click capture from a response into a variable or an assertion, no scripting needed.",
                            "One expression engine (path and JMESPath) shared across captures, asserts and saved values, with a built-in tester.",
                            "Visual flows with Wait/Poll, If and For each and a live run panel, built on the exact same send pipeline as single requests.",
                            "An Auth store of reusable identities that resolve at send time, so secrets rotate in one place.",
                            "No-code block scripting for both pre-request and post-response, with a code escape hatch when you want it.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Flux is intentionally focused and fast. It is not trying to be a giant API platform; it aims to make the daily request, inspect, capture, chain loop delightful.",
                    },
                ],
            },
        ],
    },
    {
        id: "administration",
        title: "Administration",
        admin: true,
        pages: [
            {
                id: "admin-overview",
                title: "Admin dashboard",
                blocks: [
                    {
                        t: "p",
                        text: "The Admin dashboard is where owners and administrators manage the instance. Open it from the profile menu (your avatar, top right) and choose Admin. It only appears if your role includes the Access the admin area permission.",
                    },
                    { t: "h", text: "Sections" },
                    {
                        t: "ul",
                        items: [
                            "Overview: system info, live request metrics (RPS, latency, status codes) and counts of every entity.",
                            "Settings: runtime switches (registration, maintenance, announcement banner) and a read-only view of the configuration.",
                            "Roles: create and edit roles and the permissions they grant.",
                            "Users: list and search accounts and assign roles.",
                            "Changelog: write this server's release notes.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Which sections you see depends on your permissions: a role without a given permission simply won't show that section, and the backend guards every admin endpoint regardless.",
                    },
                ],
            },
            {
                id: "admin-rbac",
                title: "Roles and permissions",
                blocks: [
                    {
                        t: "p",
                        text: "Flux uses role-based access control. Permissions are fixed in the code, where each one guards a real action. Roles bundle permissions and are stored in the database, so you create and edit them from the admin panel. Every user has exactly one role.",
                    },
                    { t: "h", text: "Built-in roles" },
                    {
                        t: "ul",
                        items: [
                            "Owner: full control. The first registered user. Cannot be deleted or reassigned, and always has every permission.",
                            "Administrator: manages the instance (settings, users, roles, changelog).",
                            "Editor: writes release notes and views metrics.",
                            "Member: the default role for new accounts, with no admin permissions.",
                        ],
                    },
                    { t: "h", text: "The permission catalog" },
                    {
                        t: "ul",
                        items: [
                            "admin.access: open the admin area.",
                            "metrics.read: view load and usage metrics.",
                            "settings.read / settings.write: view / change runtime settings.",
                            "users.read / users.manage: list users / assign their roles.",
                            "roles.manage: create, edit and delete roles.",
                            "changelog.read_drafts / changelog.write: see unpublished notes / edit the changelog.",
                        ],
                    },
                    { t: "h", text: "Rules and safeguards" },
                    {
                        t: "ul",
                        items: [
                            "Anti-escalation: you can only grant permissions you already hold.",
                            "The owner role cannot be assigned, renamed, or stripped of permissions.",
                            "A role assigned to users cannot be deleted; reassign them first.",
                            "System roles cannot be deleted, and there is always exactly one default role.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Editing a role takes effect immediately: affected users get the new permissions on their next request, because the permission cache is invalidated on every change.",
                    },
                ],
            },
            {
                id: "admin-users",
                title: "Managing users",
                blocks: [
                    {
                        t: "p",
                        text: "The Users section lists everyone on the instance. Search by name, and change a person's role from the dropdown beside them.",
                    },
                    {
                        t: "steps",
                        items: [
                            "Open Admin, then Users.",
                            "Find the person (use the search box on larger instances).",
                            "Pick a new role from the dropdown to apply it right away.",
                        ],
                    },
                    {
                        t: "note",
                        text: "The owner is shown but cannot be reassigned, because ownership is singular and set when the first account is created. You also can't grant a role that includes permissions you don't have yourself.",
                    },
                ],
            },
            {
                id: "admin-settings",
                title: "Instance settings",
                blocks: [
                    {
                        t: "p",
                        text: "Settings holds runtime switches stored in the database, plus a read-only view of the deployment configuration. Changes apply to everyone as soon as you save.",
                    },
                    { t: "h", text: "Registration" },
                    {
                        t: "p",
                        text: "Turn self-service sign-up on or off. When off, the sign-in screen hides the register form and the server rejects new accounts, except the very first one so a fresh instance can always be set up.",
                    },
                    { t: "h", text: "Maintenance mode" },
                    {
                        t: "p",
                        text: "Locks the app for everyone except admins, who keep full access so they can switch it back off. Non-admins see a maintenance screen with the message you set.",
                    },
                    { t: "h", text: "Announcement banner" },
                    {
                        t: "ul",
                        items: [
                            "Shown across the top of the app to everyone, at an info, warning or critical level.",
                            "Make it dismissible so users can close it, or sticky so it stays.",
                            "Schedule it with quick durations (show for 30 minutes up to a week) or an explicit start and end time.",
                        ],
                    },
                    { t: "h", text: "Configuration" },
                    {
                        t: "p",
                        text: "A read-only list of product-level settings (mode, storage backend, cache, session lifetimes, log level). Sensitive values such as hosts, credentials and signing keys are never shown.",
                    },
                ],
            },
            {
                id: "admin-changelog",
                title: "Editing the changelog",
                blocks: [
                    {
                        t: "p",
                        text: "The changelog has two independent channels. The official Flux channel is fetched from the upstream server and cached. This server's channel is your own release notes, which you write in the admin panel.",
                    },
                    { t: "h", text: "Writing release notes" },
                    {
                        t: "steps",
                        items: [
                            "Open Admin, then Changelog.",
                            "Click New, or Import to load a release from a JSON file or pasted JSON.",
                            "Give it a version and title, then build the body from content blocks.",
                            "Click Save: the release stays a private draft until you Publish it.",
                        ],
                    },
                    { t: "h", text: "Blocks" },
                    {
                        t: "p",
                        text: "Release notes are built from typed blocks: headings, paragraphs, lists, steps, change badges (added, changed, fixed, removed), code, notes, images, link buttons and interactive demos. Add blocks from the grouped palette, drag to reorder, duplicate or delete, and check the live preview as you go.",
                    },
                    { t: "h", text: "Publishing" },
                    {
                        t: "ul",
                        items: [
                            "Drafts are visible only to users who can read drafts.",
                            "Publish to make a release public; it then appears under This server in What's new.",
                            "Unpublish to hide it again, and reorder releases with the up and down controls.",
                        ],
                    },
                    {
                        t: "note",
                        text: "Readers open release notes from What's new in the Help menu. A dot appears there when there is an unseen release on either channel.",
                    },
                ],
            },
        ],
    },
];
