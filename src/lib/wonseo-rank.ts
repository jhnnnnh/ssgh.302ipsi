import type { WonseoCard } from "@/lib/database.types";

/**
 * 카드 목록(이미 sort_order 순서대로 정렬돼 있다고 가정)에서 각 카드에 보여줄 지망 순위
 * 라벨을 계산한다. rank_mode === "auto"인 카드끼리만 화면 순서대로 세어서 "N지망"을 매기고,
 * "unassigned" 카드는 순번 계산에서 완전히 빠진 채 "미지정"으로, "custom" 카드는 직접 입력한
 * 텍스트를 그대로 보여준다. 위치(배열 순서) 자체는 절대 건드리지 않는다.
 */
export function computeRankLabels(cards: WonseoCard[]): string[] {
  let count = 0;
  return cards.map((card) => {
    if (card.rank_mode === "auto") {
      count += 1;
      return `${count}지망`;
    }
    if (card.rank_mode === "custom") {
      return card.rank?.trim() || "직접입력";
    }
    return "미지정";
  });
}
