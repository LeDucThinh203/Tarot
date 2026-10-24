import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { getApiError, readingApi } from '../../services/api';
import type { ReadingChatMessage } from '../../types/api';

function EmphasizedText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+?\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part)}</>;
}

function readableExcerpt(text: string) {
  return text.replace(/^\\?#{1,6}\s*/gm, '').replace(/`([^`]+)`/g, '$1').trim();
}

function ChatMessageContent({ text }: { text: string }) {
  const blocks: Array<{ type: 'paragraph' | 'list'; lines: string[] }> = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: 'paragraph', lines: paragraph }); paragraph = []; };
  const flushBullets = () => { if (bullets.length) blocks.push({ type: 'list', lines: bullets }); bullets = []; };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushBullets(); continue; }
    const bullet = line.match(/^[-•]\s+(.+)$/);
    if (bullet) { flushParagraph(); bullets.push(bullet[1]); }
    else { flushBullets(); paragraph.push(line); }
  }
  flushParagraph();
  flushBullets();

  return <div className="reading-chat-content">{blocks.map((block, blockIndex) => block.type === 'list'
    ? <ul key={blockIndex}>{block.lines.map((line, lineIndex) => <li key={lineIndex}><EmphasizedText text={line} /></li>)}</ul>
    : <p key={blockIndex}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}<EmphasizedText text={line} /></span>)}</p>)}</div>;
}

export function ReadingFollowUpChat({ readingId, querentName }: { readingId: string; querentName: string | null }) {
  const [draft, setDraft] = useState('');
  const trimmedDraft = draft.trim();
  const draftTooShort = draft.length > 0 && trimmedDraft.length < 2;
  const { guestSession } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const queryKey = ['reading-chat', readingId];
  const { data: messages = [], isLoading, isError, error } = useQuery({ queryKey, queryFn: () => readingApi.getChat(readingId) });
  const guestQuestionsUsed = messages.filter((message) => message.role === 'USER').length;
  const guestChatLimitReached = guestSession && guestQuestionsUsed >= 2;
  const send = useMutation({
    mutationFn: (content: string) => readingApi.sendChat(readingId, content),
    onSuccess: async ({ userMessage, assistantMessage }) => {
      queryClient.setQueryData<ReadingChatMessage[]>(queryKey, (current = []) => [...current, userMessage, assistantMessage]);
      setDraft('');
    },
  });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, send.isPending]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = trimmedDraft;
    if (content.length >= 2 && !send.isPending) send.mutate(content);
  }

  function handleTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return <section className="reading-chat" aria-labelledby="reading-chat-title">
    <div className="reading-chat-heading">
      <span className="reading-chat-icon"><MessageCircle size={17} /></span>
      <div><h3 id="reading-chat-title">Còn điều gì trong lòng bạn?</h3><p>Mình sẽ cùng bạn nhìn lại câu hỏi, những lá bài và lời gợi mở vừa rồi.</p></div>
    </div>
    <div className="reading-chat-transcript" aria-live="polite">
      {!isLoading && messages.length === 0 && <div className="reading-chat-empty"><Sparkles size={15} /><span>Bạn có thể hỏi thêm về một lá bài, điều các lá muốn nhắc đến hoặc bước tiếp theo cho mình.</span></div>}
      {isLoading && <p className="reading-chat-loading">Đang mở lại cuộc trò chuyện...</p>}
      {isError && <p className="reading-chat-error">{getApiError(error)}</p>}
      {messages.map((message) => <article className={`reading-chat-message ${message.role === 'USER' ? 'from-user' : 'from-assistant'}`} key={message.id}>
        <span className="reading-chat-speaker">{message.role === 'USER' ? (querentName || 'Bạn') : 'Mình'}</span>
        <ChatMessageContent text={message.content} />
        {message.sources.length > 0 && <details className="reading-chat-sources">
          <summary>Điều gợi mở · {message.sources.length}</summary>
          {message.sources.map((source) => <div className="reading-chat-source" key={source.chunkId}><strong>{source.title}</strong><p><EmphasizedText text={readableExcerpt(source.excerpt)} /></p></div>)}
        </details>}
      </article>)}
      {send.isPending && <div className="reading-chat-message from-assistant"><span className="reading-chat-speaker">Mình</span><p className="chat-thinking">Mình đang nhìn lại những lá bài của bạn<span> ···</span></p></div>}
      <div ref={bottomRef} />
    </div>
    {guestSession && !guestChatLimitReached && <p className="reading-chat-guest-note">Bạn còn {2 - guestQuestionsUsed} câu hỏi về trải bài này mà chưa cần tài khoản.</p>}
    {send.isError && <p className="reading-chat-error" role="alert">{getApiError(send.error)}</p>}
    {guestChatLimitReached ? <div className="reading-chat-signup-gate" role="status">
      <p>Bạn đã dùng hai câu hỏi dành cho khách. Đăng nhập hoặc tạo tài khoản để hỏi tiếp; trải bài và cuộc trò chuyện này sẽ được giữ lại cho bạn.</p>
      <div><Link className="button button-ghost" to="/login" state={{ from: `/reading/${readingId}` }}>Đăng nhập</Link><Link className="button" to="/register" state={{ from: `/reading/${readingId}` }}>Tạo tài khoản <Sparkles size={14} /></Link></div>
    </div> : <>
    {messages.length === 0 && <div className="reading-chat-suggestions">
      {['Lá bài nào đang nhắn gửi điều quan trọng nhất?', 'Mình có thể bắt đầu từ đâu?', 'Điều gì đang mở ra phía trước?'].map((question) => <button type="button" key={question} onClick={() => setDraft(question)}>{question}</button>)}
    </div>}
    <form className="reading-chat-form" onSubmit={submit}>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleTextareaKeyDown} rows={2} required minLength={2} maxLength={1200} aria-invalid={draftTooShort} aria-describedby="reading-chat-compose-hint reading-chat-char-count" placeholder="Hỏi thêm điều bạn đang băn khoăn..." aria-label="Câu hỏi tiếp theo" />
      <div className="reading-chat-form-footer"><span id="reading-chat-compose-hint" className="reading-chat-compose-hint">Enter gửi · Shift+Enter xuống dòng</span><span id="reading-chat-char-count" className="reading-chat-char-count" aria-live="polite">{draft.length}/1200</span><button className="button" type="submit" disabled={trimmedDraft.length < 2 || send.isPending}>{send.isPending ? 'Đang trả lời...' : 'Gửi câu hỏi'} <Send size={14} /></button></div>
      {draftTooShort && <small className="reading-chat-validation" role="alert">Hãy viết ít nhất 2 ký tự rồi gửi nhé.</small>}
    </form>
    </>}
  </section>;
}
