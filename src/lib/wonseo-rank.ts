import type { WonseoCard } from "@/lib/database.types";

/** 자동 배정이 켜져 있을 때: 카드 목록(이미 sort_order 순서)을 그대로 세어 "N지망"을 매긴다. */
export function computeAutoRankLabels(cards: WonseoCard[]): string[] {
  return cards.map((_, i) => `${i + 1}지망`);
}
