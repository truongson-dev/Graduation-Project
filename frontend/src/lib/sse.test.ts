import { describe, expect, it } from 'vitest';
import { createSseParser, type SseFrame } from './sse';

function collect(chunks: string[]): SseFrame[] {
  const frames: SseFrame[] = [];
  const parser = createSseParser((frame) => frames.push(frame));

  for (const chunk of chunks) parser.push(chunk);
  parser.flush();

  return frames;
}

describe('createSseParser', () => {
  it('parses a frame delivered in one chunk', () => {
    expect(collect(['data: {"type":"meta","conversation_id":"c1"}\n\n'])).toEqual([
      { type: 'meta', conversation_id: 'c1' },
    ]);
  });

  it('reassembles frames split across chunks', () => {
    const frames = collect(['data: {"type":"text_del', 'ta","delta":"Xin "}\n\n']);

    expect(frames).toEqual([{ type: 'text_delta', delta: 'Xin ' }]);
  });

  it('handles several frames in one chunk', () => {
    const frames = collect([
      'data: {"type":"text_delta","delta":"a"}\n\ndata: {"type":"text_delta","delta":"b"}\n\n',
    ]);

    expect(frames.map((frame) => frame.delta)).toEqual(['a', 'b']);
  });

  it('normalizes CRLF frame boundaries', () => {
    expect(collect(['data: {"type":"done"}\r\n\r\n'])).toEqual([{ type: 'done' }]);
  });

  it('ignores malformed JSON and non-data lines', () => {
    expect(collect([': keepalive\n\ndata: not-json\n\n'])).toEqual([]);
  });

  it('flushes a trailing frame without the blank line', () => {
    expect(collect(['data: {"type":"done"}'])).toEqual([{ type: 'done' }]);
  });
});
