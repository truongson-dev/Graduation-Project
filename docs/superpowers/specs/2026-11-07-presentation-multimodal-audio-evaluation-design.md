# Đặc Tả Thiết Kế: Nâng Cấp Đánh Giá Bài Thuyết Trình Bằng AI Multimodal & Bảng Ghi Chú Slide

> **Ngày tạo:** 2026-11-07  
> **Trạng thái:** Chờ phê duyệt (Pending Approval)  
> **Mục tiêu:** Thay thế Web Speech API phụ thuộc trình duyệt bằng giải pháp ghi âm toàn bộ bài thuyết trình, gửi trực tiếp tệp âm thanh đến Multimodal AI (Gemini) để vừa trích xuất transcript vừa đánh giá toàn diện 4 trụ cột trong 1 lần gọi duy nhất; đồng thời thiết kế lại bảng điều khiển bên phải thành tab **"Ghi chú"** (trích xuất văn bản từ PDF, hỗ trợ chỉnh sửa và chỉnh cỡ chữ) cùng tab **"AI nhận xét"**.

---

## 1. Bối Cảnh & Mục Tiêu Cải Tiến (Motivation)

### 1.1. Những bất cập của Web Speech API hiện tại
1. **Phụ thuộc trình duyệt**: Chỉ hoạt động ổn định trên Google Chrome và Microsoft Edge; không hỗ trợ hoặc thường xuyên phát sinh lỗi trên Firefox, Safari, Brave và môi trường di động.
2. **Dễ đứt gãy kết nối mạng**: Web Speech API trên Chromium gửi âm thanh về máy chủ Google Cloud STT của trình duyệt; khi mạng chập chờn sẽ báo lỗi `network`, và khi người dùng ngắt nghỉ quá lâu sẽ báo lỗi `no-speech` làm ngắt chuỗi nhận diện.
3. **Mất đi thông tin âm thanh thực tế**: Web Speech API chỉ bóc tách văn bản thô (thường sai dấu tiếng Việt, thiếu ngắt câu). Mô hình AI trước đây chỉ đọc đoạn văn bản thô này nên không thể đánh giá được cao độ, ngữ điệu, ngập ngừng thực tế, độ vang, ngắt nghỉ hay âm lượng giọng nói của người thuyết trình.

### 1.2. Giải pháp mới
1. **Thu âm tệp đa phương thức chất lượng cao**: Trong lúc sinh viên thuyết trình, hệ thống dùng `MediaRecorder` thu âm ngầm với định dạng siêu nhẹ `audio/webm;codecs=opus` (dung lượng chỉ ~0.5–1MB mỗi phút).
2. **Xử lý 1 lần qua Multimodal AI (Gemini)**: Khi kết thúc bài thuyết trình, tệp âm thanh được gửi trực tiếp lên backend. Gemini nghe toàn bộ file âm thanh để:
   - Trích xuất `transcript` tiếng Việt chuẩn xác (có dấu câu, ngữ cảnh).
   - Đếm số từ đệm thực tế (`fillers_count` từ âm thanh: à, ừm, ngập ngừng, lặp từ).
   - Tính tốc độ nói chuẩn (`words_per_minute`).
   - Đánh giá kỹ năng giọng nói thực tế (`voice_feedback`: ngữ điệu, ngắt nghỉ, năng lượng, phát âm).
   - Đối chiếu với nội dung Slide (`slide_coverage_score`, `is_reading_slides`, `elaboration_quality`).
3. **Giao diện tab "Ghi chú" mới theo mẫu thiết kế**:
   - Tab 1: **"Ghi chú"** (Icon `edit_note`): Tự động hiển thị văn bản trích xuất từ trang slide hiện tại của PDF. Có nút chỉnh sửa bút chì `[Pencil]` và bộ công cụ tăng/giảm cỡ chữ `[-] aA [+]`.
   - Tab 2: **"AI nhận xét"** (Icon `smart_toy`): Camera soi tư thế dáng người và giao tiếp mắt thời gian thực.

---

## 2. Kiến Trúc & Luồng Dữ Liệu (Architecture & Data Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PracticeLivePage                                │
│                                                                             │
│  [Slide View: Trang 1, 2, ...]         [Bảng bên phải]                      │
│  - Trình chiếu PDF                     - Tab "Ghi chú": Text slide + Edit   │
│  - Thumbnails bên dưới                 - Tab "AI nhận xét": Camera + Dáng   │
│                                                                             │
│  [MediaStream] ──> AnalyserNode: Volume/Waveform (Audio Activity)           │
│                ──> MediaRecorder: Ghi âm ngầm (audio/webm;codecs=opus)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                  Người dùng bấm "Kết thúc & Xem đánh giá"
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PresentationReviewPage                             │
│                                                                             │
│  - Nhận audioFile (Blob) từ router navigation state                         │
│  - Cho phép người dùng nghe lại tệp ghi âm                                  │
│  - GradePanel đóng gói FormData gửi Backend                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            POST /api/v1/ai/presentation/evaluate (multipart/form-data)
            [audio, slide_content, duration, eye_contact_percent, posture_score]
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND LARAVEL 13                               │
│                                                                             │
│  1. EvaluatePresentationRequest: Validate file audio, slide_content, metrics│
│  2. PresentationEvaluationController: Lấy UploadedFile đính kèm             │
│  3. Agent PresentationEvaluator: Gọi Gemini Multimodal với attachment audio │
│     -> Gemini nghe audio, xuất transcript, đếm fillers, tính WPM,           │
│        đối chiếu slide, chấm 4 trụ cột.                                     │
│  4. Trả về JSON PresentationFeedbackData                                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Cập nhật Giao diện Review Dashboard                     │
│  - Hiển thị Transcript chuẩn xác do AI xuất                                 │
│  - Tốc độ WPM & số từ đệm thực tế do AI tính                                │
│  - Báo cáo chi tiết 4 trụ cột, ưu/nhược điểm và mẹo khắc phục               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Đặc Tả Chi Tiết Frontend

### 3.1. Trang `PracticeLivePage.tsx`
- **Loại bỏ Web Speech API**:
  - Gỡ bỏ `recognitionRef`, `startLocalRecognition()`, `stopRecognition()`, `SpeechWindow`, `LocalVoiceRecognition`.
  - Triệt tiêu hoàn toàn các thông báo lỗi liên quan đến Web Speech API (`Trình duyệt không hỗ trợ Web Speech API`, `speechError`).
- **Thu âm bằng MediaRecorder**:
  - `MediaRecorder` khởi tạo khi bắt đầu phiên (`status === 'live'`).
  - Ghi nhận `audio/webm;codecs=opus` (hoặc fallback `audio/webm` nếu Safari).
  - Thu gom các đoạn dữ liệu `chunksRef.current` theo từng giây (`recorder.start(1000)`).
  - Đồng bộ khi Pause/Resume phiên.
- **Bảng bên phải (Right Panel UI)**:
  - Header có 2 tab:
    - Tab 1: **Ghi chú** (icon `edit_note`, nhãn "Ghi chú").
    - Tab 2: **AI nhận xét** (icon `smart_toy`, nhãn "AI nhận xét").
  - **Nội dung Tab "Ghi chú"**:
    - Hiển thị văn bản trích xuất tương ứng với trang slide hiện tại: `slideTexts[slideNumber]`.
    - Khi người dùng đổi slide (Next/Prev hoặc click Thumbnail), văn bản ghi chú tự động đổi theo slide tương ứng.
    - **Nút Edit bút chì (`[Pencil]`)**: Nằm góc dưới bên phải. Khi bấm, cho phép chuyển sang chế độ textarea để người dùng ghi chú hoặc sửa đổi nội dung ghi chú cho slide đó.
    - **Thanh công cụ cỡ chữ (`[-] aA [+]`)**: Nằm góc dưới bên trái, điều chỉnh kích thước chữ từ 14px đến 24px linh hoạt.
- **Điều hướng kết thúc**:
  - Khi hoàn thành phiên, tạo file âm thanh:
    `const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });`
  - Điều hướng tới `/practice/review` với state:
    ```ts
    {
      presentationReview: {
        audioBlob,
        slideContent,
        duration: clockLabel(seconds),
        eyeContact,
        posture,
        fileName,
        language: practice?.language || 'vi',
      }
    }
    ```

### 3.2. Trang `PresentationReviewPage.tsx` & `GradePanel.tsx`
- Tiếp nhận `audioBlob` từ state.
- `GradePanel` chuẩn bị `FormData`:
  ```ts
  const formData = new FormData();
  formData.append('audio', audioBlob, 'presentation-audio.webm');
  formData.append('slide_content', slideContent);
  formData.append('duration', duration);
  formData.append('eye_contact_percent', String(eyeContact));
  formData.append('posture_score', String(posture));
  formData.append('language', language);
  ```
- Gọi API qua hook `useEvaluatePresentation(formData)`.
- Khi có kết quả:
  - Hiển thị `transcript` do AI trả về trong phần chi tiết bài nói.
  - Cập nhật các chỉ số `wordsPerMinute` và `fillers` bằng giá trị chính xác do AI tính toán.
  - Hỗ trợ phát/nghe lại audio ghi âm đã lưu qua thẻ `<audio controls>`.

### 3.3. Module API Client (`frontend/src/lib/ai.ts`)
- Cập nhật interface `PresentationEvaluationPayload` hoặc chấp nhận `FormData`.
- Endpoint: `POST /api/v1/ai/presentation/evaluate` với header `Content-Type: multipart/form-data`.
- Cập nhật interface `PresentationEvaluationFeedback`:
  ```ts
  export interface PresentationEvaluationFeedback {
    transcript: string;
    words_per_minute: number;
    fillers_count: number;
    overall_score: number;
    is_reading_slides: boolean;
    slide_coverage_score: number;
    elaboration_quality: string;
    voice_feedback: string;
    body_language_feedback: string;
    strengths: string[];
    improvements: string[];
    actionable_tips: string[];
  }
  ```

---

## 4. Đặc Tả Chi Tiết Backend (Laravel 13)

### 4.1. Request Validation: `EvaluatePresentationRequest.php`
- Đổi từ nhận JSON sang hỗ trợ `multipart/form-data`:
  ```php
  public function rules(): array
  {
    return [
      'audio' => ['required', 'file', 'mimes:webm,wav,mp3,ogg,m4a', 'max:51200'],
      'slide_content' => ['required', 'string', 'max:25000'],
      'duration' => ['required', 'string', 'max:50'],
      'eye_contact_percent' => ['required', 'integer', 'min:0', 'max:100'],
      'posture_score' => ['required', 'integer', 'min:0', 'max:100'],
      'language' => ['nullable', 'string', 'in:vi,en'],
      'transcript' => ['nullable', 'string', 'max:15000'], // Cho phép tùy chọn fallback
    ];
  }
  ```

### 4.2. Controller: `PresentationEvaluationController.php`
- Tiếp nhận file đính kèm: `$audioFile = $request->file('audio');`
- Truyền file đính kèm vào `$agent->prompt(...)`:
  ```php
  $attachments = $audioFile ? [$audioFile] : [];
  $response = $agent->prompt($this->buildPrompt($agent), attachments: $attachments);
  ```

### 4.3. Agent Multimodal: `PresentationEvaluator.php`
- **System Instructions**:
  Chỉ dẫn rõ ràng cho Gemini:
  1. Nghe trực tiếp tệp âm thanh thuyết trình được đính kèm.
  2. Bóc tách toàn bộ lời nói của diễn giả thành văn bản tiếng Việt có dấu câu đầy đủ (`transcript`).
  3. Đếm số lần diễn giả sử dụng từ đệm hoặc âm ngập ngừng ("à", "ừm", "ờ", "thì là", "kiểu như", vấp từ) (`fillers_count`).
  4. Tính tốc độ nói thực tế (`words_per_minute` = số từ / phút).
  5. Đánh giá chất lượng giọng nói (`voice_feedback`): ngữ điệu truyền cảm, cao độ, ngắt nghỉ, năng lượng, độ rõ ràng.
  6. Đối chiếu nội dung đã nói với nội dung slide (`slide_coverage_score`, `is_reading_slides`, `elaboration_quality`).
  7. Kết hợp với chỉ số giao tiếp mắt và tư thế để đưa ra nhận xét ngôn ngữ cơ thể (`body_language_feedback`).
  8. Tổng hợp điểm số (`overall_score`), 1-3 điểm mạnh (`strengths`), 1-3 điểm cần cải thiện (`improvements`), 1-2 mẹo hành động (`actionable_tips`).
- **Structured Schema**:
  ```php
  public function schema(JsonSchema $schema): array
  {
    return [
      'transcript' => $schema->string()->required(),
      'words_per_minute' => $schema->integer()->min(0)->max(500)->required(),
      'fillers_count' => $schema->integer()->min(0)->max(500)->required(),
      'overall_score' => $schema->integer()->min(0)->max(100)->required(),
      'is_reading_slides' => $schema->boolean()->required(),
      'slide_coverage_score' => $schema->integer()->min(0)->max(100)->required(),
      'elaboration_quality' => $schema->string()->required(),
      'voice_feedback' => $schema->string()->required(),
      'body_language_feedback' => $schema->string()->required(),
      'strengths' => $schema->array()->items($schema->string())->required(),
      'improvements' => $schema->array()->items($schema->string())->required(),
      'actionable_tips' => $schema->array()->items($schema->string())->required(),
    ];
  }
  ```

### 4.4. DTO: `PresentationFeedbackData.php`
- Bổ sung 3 trường `transcript`, `words_per_minute`, `fillers_count` vào constructor và hàm `fromStructured()`.

---

## 5. Chiến Lược Kiểm Thử & Tiêu Chuẩn Nghiệm Thu (Testing & Verification)

### 5.1. Backend Tests (Pest / PHPUnit)
- `tests/Feature/Ai/PresentationEvaluationTest.php`:
  - Kiểm tra validation từ chối khi không có file audio hoặc file quá dung lượng cho phép.
  - Kiểm tra upload file `UploadedFile::fake()->create('speech.webm', 1024, 'audio/webm')`.
  - Mock Gemini Agent response trả về cấu trúc mới (gồm `transcript`, `words_per_minute`, `fillers_count`).
  - Kiểm tra định dạng response trả về HTTP 200 kèm DTO chuẩn.

### 5.2. Frontend Tests (Vitest)
- `PracticeLivePage.test.tsx`:
  - Kiểm tra render tab "Ghi chú" và tab "AI nhận xét".
  - Kiểm tra hiển thị nội dung slide tương ứng trong tab Ghi chú.
  - Kiểm tra nút tăng giảm cỡ chữ `[-] aA [+]`.
  - Kiểm tra nút bút chì `[Pencil]` cho phép chỉnh sửa nội dung ghi chú.
  - Kiểm tra điều hướng kết thúc phiên mang theo `audioBlob`.
- `GradePanel.test.tsx`:
  - Kiểm tra tạo FormData có đính kèm file audio.
  - Kiểm tra render kết quả đánh giá 4 trụ cột và transcript từ AI.

---

## 6. Phân Vùng Rủi Ro & Giải Pháp Dự Phòng (Risk & Mitigation)

| Rủi ro | Giải pháp kỹ thuật |
| :--- | :--- |
| Trình duyệt không hỗ trợ codec `audio/webm;codecs=opus` (ví dụ Safari cũ) | Sử dụng fallback `audio/webm` hoặc `audio/mp4` mà `MediaRecorder.isTypeSupported()` phát hiện. |
| Người dùng ngắt mic hoặc không nói gì trong cả bài | Agent phát hiện file âm thanh im lặng/không có tiếng nói, trả về transcript rỗng và nhắc nhở diễn giả bật mic/luyện nói. |
| Thời gian AI xử lý audio dài hơn text thông thường | Hiển thị màn hình chờ trực quan với spinner và thông điệp sinh động; timeout request được đặt 90-120 giây. |
