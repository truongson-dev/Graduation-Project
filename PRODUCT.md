# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sinh viên luyện thuyết trình trên máy tính, sử dụng slide, camera và microphone để thực hành trước khi trình bày thật. *(Suy ra từ luồng sản phẩm và nội dung hiện có.)*

## Product Purpose

SoftSkill AI giúp người học chuẩn bị, thực hành và nhận đánh giá về nội dung trình bày, giọng nói, giao tiếp mắt và tư thế. Thành công là người học hoàn thành một phiên luyện tập và nhận được phản hồi có thể áp dụng cho lần trình bày tiếp theo. *(Suy ra từ mã nguồn và đặc tả trong repo.)*

## Positioning

Phiên luyện kết hợp nội dung slide với lời nói và tín hiệu camera theo thời gian thực để tạo đánh giá nhiều chiều, thay vì chỉ chấm nội dung hoặc tốc độ nói. *(Suy ra từ pipeline hiện có.)*

## Operating Context

Người học tải một file PDF, kiểm tra camera và microphone, trình bày trong không gian live, điều hướng từng trang, theo dõi ghi chú hoặc phân tích trực tiếp, rồi chuyển sang báo cáo AI.

## Capabilities and Constraints

- Upload PDF tối đa 100 MB; PowerPoint không được nhận ở luồng setup.
- Live session phải giữ nguyên camera, microphone, ghi hình, Web Speech API, MediaPipe, PDF.js và dữ liệu đánh giá bốn trụ cột.
- Giao diện live ưu tiên desktop/laptop và cần duy trì khả năng sử dụng trên màn hình nhỏ hơn.
- Nhận dạng giọng nói có thể lỗi theo trình duyệt hoặc kết nối; giao diện phải hiển thị trạng thái mà không che slide.

## Brand Commitments

Giữ tên SoftSkill AI, tiếng Việt là ngôn ngữ chính, và giọng điệu rõ ràng, hỗ trợ người học.

## Evidence on Hand

- Luồng và logic hiện có trong `frontend/src/pages/PracticeSetupPage.tsx` và `frontend/src/pages/PracticeLivePage.tsx`.
- Đặc tả đánh giá trong `docs/superpowers/specs/2026-10-31-presentation-practice-with-slide-ai-design.md`.
- Ảnh tham chiếu giao diện live do người dùng cung cấp trong phiên làm việc này.

## Product Principles

- Slide và tiến trình trình bày luôn là trọng tâm.
- Chức năng điều khiển phải dễ thấy nhưng không che nội dung.
- Phản hồi trực tiếp phải hỗ trợ người nói, không làm gián đoạn họ.
- Trạng thái lỗi cần rõ ràng và có vị trí ổn định.
