// Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
// Use the configured HTTPS origin when hosted; otherwise restrict to loopback.
import { deployment } from "../deployment";
export function localOrigin(req: Request) {
  try {
    const origin = new URL(req.headers.get("origin") ?? "");
    const settings = deployment();
    if (settings.origin) return req.headers.get("origin") === settings.origin;
    return (
      ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) &&
      origin.host === req.headers.get("host") &&
      ["http:", "https:"].includes(origin.protocol)
    );
  } catch {
    return false;
  }
}
