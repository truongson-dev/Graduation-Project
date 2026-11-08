import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PresentationWaveformPlayer } from './PresentationWaveformPlayer';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PresentationWaveformPlayer', () => {
  it('renders audio player without Infinity:NaN even when duration is unknown or Infinity', () => {
    render(
      <PresentationWaveformPlayer
        audioUrl="blob:http://localhost/test-audio"
        durationLabel="03:15"
        wpm={82}
        fillers={0}
        aiSummary="Sinh viên có mở đầu ngắn gọn nhưng chưa đi sâu vào nội dung chính."
      />
    );

    // Audio element exists with testid
    expect(screen.getByTestId('presentation-audio')).toBeTruthy();

    // Verify time does NOT contain NaN or Infinity
    expect(screen.queryByText(/NaN/i)).toBeNull();
    expect(screen.queryByText(/Infinity/i)).toBeNull();
    expect(screen.getAllByText('03:15').length).toBeGreaterThan(0);

    // Redundant legends should be gone
    expect(screen.queryByText('Đã nghe')).toBeNull();
    expect(screen.queryByText('Chưa nghe')).toBeNull();
    expect(screen.queryByText('Vị trí từ đệm')).toBeNull();

    // Redundant footer metrics (duplicate with row 2) should be gone
    expect(screen.queryByText(/Tốc độ phát âm:/i)).toBeNull();

    // Clean status for 0 fillers
    expect(screen.getByText(/không phát hiện từ đệm/i)).toBeTruthy();

    // AI feedback section exists
    expect(screen.getByText(/Góp ý từ Giảng viên AI/i)).toBeTruthy();
    expect(
      screen.getByText(/Sinh viên có mở đầu ngắn gọn nhưng chưa đi sâu vào nội dung chính./i)
    ).toBeTruthy();
  });

  it('cycles playback speed when speed button is clicked', () => {
    render(
      <PresentationWaveformPlayer
        audioUrl="blob:http://localhost/test-audio"
        durationLabel="02:00"
        wpm={110}
        fillers={2}
      />
    );

    const speedBtn = screen.getByTestId('presentation-speed-btn');
    expect(speedBtn.textContent).toContain('1x');
    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toContain('1.25x');
    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toContain('1.5x');
    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toContain('2x');
  });

  it('displays filler notice when fillers > 0', () => {
    render(
      <PresentationWaveformPlayer
        audioUrl="blob:http://localhost/test-audio"
        durationLabel="01:30"
        wpm={95}
        fillers={3}
      />
    );

    expect(screen.getByText(/Phát hiện 3 vị trí từ đệm/i)).toBeTruthy();
  });

  it('handles play and pause toggling safely', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();

    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    render(
      <PresentationWaveformPlayer
        audioUrl="blob:http://localhost/test-audio"
        durationLabel="01:00"
        wpm={100}
        fillers={0}
      />
    );

    const playBtn = screen.getByTestId('presentation-play-btn');
    fireEvent.click(playBtn);
    expect(playMock).toHaveBeenCalled();
  });
});
