// Flux desktop core.
//
// The only native surface the frontend needs: `send_http`, a drop-in
// replacement for the web backend's `POST /api/proxy` endpoint. On the web,
// requests are relayed through the FastAPI proxy to dodge CORS; here they are
// performed directly with reqwest, so localhost / VPN / private hosts are
// reachable and there is no CORS at all.
//
// The request/response contracts (field names included) mirror
// `ProxyRequestDTO` / `ProxyResponseDTO` on the backend and
// `OutgoingRequest` / `ProxyResponse` in the frontend, so the TypeScript side
// can switch transports without any mapping layer.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};

/// Same default as the web backend's PROXY_TIMEOUT_SECONDS.
const TIMEOUT_SECONDS: u64 = 30;

fn default_method() -> String {
    "GET".to_string()
}

#[derive(Debug, Deserialize)]
pub struct ProxyRequest {
    #[serde(default = "default_method")]
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProxyResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: u64,
}

/// Find the first `{{ name }}` template left in the URL — same guard rail (and
/// same character class: word chars, `.`, `$`, `-`) as the web proxy, so the
/// user gets the familiar "unresolved variable" error instead of a DNS one.
fn first_unresolved_template(url: &str) -> Option<String> {
    let bytes = url.as_bytes();
    let mut i = 0;
    while i + 1 < bytes.len() {
        if &bytes[i..i + 2] == b"{{" {
            if let Some(rel_end) = url[i + 2..].find("}}") {
                let inner = url[i + 2..i + 2 + rel_end].trim();
                let valid = !inner.is_empty()
                    && inner
                        .chars()
                        .all(|c| c.is_alphanumeric() || matches!(c, '_' | '.' | '$' | '-'));
                if valid {
                    return Some(inner.to_string());
                }
                i += 2 + rel_end + 2;
                continue;
            }
            break;
        }
        i += 1;
    }
    None
}

/// Loopback targets get a pass on TLS verification: hitting a local dev server
/// over https with a self-signed certificate is exactly the desktop use-case.
/// Every other host is verified normally.
fn is_loopback(url: &reqwest::Url) -> bool {
    match url.host_str() {
        Some(host) => {
            // IPv6 hosts come back bracketed ("[::1]").
            let host = host.trim_start_matches('[').trim_end_matches(']');
            host.eq_ignore_ascii_case("localhost")
                || host
                    .parse::<std::net::IpAddr>()
                    .map(|ip| ip.is_loopback())
                    .unwrap_or(false)
        }
        None => false,
    }
}

#[tauri::command]
async fn send_http(req: ProxyRequest) -> Result<ProxyResponse, String> {
    // Guard rails identical to the web proxy, for the same friendly errors.
    if let Some(name) = first_unresolved_template(&req.url) {
        return Err(format!(
            "URL has an unresolved variable: {{{{{name}}}}}. \
             Select the right environment or define the variable."
        ));
    }
    let lower = req.url.to_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err("URL must start with http:// or https://".to_string());
    }
    let url = reqwest::Url::parse(&req.url).map_err(|e| format!("Invalid URL: {e}"))?;

    let method = reqwest::Method::from_bytes(req.method.to_uppercase().as_bytes())
        .map_err(|_| format!("Invalid HTTP method: {}", req.method))?;

    let mut headers = HeaderMap::new();
    for (key, value) in &req.headers {
        let name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|_| format!("Invalid header name: {key}"))?;
        let value = HeaderValue::from_str(value)
            .map_err(|_| format!("Invalid value for header {key}"))?;
        headers.append(name, value);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECONDS))
        .redirect(reqwest::redirect::Policy::limited(10))
        .danger_accept_invalid_certs(is_loopback(&url))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let mut builder = client.request(method, url).headers(headers);
    if let Some(body) = req.body {
        if !body.is_empty() {
            builder = builder.body(body);
        }
    }

    let started = Instant::now();
    let response = builder.send().await.map_err(|e| {
        if e.is_timeout() {
            format!("Request timed out after {TIMEOUT_SECONDS}s")
        } else if e.is_connect() {
            format!(
                "Could not reach the host. Check the URL, the selected environment, \
                 and your network connection. ({e})"
            )
        } else {
            format!("Request failed: {e}")
        }
    })?;

    let status = response.status();
    let mut out_headers: HashMap<String, String> = HashMap::new();
    for (name, value) in response.headers() {
        let value = String::from_utf8_lossy(value.as_bytes()).into_owned();
        out_headers
            .entry(name.as_str().to_string())
            .and_modify(|existing| {
                existing.push_str(", ");
                existing.push_str(&value);
            })
            .or_insert(value);
    }

    // Read the body before stopping the clock, matching how the web proxy
    // measures (httpx buffers the body inside the request call).
    let bytes = response
        .bytes()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Request timed out after {TIMEOUT_SECONDS}s")
            } else {
                format!("Failed to read response body: {e}")
            }
        })?;
    let time_ms = started.elapsed().as_millis() as u64;

    Ok(ProxyResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers: out_headers,
        body: String::from_utf8_lossy(&bytes).into_owned(),
        time_ms,
        size_bytes: bytes.len() as u64,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_http])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
