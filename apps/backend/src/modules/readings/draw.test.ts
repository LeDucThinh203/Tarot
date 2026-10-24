import { drawCards, secureShuffle } from './draw.js';
import { tarotCards } from '../tarot-cards/cards-data.js';

describe('server-side card draw', () => {
  it('contains all 78 unique cards with original upright and reversed meanings', () => {
    expect(tarotCards).toHaveLength(78);
    expect(new Set(tarotCards.map((card) => card.slug)).size).toBe(78);
    expect(tarotCards.every((card) => card.uprightMeaning.length > 30 && card.reversedMeaning.length > 30)).toBe(true);
  });

  it('shuffles without losing or duplicating entries', () => {
    const deck = Array.from({ length: 78 }, (_, index) => ({ id: String(index) }));
    const shuffled = secureShuffle(deck);
    expect(shuffled).toHaveLength(78);
    expect(new Set(shuffled.map((card) => card.id)).size).toBe(78);
    expect(shuffled).not.toBe(deck);
  });

  it('draws the right number of distinct cards and assigns spread positions server-side', () => {
    const deck = Array.from({ length: 78 }, (_, index) => ({ id: String(index) }));
    const cards = drawCards(deck, 'FIVE_CARDS');
    expect(cards).toHaveLength(5);
    expect(new Set(cards.map((card) => card.tarotCardId)).size).toBe(5);
    expect(cards.map((card) => card.positionName)).toEqual(['Bối cảnh', 'Thách thức', 'Nguồn lực', 'Hướng phát triển', 'Lời khuyên']);
    expect(cards.every((card) => card.orientation === 'UPRIGHT' || card.orientation === 'REVERSED')).toBe(true);
  });
});
