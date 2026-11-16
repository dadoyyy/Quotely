import type { CatalogItemRow } from "../rows";

/** A price-list item as the model sees it: a short key instead of an id, and no money at all. */
export interface Candidate {
  key: string;
  item: CatalogItemRow;
}

export interface AiMatch {
  /** A real catalog item id, checked against the candidates. */
  itemId: string;
  /** A quantity the user wrote themselves, or null. Never a guess. */
  quantity: string | null;
  reason: string;
}

export interface AiResult {
  matches: AiMatch[];
  /** Things the job needs that aren't on the price list. */
  unmatched: string[];
}

export type AiErrorKind = "not_configured" | "quota" | "auth" | "blocked" | "timeout" | "bad_response" | "input" | "failed";

/** An error whose message is safe to show to the person using the app. */
export class AiError extends Error {
  constructor(
    public kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface AiImage {
  mimeType: string;
  /** Base64, no data: prefix. */
  data: string;
}
