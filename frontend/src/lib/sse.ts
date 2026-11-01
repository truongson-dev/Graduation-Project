import { apiUrl, endpoints, ensureCsrfCookie, readCookie } from './api';

/** One server-sent event frame from POST /v1/ai/chat. */
export interface SseFrame {
  type: string;
  [key: string]: unknown;
}

/**
 * Incremental SSE parser.
 *
 * Kept separate from fetch so it can be unit tested: frames may arrive split
 * across chunks or several per chunk.
 */
export function createSseParser(onFrame: (frame: SseFrame) => void) {
  let buffer = '';

  function emit(raw: string): void {
    const data = raw
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (data === '') return;

    try {
      onFrame(JSON.parse(data) as SseFrame);
    } catch {
      // Malformed frame: ignore it instead of killing the whole stream.
    }
  }

  return {
    push(chunk: string): void {
      buffer += chunk.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        emit(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    },
    flush(): void {
      if (buffer.trim() !== '') emit(buffer);
      buffer = '';
    },
  };
}

export interface ChatStreamOptions {
  message: string;
  conversationId: string | null;
  signal?: AbortSignal;
  onFrame: (frame: SseFrame) => void;
}

/** Stream one coach reply. Session cookies travel with credentials: 'include'. */
export async function streamCoachChat(options: ChatStreamOptions): Promise<void> {
  await ensureCsrfCookie();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const xsrf = readCookie('XSRF-TOKEN');
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

  const response = await fetch(apiUrl(endpoints.ai.chat), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      message: options.message,
      conversation_id: options.conversationId,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await readStreamError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser(options.onFrame);

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }

  parser.push(decoder.decode());
  parser.flush();
}

async function readStreamError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) return payload.message;
  } catch {
    // Non-JSON error body: fall through to the generic message.
  }

  return `Không thể bắt đầu phiên trò chuyện (HTTP ${response.status}).`;
}
