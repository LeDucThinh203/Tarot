import { tarotCards } from './cards-data.js';

describe('Tarot card catalog', () => {
  it('contains 78 cards with unique slugs and complete upright/reversed meanings', () => {
    expect(tarotCards).toHaveLength(78);
    expect(new Set(tarotCards.map((card) => card.slug)).size).toBe(78);
    expect(tarotCards.every((card) => card.name && card.nameVi && card.description && card.uprightMeaning && card.reversedMeaning)).toBe(true);
    expect(tarotCards.filter((card) => card.arcana === 'MAJOR')).toHaveLength(22);
    expect(tarotCards.filter((card) => card.arcana === 'MINOR')).toHaveLength(56);
  });
});
