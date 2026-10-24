const json = (schema: object) => ({ content: { 'application/json': { schema } } });
const ok = (description = 'Successful response') => ({ description, ...json({ $ref: '#/components/schemas/SuccessResponse' }) });
const created = { description: 'Resource created', ...json({ $ref: '#/components/schemas/SuccessResponse' }) };
const validation = { description: 'Request validation failed', ...json({ $ref: '#/components/schemas/ErrorResponse' }) };
const unauthorizedResponse = { description: 'Authentication is required', ...json({ $ref: '#/components/schemas/ErrorResponse' }) };
const forbiddenResponse = { description: 'Insufficient role or resource access', ...json({ $ref: '#/components/schemas/ErrorResponse' }) };
const bearer = [{ bearerAuth: [] }];
const operation = (summary: string, options: { secured?: boolean; admin?: boolean; request?: object; success?: object; successStatus?: '200' | '201' | '204' } = {}) => ({
  summary, ...(options.secured ? { security: bearer } : {}), ...(options.admin ? { description: 'Requires an authenticated ADMIN user.' } : {}),
  ...(options.request ? { requestBody: { required: true, ...json(options.request) } } : {}),
  responses: {
    [options.successStatus ?? '200']: options.success ?? ((options.successStatus ?? '200') === '201' ? created : ok()),
    '400': validation,
    '404': { description: 'Resource not found', ...json({ $ref: '#/components/schemas/ErrorResponse' }) },
    ...(options.secured ? { '401': unauthorizedResponse } : {}), ...(options.admin ? { '403': forbiddenResponse } : {}),
    '500': { description: 'Unexpected server error', ...json({ $ref: '#/components/schemas/ErrorResponse' }) },
  },
});

export const openapi = {
  openapi: '3.1.0',
  info: { title: 'Mystic Tarot AI API', version: '1.0.0', description: 'REST API cho ứng dụng Tarot AI. Access token dùng Bearer; refresh token được giữ trong cookie HttpOnly.' },
  servers: [{ url: '/api/v1', description: 'API phiên bản 1' }],
  tags: [{ name: 'Authentication' }, { name: 'Users' }, { name: 'Tarot cards' }, { name: 'Readings' }, { name: 'Knowledge admin' }, { name: 'Health' }],
  paths: {
    '/auth/register': { post: { ...operation('Tạo tài khoản người dùng', { request: { $ref: '#/components/schemas/RegisterInput' }, successStatus: '201' }), tags: ['Authentication'] } },
    '/auth/login': { post: { ...operation('Đăng nhập', { request: { $ref: '#/components/schemas/LoginInput' } }), tags: ['Authentication'] } },
    '/auth/guest': { post: { ...operation('Bắt đầu trải bài với tư cách khách', { successStatus: '201' }), tags: ['Authentication'], responses: { '201': created, '429': { description: 'Guest session creation limit' } } } },
    '/auth/refresh': { post: { summary: 'Rotate refresh token cookie', security: [{ cookieAuth: [] }], responses: { '200': ok(), '401': unauthorizedResponse } } },
    '/auth/logout': { post: { summary: 'Revoke refresh token cookie', security: [{ cookieAuth: [] }], responses: { '204': { description: 'Session revoked' } } } },
    '/auth/me': { get: { ...operation('Lấy tài khoản hiện tại', { secured: true }), tags: ['Authentication'] } },
    '/users/me': {
      get: { ...operation('Lấy hồ sơ cá nhân', { secured: true }), tags: ['Users'] },
      patch: { ...operation('Cập nhật tên hiển thị', { secured: true, request: { $ref: '#/components/schemas/ProfileInput' } }), tags: ['Users'] },
      delete: { ...operation('Xóa tài khoản và dữ liệu liên quan', { secured: true }), tags: ['Users'] },
    },
    '/tarot-cards': { get: { summary: 'Danh sách Tarot có search, filter và pagination', tags: ['Tarot cards'], parameters: [{ in: 'query', name: 'page', schema: { type: 'integer', default: 1 } }, { in: 'query', name: 'limit', schema: { type: 'integer', default: 24, maximum: 100 } }, { in: 'query', name: 'search', schema: { type: 'string' } }, { in: 'query', name: 'arcana', schema: { type: 'string', enum: ['MAJOR', 'MINOR'] } }, { in: 'query', name: 'suit', schema: { type: 'string' } }], responses: { '200': ok(), '400': validation } } },
    '/tarot-cards/{id}': { get: { ...operation('Lấy lá bài theo UUID'), tags: ['Tarot cards'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] } },
    '/tarot-cards/slug/{slug}': { get: { ...operation('Lấy lá bài theo slug'), tags: ['Tarot cards'], parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }] } },
    '/readings': {
      get: { ...operation('Lịch sử của người dùng hiện tại', { secured: true }), tags: ['Readings'], parameters: [{ in: 'query', name: 'page', schema: { type: 'integer', default: 1 } }, { in: 'query', name: 'limit', schema: { type: 'integer', default: 10, maximum: 50 } }, { in: 'query', name: 'search', schema: { type: 'string' } }] },
      post: { ...operation('Rút và lưu spread do backend chọn', { secured: true, request: { $ref: '#/components/schemas/CreateReadingInput' }, successStatus: '201' }), tags: ['Readings'], parameters: [{ in: 'header', name: 'Idempotency-Key', schema: { type: 'string', format: 'uuid' } }] },
    },
    '/readings/{id}': { get: { ...operation('Lấy một lần trải bài của chủ sở hữu', { secured: true }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] }, delete: { ...operation('Xóa lần trải bài của chủ sở hữu', { secured: true }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] } },
    '/readings/{id}/interpretation': {
      get: { ...operation('Lấy kết quả diễn giải đã lưu', { secured: true }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] },
      post: { ...operation('Tạo diễn giải RAG, giới hạn theo lượt gọi/ngày', { secured: true }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': ok(), '401': unauthorizedResponse, '409': { description: 'An interpretation is already in progress or reindex is required' }, '429': { description: 'AI daily quota limit' }, '502': { description: 'Gemini upstream or output validation error' } } },
    },
    '/readings/{id}/chat': {
      get: { ...operation('Lấy lịch sử chat tiếp nối trải bài', { secured: true }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] },
      post: { ...operation('Hỏi tiếp dựa trên trải bài, diễn giải, lịch sử chat và nguồn RAG', { secured: true, request: { $ref: '#/components/schemas/ReadingChatInput' }, successStatus: '201' }), tags: ['Readings'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '201': created, '401': unauthorizedResponse, '403': { description: 'The guest follow-up allowance has been used' }, '409': { description: 'The original reading must be interpreted first' }, '429': { description: 'AI daily quota limit' }, '502': { description: 'Gemini upstream or output validation error' } } },
    },
    '/admin/knowledge/documents': {
      get: { ...operation('Danh sách tài liệu tri thức', { secured: true, admin: true }), tags: ['Knowledge admin'] },
      post: { ...operation('Thêm và ingest tài liệu', { secured: true, admin: true, request: { $ref: '#/components/schemas/KnowledgeDocumentInput' }, successStatus: '201' }), tags: ['Knowledge admin'] },
    },
    '/admin/knowledge/documents/{id}': { delete: { ...operation('Xóa tài liệu và chunks liên quan', { secured: true, admin: true }), tags: ['Knowledge admin'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] } },
    '/admin/knowledge/ingest': { post: { ...operation('Ingest Markdown từ knowledge/tarot', { secured: true, admin: true }), tags: ['Knowledge admin'] } },
    '/admin/knowledge/reindex': { post: { ...operation('Re-embed toàn bộ tài liệu bằng model/dimension hiện tại', { secured: true, admin: true }), tags: ['Knowledge admin'] } },
    '/admin/knowledge/search': { post: { ...operation('Thử nghiệm vector search', { secured: true, admin: true, request: { type: 'object', required: ['query'], properties: { query: { type: 'string', minLength: 3 }, topK: { type: 'integer', minimum: 1, maximum: 20 } } } }), tags: ['Knowledge admin'] } },
    '/health': { get: { summary: 'Liveness check', tags: ['Health'], responses: { '200': ok() } } },
    '/health/ready': { get: { summary: 'SQLite và khả năng tìm kiếm cosine readiness; không trả secrets', tags: ['Health'], responses: { '200': ok(), '503': { description: 'Database unavailable' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, cookieAuth: { type: 'apiKey', in: 'cookie', name: 'refreshToken' } },
    schemas: {
      SuccessResponse: { type: 'object', required: ['success', 'data', 'meta'], properties: { success: { const: true }, data: {}, meta: {} } },
      ErrorResponse: { type: 'object', required: ['success', 'error'], properties: { success: { const: false }, error: { type: 'object', required: ['code', 'message', 'details'], properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'array' } } } } },
      RegisterInput: { type: 'object', required: ['email', 'username', 'password', 'displayName'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, username: { type: 'string', minLength: 3, maxLength: 24, pattern: '^[a-z0-9][a-z0-9._-]{1,22}[a-z0-9]$' }, password: { type: 'string', minLength: 10, maxLength: 72 }, displayName: { type: 'string', minLength: 2, maxLength: 100 } } },
      LoginInput: { type: 'object', required: ['identifier', 'password'], properties: { identifier: { type: 'string', description: 'Email or username.' }, email: { type: 'string', format: 'email', deprecated: true }, password: { type: 'string', minLength: 1, maxLength: 72 } } },
      ProfileInput: { type: 'object', required: ['displayName'], properties: { displayName: { type: 'string', minLength: 2, maxLength: 100, description: 'Trimmed; control characters are not allowed.' } } },
      CreateReadingInput: { type: 'object', required: ['querentName', 'querentBirthDate', 'question', 'topic', 'spreadType'], properties: { querentName: { type: 'string', minLength: 2, maxLength: 80 }, querentBirthDate: { type: 'string', format: 'date', description: 'Must be between 1900-01-01 and today.' }, querentGender: { type: 'string', enum: ['', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] }, question: { type: 'string', minLength: 8, maxLength: 1000 }, topic: { type: 'string', enum: ['LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL'] }, spreadType: { type: 'string', enum: ['ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS'] }, idempotencyKey: { type: 'string', format: 'uuid' } } },
      ReadingChatInput: { type: 'object', required: ['content'], properties: { content: { type: 'string', minLength: 2, maxLength: 1200, description: 'Trimmed before validation and storage.' } } },
      KnowledgeDocumentInput: { type: 'object', required: ['title', 'content'], properties: { title: { type: 'string', minLength: 2, maxLength: 250 }, content: { type: 'string', minLength: 30, maxLength: 100000 }, metadata: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean', 'null'] } } } },
    },
  },
};
