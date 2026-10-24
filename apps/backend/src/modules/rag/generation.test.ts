import { validateInterpretationOutput } from './generation.service.js';
import { AppError } from '../../common/errors.js';

describe('Gemini structured response validation', () => {
  const cardId = 'c10b60bd-04c5-4992-bc20-0cb80e7f73c1';
  const reading = { querentName: null, querentBirthDate: null, querentGender: null, question: 'Tôi nên quan sát điều gì ở công việc?', topic: 'CAREER', spreadType: 'ONE_CARD', cards: [{ id: cardId, name: 'The Star', nameVi: 'Ngôi Sao', positionName: 'Trọng tâm', orientation: 'UPRIGHT', meaning: 'Hy vọng và sự hồi phục có thể trở lại.' }] };
  const validOutput = { summary: 'Một giai đoạn mới đang mở ra cho bạn.', overallMessage: 'Hãy giữ một nhịp điệu bền vững và chú ý các cơ hội đang dần hiện rõ.', cards: [{ cardId, position: 'Trọng tâm', meaning: 'Hy vọng có thể được nuôi dưỡng bằng hành động nhỏ.', interpretation: 'Trong câu hỏi này, lá bài gợi ý tìm lại điều đem đến cảm hứng và xem nó có thể được đưa vào công việc như thế nào.' }], connections: [], opportunities: ['Bạn có thể thử một hướng mới ở quy mô nhỏ.'], challenges: ['Đừng đòi hỏi mình phải có mọi câu trả lời ngay lập tức.'], advice: ['Ghi lại một điều khiến bạn tò mò và dành thời gian khám phá.'], disclaimer: 'Đây là gợi ý chiêm nghiệm, không phải dự đoán chắc chắn.', sources: [] };
  it('accepts valid JSON and keeps the exact card and spread position', () => {
    expect(validateInterpretationOutput(JSON.stringify(validOutput), reading).cards[0]?.cardId).toBe(cardId);
  });
  it('rejects malformed output and invented cards', () => {
    expect(() => validateInterpretationOutput('{not json', reading)).toThrowError(AppError);
    const invented = { ...validOutput, cards: [{ ...validOutput.cards[0]!, cardId: 'c10b60bd-04c5-4992-bc20-0cb80e7f73c2' }] };
    expect(() => validateInterpretationOutput(JSON.stringify(invented), reading)).toThrowError('changed a drawn card');
  });
});
