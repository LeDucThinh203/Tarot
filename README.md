# Mystic Tarot AI

Ứng dụng Tarot tiếng Việt với React/Vite, Express/TypeScript, Prisma + SQLite và Gemini. Reading được rút, lưu và phân quyền ở backend; diễn giải dùng nguồn tri thức truy xuất thật.

Tarot được trình bày như một công cụ chiêm nghiệm, không phải lời tiên tri chắc chắn hay lời khuyên y tế, pháp lý hoặc tài chính chuyên môn.

## Kiến trúc

- Frontend: React, Vite, TypeScript, React Router, TanStack Query, Axios, React Hook Form, Zod, Tailwind CSS và Framer Motion.
- Backend: Express, TypeScript, Prisma 7 với SQLite driver adapter, JWT, bcryptjs, Pino, Swagger và SDK chính thức @google/genai.
- SQLite lưu user, session, 78 lá bài, reading, diễn giải, tài liệu, embedding JSON và usage trong `apps/backend/prisma/dev.db`.
- Prisma xử lý CRUD. RAG tính cosine similarity chính xác trong backend trên các embedding đã lưu; phù hợp với kho Tarot local nhỏ, không cần database server hay Docker.

## Luồng RAG

1. React gửi câu hỏi, chủ đề và spread. Backend validate, rút bài bằng crypto.randomInt và lưu các lá/vị trí/chiều trong transaction. Idempotency-Key hỗ trợ retry.
2. Sau khi người dùng xác nhận các lá, backend dựng query từ câu hỏi, chủ đề, vị trí và lá đã lưu.
3. Gemini embedding model tạo vector query; dimension và giá trị hữu hạn được kiểm tra.
4. Backend quét embedding SQLite, tính cosine similarity, áp dụng RAG_TOP_K, RAG_SIMILARITY_THRESHOLD và ngân sách context; chunk trùng bị bỏ.
5. Prompt tách nội dung nguồn như dữ liệu không đáng tin cậy. Nếu không có chunk phù hợp, model được yêu cầu nêu giới hạn và không tạo citation.
6. Gemini trả JSON. Zod kiểm tra cấu trúc; backend đối chiếu card ID và vị trí với spread. Citation chỉ được chấp nhận khi chunk ID nằm trong kết quả retrieval; source/title lấy từ DB.
7. Backend lưu kết quả, nguồn và AI usage trước khi trả về React.

Markdown trong knowledge/tarot và ý nghĩa 78 lá từ catalog seed được chuẩn hóa, chia chunk có overlap, checksum, embed theo batch và lưu trong SQLite. Đổi model embedding cần reindex có chủ đích. Tìm kiếm hiện quét toàn bộ embedding trong bộ nhớ; với kho dữ liệu lớn, hãy chuyển sang PostgreSQL + pgvector và thêm index vector.

## Yêu cầu và chạy local

Cần Node.js 22+ và npm 10+. SQLite chạy như một file local, không cần Docker hoặc dịch vụ database. Gemini API key cần cho ingestion và diễn giải AI.

1. Tạo file môi trường; thay hai JWT secret bằng giá trị ngẫu nhiên khác nhau, tối thiểu 32 ký tự. Không commit .env.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Điền GEMINI_API_KEY vào `.env` ở root. Không đặt key trong VITE_* hoặc frontend. `DATABASE_URL` mặc định là `file:./prisma/dev.db`.

2. Cài dependencies:

```powershell
npm install
```

3. Tạo schema và seed đủ 78 lá:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Lệnh seed tạo 78 lá bài và hai tài khoản local nếu bốn biến `SEED_*` được điền trong `.env`.

4. Ingest tri thức. Lệnh này gọi Gemini embedding và có thể phát sinh chi phí:

```powershell
npm run rag:ingest
```

Khi đổi model embedding, chủ động reindex toàn bộ tài liệu:

```powershell
npm run rag:ingest -- --reindex
```

5. Chạy cả API và giao diện:

```powershell
npm run dev
```

Frontend: http://localhost:5173 · API: http://localhost:3000/api/v1 · Swagger: http://localhost:3000/api/docs · OpenAPI JSON: http://localhost:3000/api/openapi.json

Muốn chạy riêng, dùng `npm run dev:frontend`, `npm run dev:backend` hoặc `npm run server` để chạy backend.

## Tài khoản local

Seed local tạo tài khoản ADMIN và USER từ các biến `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_EMAIL` và `SEED_USER_PASSWORD` trong `.env`. Mật khẩu được bcrypt hash trước khi Prisma lưu. Chạy seed lại sẽ đặt lại mật khẩu theo `.env`; chỉ dùng cấu hình này cho development. Không có mật khẩu mặc định. API knowledge chỉ cho role ADMIN.

## Scripts và kiểm tra

- npm run build
- npm run lint
- npm run typecheck
- npm run test
- npm run server · npm run db:generate · npm run db:migrate · npm run db:seed · npm run rag:ingest

Test thường không gọi Gemini. Bộ test hiện có kiểm tra auth primitives, chia chunk, embedding dimension, cosine retrieval, citations, structured output, rút bài và HTTP validation/health. Migration và seed tạo file SQLite local.

## Cấu hình chính

- DATABASE_URL: SQLite file URL, mặc định `file:./prisma/dev.db`.
- GEMINI_API_KEY: chỉ backend; để trống thì diễn giải báo lỗi cấu hình.
- GEMINI_MODEL: model sinh nội dung, mặc định gemini-3.8-flash.
- GEMINI_EMBEDDING_MODEL: model embedding riêng, mặc định gemini-embedding-001.
- GEMINI_EMBEDDING_DIMENSION: số chiều embedding; mặc định 768. Đổi model/dimension cần reindex.
- JWT_ACCESS_SECRET và JWT_REFRESH_SECRET: khác nhau; production từ chối placeholder.
- COOKIE_SECURE: phải true trong production HTTPS; FRONTEND_URL là origin duy nhất được CORS cho phép.
- RAG_TOP_K, RAG_SIMILARITY_THRESHOLD, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP: retrieval/ingestion limits.
- AI_DAILY_LIMIT_PER_USER: mặc định 8 diễn giải mỗi user/ngày.

Access token ngắn hạn nằm trong bộ nhớ React. Refresh token xoay vòng, lưu dạng hash trong database và đặt vào cookie HttpOnly.

## API

- Authentication: POST /auth/register, /login, /refresh, /logout; GET /auth/me.
- User: GET/PATCH/DELETE /users/me.
- Tarot: GET /tarot-cards, /:id, /slug/:slug.
- Readings: POST/GET /readings, GET/DELETE /readings/:id, POST/GET /readings/:id/interpretation.
- Admin: POST/GET/DELETE /admin/knowledge/documents, POST /ingest, /reindex, /search.
- Health: GET /health và /health/ready; readiness không tiết lộ secrets.

## Troubleshooting và production

- Không kết nối DB: kiểm tra `DATABASE_URL` và quyền ghi vào thư mục `apps/backend/prisma`.
- Thiếu nguồn RAG: chạy ingest sau khi điền `GEMINI_API_KEY`.
- Dimension/model sai: chạy `npm run rag:ingest -- --reindex` để tạo lại embedding.
- Gemini lỗi/quota: kiểm tra key, quyền model và quota; API phân biệt timeout/quota/configuration. Không retry vô hạn.
- Cookie không được gửi: local dùng hostname localhost nhất quán. Production dùng HTTPS, COOKIE_SECURE=true và FRONTEND_URL chính xác.
- Không có nguồn đạt ngưỡng: chạy ingest và kiểm tra RAG_SIMILARITY_THRESHOLD. Hệ thống không tạo citation giả khi retrieval rỗng.
- SQLite là cấu hình local/small deployment; retrieval quét embedding chính xác theo cosine. Với kho lớn hoặc nhiều backend instance, chuyển sang PostgreSQL + pgvector trước khi mở rộng.
- Production: secrets trong secret manager, NODE_ENV=production, HTTPS, backup file DB, CORS giới hạn đúng origin; không log request body hay secret.
- Mỗi diễn giải cần embedding query và generation; ingestion/reindex embed từng batch. Giới hạn mặc định 8 diễn giải/user/ngày và rate limit IP; chi phí/quota thực tế phụ thuộc tài khoản Google và model đang dùng.
