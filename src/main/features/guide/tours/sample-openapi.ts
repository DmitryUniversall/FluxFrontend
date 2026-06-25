// A small but complete OpenAPI 3 document the import tutorial auto-fills into the
// importer, so the user can see parsing, selection and destination on real data
// without pasting anything. Two tags, path/query params and request bodies.
export const SAMPLE_OPENAPI = JSON.stringify(
    {
        openapi: "3.0.0",
        info: { title: "Tasks API (demo)", version: "1.0.0" },
        servers: [{ url: "https://api.example.com" }],
        paths: {
            "/tasks": {
                get: {
                    tags: ["Tasks"],
                    summary: "List tasks",
                    operationId: "listTasks",
                    parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
                    responses: { "200": { description: "OK" } },
                },
                post: {
                    tags: ["Tasks"],
                    summary: "Create a task",
                    operationId: "createTask",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { title: { type: "string" }, done: { type: "boolean" } },
                                },
                            },
                        },
                    },
                    responses: { "201": { description: "Created" } },
                },
            },
            "/tasks/{id}": {
                get: {
                    tags: ["Tasks"],
                    summary: "Get a task",
                    operationId: "getTask",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: { "200": { description: "OK" } },
                },
                delete: {
                    tags: ["Tasks"],
                    summary: "Delete a task",
                    operationId: "deleteTask",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: { "204": { description: "No Content" } },
                },
            },
            "/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Log in",
                    operationId: "login",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { username: { type: "string" }, password: { type: "string" } },
                                },
                            },
                        },
                    },
                    responses: { "200": { description: "OK" } },
                },
            },
        },
    },
    null,
    2,
);
