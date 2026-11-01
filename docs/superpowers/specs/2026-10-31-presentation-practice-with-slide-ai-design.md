# Đặc Tả Thiết Kế: Tính Năng Luyện Thuyết Trình Với AI Dựa Trên Slide

> **Mục tiêu:** Xây dựng tính năng AI đánh giá bài thuyết trình dựa trên sự tương quan giữa nội dung slide đã tải lên và lời nói thực tế của sinh viên, chấm điểm theo 4 trụ cột (Bám sát slide, Diễn giải mở rộng/không đọc chép, Giọng nói, Ngôn ngữ cơ thể).

---

## 1. Kiến Trúc Tổng Thể & Luồng Dữ Liệu (Architecture & Data Flow)

```
[Người dùng tải Slide PDF]
          │
          ▼
┌─────────────────────────┐
│   PracticeSetupPage     │ ──> Trích xuất text nền từ PDF bằng pdfjs-dist
└─────────────────────────┘
          │ (chuyển sang state luyện tập)
          ▼
┌─────────────────────────┐
│    PracticeLivePage     │ ──> Chiếu slide song song với Camera
│                         │ ──> MediaPipe: Đo % Eye Contact, Tư thế (Posture)
│                         │ ──> Web Speech API: Nhận diện Transcript, WPM, Đếm từ đệm
└─────────────────────────┘
          │ (kết thúc phiên thuyết trình)
          ▼
┌─────────────────────────┐
│ PresentationReviewPage  │
│      (GradePanel)       │
└─────────────────────────┘
          │
          │ POST /api/v1/ai/presentation/evaluate
          │ (gửi: slide_content, transcript, delivery_metrics)
          ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND LARAVEL 13                   │
│                                                        │
│  - Middleware: auth:sanctum, throttle:ai-feedback       │
│  - FormRequest: EvaluatePresentationRequest            │
│  - Agent: PresentationEvaluator (#[CacheInstructions]) │
│  - Provider: Google Gemini                             │
└────────────────────────────────────────────────────────┘
          │
          ▼ JSON Structured Feedback (Điểm số 4 trụ cột, nhận xét, gợi ý)
┌─────────────────────────┐
│ PresentationReviewPage  │ ──> Render giao diện báo cáo phân tích trực quan
└─────────────────────────┘
```

---

## 2. Đặc Tả Chi Tiết Backend

### 2.1. Route Definition
* **URL:** `POST /api/v1/ai/presentation/evaluate`
* **Name:** `api.v1.ai.presentation.evaluate`
* **Middleware:**
  * `auth:sanctum` (Bắt buộc đăng nhập)
  * `App\Http\Middleware\EnsureAiConfigured` (Kiểm tra cấu hình Gemini API Key)
  * `throttle:ai-feedback` (Giới hạn 5 req/phút, 50 req/ngày để bảo vệ quota)

### 2.2. Form Request: `EvaluatePresentationRequest`
* `slide_content`: `['required', 'string', 'max:25000']` (Nội dung chữ trích xuất từ slide).
* `transcript`: `['required', 'string', 'max:15000']` (Toàn văn lời nói của sinh viên).
* `duration`: `['required', 'string', 'max:50']` (Ví dụ: "05:20").
* `words_per_minute`: `['required', 'integer', 'min:0', 'max:500']` (Tốc độ nói).
* `fillers_count`: `['required', 'integer', 'min:0', 'max:500']` (Số từ đệm).
* `eye_contact_percent`: `['required', 'integer', 'min:0', 'max:100']` (Tỉ lệ giao tiếp mắt).
* `posture_score`: `['required', 'integer', 'min:0', 'max:100']` (Điểm tư thế).
* `language`: `['nullable', 'string', 'in:vi,en']` (Mặc định 'vi').

### 2.3. Agent: `App\Ai\Agents\PresentationEvaluator`
* Sử dụng attribute `#[CacheInstructions]` của Laravel 13 để cache system prompt trên Gemini, giảm chi phí token và tăng tốc độ xử lý.
* Phòng chống Prompt Injection: Đóng gói dữ liệu đầu vào người dùng trong các khối phân tách `<<< SLIDE_CONTENT >>>` và `<<< TRANSCRIPT >>>`, chỉ định mô hình chỉ coi đó là dữ liệu đánh giá, không phải lệnh thực thi.
* **Structured Output Schema (`HasStructuredOutput`)**:
  ```json
  {
    "overall_score": 85,
    "is_reading_slides": false,
    "slide_coverage_score": 80,
    "elaboration_quality": "Sinh viên diễn giải tốt, có lấy ví dụ thực tế về phương pháp Agile thay vì chỉ đọc các gạch đầu dòng trên slide.",
    "voice_feedback": "Tốc độ nói 125 từ/phút ở mức chuẩn, tự nhiên. Tuy nhiên còn xuất hiện 5 từ đệm 'ừm' ở phần chuyển ý.",
    "body_language_feedback": "Giao tiếp mắt đạt 78% rất tự tin, tư thế đứng thẳng, cử chỉ tay mở rộng tạo cảm giác cởi mở.",
    "strengths": [
      "Bố cục bài nói rõ ràng, mở đầu ấn tượng.",
      "Không bị phụ thuộc vào slide, chủ động tương tác với người nghe.",
      "Dẫn chứng thuyết phục và bám sát thực tế."
    ],
    "improvements": [
      "Hạn chế dừng ngắt quãng và dùng từ đệm khi chuyển giữa các luận điểm.",
      "Dành thêm 1 phút để giải thích kỹ hơn biểu đồ số liệu ở slide 3."
    ],
    "actionable_tips": [
      "Trước khi thuyết trình lần tới, hãy ghi chú 1 từ khóa chuyển tiếp ở đầu mỗi slide để không bị 'ừm' khi đổi trang.",
      "Tập trung mắt nhìn đều vào 3 hướng (trái, giữa, phải) của người nghe."
    ]
  }
  ```

---

## 3. Đặc Tả Chi Tiết Frontend

### 3.1. Trích xuất Text Slide (`PracticeSetupPage.tsx`)
* Sử dụng `pdfjs-dist` duyệt qua từng trang slide của file PDF được tải lên:
  ```ts
  async function extractSlideText(pdfDoc: PDFDocumentProxy): Promise<string> {
    const pagesText: string[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      pagesText.push(`[Trang ${i}]: ${strings.join(' ')}`);
    }
    return pagesText.join('\n\n');
  }
  ```
* Lưu chuỗi text vào state `slideContent` để chuyển tiếp qua `PracticeLivePage`.

### 3.2. Truyền Dữ Liệu (`PracticeLivePage.tsx`)
* Khi bấm "Kết thúc buổi luyện", gom toàn bộ dữ liệu:
  * `slideContent`: Text trích xuất từ slide
  * `transcript`: Transcript từ Web Speech API
  * `duration`: Thời gian thuyết trình
  * `wordsPerMinute`, `fillers`, `eyeContact`, `posture`, `confidence`
  * Truyền qua `navigate('/practice/review', { state: { presentationReview: ... } })`.

### 3.3. Hiển Thị Báo Cáo 4 Trụ Cột (`PresentationReviewPage.tsx` & `GradePanel.tsx`)
* Giao diện hiển thị:
  1. **Thẻ Điểm Tổng Hợp**: Điểm số từ 0 - 100 với vòng tròn đo lường và xếp loại (Xuất sắc / Tốt / Cần luyện thêm).
  2. **Banner Cảnh Báo Đọc Chép**:
     * Nếu `is_reading_slides === true`: Banner màu vàng cam *" Cảnh báo: Bạn đang có xu hướng đọc nguyên văn slide. Hãy cố gắng ghi nhớ từ khóa và dùng lời nói của mình để diễn giải."*
     * Nếu `is_reading_slides === false`: Banner màu xanh *" Tốt: Bạn diễn giải mở rộng rất tự nhiên và không bị phụ thuộc vào chữ trên slide."*
  3. **Thanh 4 Trụ Cột Đánh Giá**:
     * Trụ cột 1: Độ bao quát Slide (`slide_coverage_score` %).
     * Trụ cột 2: Khả năng diễn giải (`elaboration_quality`).
     * Trụ cột 3: Kỹ năng giọng nói (`voice_feedback`, WPM, Fillers).
     * Trụ cột 4: Ngôn ngữ cơ thể (`body_language_feedback`, Eye-contact, Posture).
  4. **Điểm mạnh & Điểm cần cải thiện**: Danh sách bullet points cụ thể, hành động được ngay.
  5. **Checklist hành động (Actionable Tips)**: 2 lời khuyên mấu chốt để cải thiện ngay trong lần thực hành kế tiếp.

---

## 4. Kế Hoạch Kiểm Thử (Testing Strategy)

* **Unit/Feature Test Backend (Pest PHP)**:
  * Kiểm tra validate request (thiếu slide_content hoặc transcript báo lỗi 422).
  * Kiểm tra rate limit `throttle:ai-feedback` trả về 429 nếu spam.
  * Kiểm tra phản hồi mock của `PresentationEvaluator::fake()` trả về đầy đủ 4 trụ cột với format JSON chuẩn.
  * Kiểm tra an toàn bảo mật: Chống SQL Injection, XSS, Prompt Injection.
* **Kiểm thử hồi quy (Regression Test)**:
  * Chạy toàn bộ 72 tests hiện tại để đảm bảo 100% không ảnh hưởng chức năng cũ.

---

## 5. Kế Hoạch Dự Phòng (Safety & Fallbacks)

* Nếu slide quá ngắn hoặc không trích xuất được chữ (ví dụ slide chỉ toàn ảnh): Backend tự động đánh giá linh hoạt dựa trên lời nói và tác phong cơ thể mà không báo lỗi.
* Nếu Gemini API bị nghẽn (Rate limit upstream): Trả về mã lỗi 429 hoặc 502 kèm thông báo thân thiện bằng tiếng Việt để người dùng thử lại sau ít phút.
