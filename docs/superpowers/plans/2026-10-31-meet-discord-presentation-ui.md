# Kế Hoạch Triển Khai: Tái Cấu Trúc Giao Diện Thuyết Trình (Google Meet & Discord Style)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi toàn diện giao diện màn hình thuyết trình (`PracticeLivePage`) từ dạng trang form web sang phong cách phòng họp Studio Dark Mode (Google Meet & Discord Stage), giữ nguyên 100% logic AI, MediaPipe, Speech Recognition và dữ liệu đánh giá 4 trụ cột.

**Architecture:** 
- Phân rã giao diện thành các thành phần chuyên biệt: `MeetingTopBar`, `SlideStage`, `SpeakerTile`, `AiCoachDrawer`, `MeetingBottomDock`.
- Sử dụng palette màu tối chuẩn studio (`#111215`, `#1e1f24`, `#2b2d31`) kết hợp Discord Green (`#23a55a`) cho Voice Activity Ring và Meet Red (`#ea4335`) cho nút Kết thúc.
- Giữ vững toàn bộ stateful pipeline: Web Speech API, MediaPipe Face & Pose Tracking, Audio Analyser RMS, PDF & PPTX rendering, MediaRecorder.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, MediaPipe Tasks Vision, PDF.js, Web Audio API, Web Speech API.

**Spec Reference:** Phác thảo mockup đã được phê duyệt tại `docs/superpowers/specs/2026-10-31-presentation-practice-with-slide-ai-design.md` và ảnh minh họa `softskill_ai_presentation_ui_mockup_1793462396651.jpg`.

---

## Danh Sách Công Việc (Tasks)

- [x] **Task 1: Tạo Component `SpeakerTile.tsx` (Phong cách Discord Stage)**
  - Hiển thị video webcam + canvas MediaPipe skeleton.
  - Tích hợp viền sáng xanh lá cây (Voice Activity Ring) khi `voiceLevel > 10` nhấp nháy theo âm lượng.
  - Overlay HUD badges trong suốt: `% Eye Contact`, `Tư thế (Posture)`, `Camera guidance`.

- [x] **Task 2: Tạo Component `AiCoachDrawer.tsx` (Bảng điều khiển AI thời gian thực)**
  - Tabbed interface: AI Coach Live (Pace Meter WPM, Filler words counter, Tự tin / Ngôn ngữ cơ thể, Thẻ gợi ý) & Live Speech Transcript (Phụ đề trực tiếp).
  - Khả năng thu gọn / mở rộng mượt mà (Collapsible) để mở rộng diện tích xem slide.

- [x] **Task 3: Tạo Component `MeetingBottomDock.tsx` (Thanh điều khiển Google Meet)**
  - Thanh dock lơ lửng ở đáy màn hình với hiệu ứng kính mờ (`backdrop-blur-xl bg-neutral-900/90`).
  - Nút Mute/Unmute Mic kèm sóng âm động.
  - Nút Camera ON/OFF.
  - Nút Tạm dừng / Tiếp tục phiên.
  - Nút điều hướng slide (Trước / Sau).
  - Nút Bật/Tắt AI Coach Drawer.
  - Nút đỏ nổi bật "Kết thúc thuyết trình" (`bg-rose-600 hover:bg-rose-700`).

- [x] **Task 4: Tái cấu trúc `PracticeLivePage.tsx` sang Layout Studio Dark Mode**
  - Tích hợp `MeetingTopBar`, `SlideStage` (với floating slide navigator pill `[ ◀ Slide X / Y ▶ ]`), `SpeakerTile`, `AiCoachDrawer`, và `MeetingBottomDock`.
  - Hỗ trợ các chế độ view: Stage Mode (Slide lớn + Speaker Tile góc phải), Theater Focus (Ẩn sidebar AI để tập trung slide).
  - Tối ưu giao diện cho màn hình Laptop, Desktop và Tablet.

- [x] **Task 5: Kiểm thử tự động & Xác nhận tính năng**
  - Chạy `npm test` và `npm run build` để đảm bảo không có lỗi TypeScript hay hồi quy.
  - Kiểm tra các luồng chuyển trạng thái: Đếm ngược bắt đầu -> Live -> Tạm dừng -> Kết thúc -> Chuyển sang `/practice/review`.
