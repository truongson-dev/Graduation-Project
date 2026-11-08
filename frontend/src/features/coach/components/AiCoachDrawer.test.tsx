import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AiCoachDrawer } from './AiCoachDrawer';

afterEach(() => {
  cleanup();
});

describe('AiCoachDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    wordsPerMinute: 120,
    fillers: 2,
    confidence: 85,
    voiceLevel: 40,
    posture: 80,
    eyeContact: 75,
    gestureFeedback: 'Tay linh hoạt',
    gestureCount: 5,
    transcript: '',
    isActive: true,
  };

  it('renders coach tab metrics when open', () => {
    render(<AiCoachDrawer {...defaultProps} />);

    expect(screen.getByText('AI Huấn luyện viên')).toBeTruthy();
    expect(screen.getByText('Tốc độ nói')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('Tốc độ tối ưu')).toBeTruthy();
  });

  it('switches to transcript tab and displays empty state when no transcript', () => {
    render(<AiCoachDrawer {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /lời thoại live/i }));

    expect(screen.getByText('Phụ đề nhận dạng thời gian thực')).toBeTruthy();
    expect(screen.getByText('Chưa có lời thoại nào được ghi nhận.')).toBeTruthy();
  });

  it('displays speechError banner in transcript tab when Web Speech API fails or is unsupported', () => {
    const errorMsg = 'Trình duyệt không hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.';
    render(<AiCoachDrawer {...defaultProps} speechError={errorMsg} />);

    fireEvent.click(screen.getByRole('button', { name: /lời thoại live/i }));

    const matchingElements = screen.getAllByText(errorMsg);
    expect(matchingElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Chưa thể nhận diện giọng nói')).toBeTruthy();
  });

  it('displays full transcript when transcript is present', () => {
    const transcriptText = 'Xin chào thầy cô và các bạn, hôm nay tôi xin trình bày đề tài.';
    render(<AiCoachDrawer {...defaultProps} transcript={transcriptText} />);

    fireEvent.click(screen.getByRole('button', { name: /lời thoại live/i }));

    expect(screen.getByText(transcriptText)).toBeTruthy();
    expect(screen.getByText('15 từ')).toBeTruthy();
  });
});
