// All chain access is NEAR TESTNET only. There is no mainnet code path.
export const NETWORK = "testnet" as const;
export const EXPLORER = "https://testnet.nearblocks.io";
const RPCS = (import.meta.env.VITE_RPC_URLS as string | undefined)?.split(",").map(s => s.trim()) ??
  ["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"];

async function rpc(method: string, params: unknown): Promise<any> {
  let last: unknown;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "vm", method, params }) });
      const j = await r.json();
      if (j.error) throw new Error(JSON.stringify(j.error.data ?? j.error));
      return j.result;
    } catch (e) { last = e; }
  }
  throw last;
}
const nearFromYocto = (y: string, dec = 24) => Number(BigInt(y) / 10n ** BigInt(dec - 4)) / 1e4;

export async function getNearBalance(id: string) {
  const r = await rpc("query", { request_type: "view_account", finality: "final", account_id: id });
  return nearFromYocto(r.amount);
}
export async function getFtBalance(contract: string, id: string, decimals: number) {
  const r = await rpc("query", { request_type: "call_function", finality: "final", account_id: contract,
    method_name: "ft_balance_of", args_base64: btoa(JSON.stringify({ account_id: id })) });
  return nearFromYocto(JSON.parse(new TextDecoder().decode(new Uint8Array(r.result))), decimals);
}
export function toYocto(s: string) {
  const [i, f = ""] = s.split(".");
  return (BigInt(i || "0") * 10n ** 24n + BigInt((f + "0".repeat(24)).slice(0, 24))).toString();
}
export interface Tx { hash: string; from: string; to: string; time: string; kind: string }
export async function getHistory(id: string): Promise<Tx[]> {
  const r = await fetch(`https://api-testnet.nearblocks.io/v1/account/${id}/txns?per_page=10`);
  if (!r.ok) throw new Error("NearBlocks " + r.status);
  const j = await r.json();
  return (j.txns ?? []).map((t: any) => ({ hash: t.transaction_hash, from: t.predecessor_account_id, to: t.receiver_account_id,
    time: new Date(Number(BigInt(t.block_timestamp) / 1000000n)).toLocaleString(), kind: t.actions?.[0]?.action ?? "" }));
}
// Estimate only: testnet tokens have no market value. Uses public NEAR/USD price.
export async function getNearUsd(): Promise<number | null> {
  try { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd");
    return (await r.json()).near.usd; } catch { return null; }
}

// Burrow lending on testnet (contract seen receiving calls from wrap.testnet on NearBlocks testnet).
export const BURROW = "contract.1638481328.burrow.testnet";
export interface BurrowPos { supplied: { token_id: string; balance: string }[]; collateral: { token_id: string; balance: string }[]; borrowed: { token_id: string; balance: string }[] }
// Read-only view call: get_account. Returns null if the account has no Burrow position.
export async function getBurrowPosition(id: string): Promise<BurrowPos | null> {
  const r = await rpc("query", { request_type: "call_function", finality: "final", account_id: BURROW,
    method_name: "get_account", args_base64: btoa(JSON.stringify({ account_id: id })) });
  return JSON.parse(new TextDecoder().decode(new Uint8Array(r.result)));
}
