// The agent can only turn intent into a Proposal. It has no access to wallet, policy storage or signing.
// v0.1 is a deterministic parser. To use an LLM, replace parseIntent with a call that returns the same
// Proposal shape (keep the API key server-side); the Policy Engine still decides everything.
import type { Proposal } from "./policy";
export function parseIntent(text: string): Proposal | null {
  const t = text.trim();
  const m = t.match(/(?:send|transfer|pay)\s+([\d.]+)\s*near\s+to\s+([a-z0-9._-]+)/i);
  if (m) return { type: "transfer", amountNear: parseFloat(m[1]), receiver: m[2].toLowerCase(), label: `Send ${m[1]} NEAR to ${m[2].toLowerCase()}` };
  if (/(change|raise|increase|edit|disable|remove).*(limit|policy|cap|rule|kill)/i.test(t))
    return { type: "policy_change", label: t };
  return null;
}
