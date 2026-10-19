import { Receiver } from "@upstash/qstash";

export function isQStashConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
      process.env.QSTASH_NEXT_SIGNING_KEY,
  );
}

/** Verify a QStash webhook signature against the raw request body. */
export async function verifyQStash(
  body: string,
  signature: string,
): Promise<boolean> {
  if (!isQStashConfigured()) return false;
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
  try {
    return await receiver.verify({ body, signature });
  } catch {
    return false;
  }
}
