import { randomInt } from 'node:crypto';

export function secureShuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

export const spreadCounts = { ONE_CARD: 1, THREE_CARDS: 3, FIVE_CARDS: 5 } as const;
export const spreadPositions = {
  ONE_CARD: ['Trọng tâm'],
  THREE_CARDS: ['Quá khứ', 'Hiện tại', 'Khả năng phía trước'],
  FIVE_CARDS: ['Bối cảnh', 'Thách thức', 'Nguồn lực', 'Hướng phát triển', 'Lời khuyên'],
} as const;

export function drawCards<T extends { id: string }>(cards: readonly T[], spreadType: keyof typeof spreadCounts) {
  const count = spreadCounts[spreadType];
  if (cards.length < count) throw new Error('Not enough cards in the deck.');
  return secureShuffle(cards).slice(0, count).map((card, index) => ({
    tarotCardId: card.id,
    position: index + 1,
    positionName: spreadPositions[spreadType][index]!,
    orientation: randomInt(2) === 0 ? 'UPRIGHT' as const : 'REVERSED' as const,
  }));
}
