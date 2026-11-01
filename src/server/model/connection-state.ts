import { createHash } from "node:crypto";
declare global {
  var openaiVerifiedConnection:
    { fingerprint: string; model: string; at: string } | undefined;
}
export function recordOpenAISuccess(key: string, model: string) {
  globalThis.openaiVerifiedConnection = {
    fingerprint: createHash("sha256").update(key).digest("hex"),
    model,
    at: new Date().toISOString(),
  };
}
export function openAIConnectionState(key: string | undefined, model: string) {
  const state = globalThis.openaiVerifiedConnection;
  const verified =
    !!key &&
    !!state &&
    state.model === model &&
    state.fingerprint === createHash("sha256").update(key).digest("hex");
  return { verified, verified_at: verified ? state!.at : null };
}
