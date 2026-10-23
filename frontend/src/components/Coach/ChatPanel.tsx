import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  conversationsQueryKey,
  useConversationMessages,
  useConversations,
} from '../../lib/ai';
import { streamCoachChat, type SseFrame } from '../../lib/sse';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
}

const SUGGESTIONS = [
  'Luyện trả lời phỏng vấn thực tập ngành marketing',
  'Chấm câu trả lời phản biện của tôi về một tình huống nhóm',
  'Gợi ý lộ trình rèn kỹ năng thuyết trình trong 4 tuần',
];

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const conversations = useConversations();
  const messagesQuery = useConversationMessages(conversationId);
  /** Conversation whose stored messages are already loaded into `messages`. */
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const savedConversations = conversations.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Load the stored messages of a saved conversation when it is opened.
  useEffect(() => {
    if (conversationId === null || loadedConversationId === conversationId) return;
    if (!messagesQuery.data) return;

    setMessages(
      [...messagesQuery.data]
        .sort((left, right) => (left.created_at ?? '').localeCompare(right.created_at ?? ''))
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          id: message.id,
          role: message.role as ChatMessage['role'],
          content: message.content,
        }))
    );
    setLoadedConversationId(conversationId);
  }, [conversationId, loadedConversationId, messagesQuery.data]);

  const appendDelta = (id: string, delta: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content: message.content + delta } : message
      )
    );
  };

  const send = async (rawText: string) => {
    const text = rawText.trim();
    if (text === '' || streaming) return;

    setInput('');
    setError(null);

    const assistantId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let failed = false;

    try {
      await streamCoachChat({
        message: text,
        conversationId,
        signal: controller.signal,
        onFrame: (frame: SseFrame) => {
          if (frame.type === 'meta' && typeof frame.conversation_id === 'string') {
            setConversationId(frame.conversation_id);
            setLoadedConversationId(frame.conversation_id);
          }

          if (frame.type === 'text_delta' && typeof frame.delta === 'string') {
            appendDelta(assistantId, frame.delta);
          }

          if (frame.type === 'error') {
            failed = true;
            setError(
              typeof frame.message === 'string'
                ? frame.message
                : 'Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại.'
            );
          }
        },
      });
    } catch (streamError) {
      if ((streamError as Error).name !== 'AbortError') {
        failed = true;
        setError((streamError as Error).message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });

      if (failed) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  failed: true,
                  content: message.content || 'Không nhận được phản hồi từ trợ lý AI.',
                }
              : message
          )
        );
      }
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const openConversation = (nextId: string) => {
    if (nextId === (conversationId ?? '')) return;

    abortRef.current?.abort();
    setStreaming(false);
    setError(null);
    setConversationId(nextId === '' ? null : nextId);
    setMessages([]);
    setLoadedConversationId(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex flex-col h-[70vh] min-h-[480px] bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-[#002045]">AI Mentor</h2>
          <p className="text-xs text-slate-500">
            {conversationId ? 'Hội thoại đang được lưu' : 'Bắt đầu hội thoại mới'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Chọn hội thoại đã lưu"
            value={conversationId ?? ''}
            onChange={(event) => openConversation(event.target.value)}
            disabled={streaming}
            className="max-w-[190px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white cursor-pointer disabled:opacity-60"
          >
            <option value="">Hội thoại mới</option>
            {savedConversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          {streaming && (
            <button
              type="button"
              onClick={stop}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Dừng
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && conversationId !== null && messagesQuery.isPending && (
          <p className="text-center text-xs text-slate-400">Đang tải hội thoại đã lưu...</p>
        )}

        {messages.length === 0 && messagesQuery.isError && (
          <p className="text-center text-xs text-red-500">
            Không tải được hội thoại đã lưu. Vui lòng thử lại.
          </p>
        )}

        {messages.length === 0 &&
          !(conversationId !== null && messagesQuery.isPending) &&
          !messagesQuery.isError && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-[#1a365d]">psychology</span>
            <p className="text-sm text-slate-600 max-w-sm">
              Hỏi AI Mentor về phỏng vấn, thuyết trình, làm việc nhóm hoặc bất kỳ kỹ năng mềm nào
              bạn muốn luyện.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                message.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#002045] px-4 py-2.5 text-sm text-white whitespace-pre-wrap'
                  : `max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      message.failed
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                    }`
              }
            >
              {message.content || (streaming ? '...' : '')}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-5 py-2 text-xs text-red-600 border-t border-red-100 bg-red-50">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Nhập câu hỏi của bạn..."
          className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
        />
        <button
          type="submit"
          disabled={streaming || input.trim() === ''}
          aria-label="Gửi tin nhắn"
          className="h-10 w-10 shrink-0 rounded-xl bg-[#002045] text-white flex items-center justify-center hover:bg-[#00132b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </div>
  );
};
