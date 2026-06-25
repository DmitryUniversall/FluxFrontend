// Framework-agnostic shared types.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type JsonKind = "object" | "array" | "string" | "number" | "boolean" | "null";

/** A path into a JSON value: object keys and array indices. */
export type JsonPath = Array<string | number>;
