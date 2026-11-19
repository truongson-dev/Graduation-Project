# Báo cáo Nghiên cứu Thiết kế Tính năng Cộng đồng (Threads-Inspired) cho SoftSkill AI

**Ngày lập:** 2026-11-12  
**Phạm vi:** Nghiên cứu chuyên sâu sản phẩm Meta Threads và chuyển hóa thành kiến trúc UX/UI, dữ liệu, thuật toán và lộ trình triển khai thuần túy cho module Cộng đồng của **SoftSkill AI** *(không bao gồm Gamification/XP ở giai đoạn hiện tại)*.  
**Trạng thái:** Báo cáo nghiên cứu tiền thiết kế (Pre-Design Research).

---

## Mục lục

1. [Phân tích sâu Meta Threads (Product & UX Anatomy)](#1-phân-tích-sâu-meta-threads-product--ux-anatomy)
2. [Đánh giá hiện trạng SoftSkill AI & Gap Analysis](#2-đánh-giá-hiện-trạng-softskill-ai--gap-analysis)
3. [Thiết kế Trải nghiệm & Giao diện (UX/UI Design)](#3-thiết-kế-trải-nghiệm--giao-diện-uxui-design)
4. [Cơ chế Thuật toán Feed & An toàn Nội dung](#4-cơ-chế-thuật-toán-feed--an-toàn-nội-dung)
5. [Kiến trúc Kỹ thuật, Mô hình Dữ liệu & Tối ưu SQL MySQL 8.0+ (Laravel 13 + React 19)](#5-kiến-trúc-kỹ-thuật-mô-hình-dữ-liệu--tối-ưu-sql-mysql-80-laravel-13--react-19)
6. [Lộ trình Triển khai & Quản trị Rủi ro](#6-lộ-trình-triển-khai--quản-trị-rủi-ro)

---

## 1. Phân tích sâu Meta Threads (Product & UX Anatomy)

### 1.1 Triết lý sản phẩm: "Public Group Chat" vs. "Town Square"

Điểm khác biệt lớn nhất giúp Meta Threads (đạt quy mô hơn 500 triệu người dùng hoạt động hàng tháng tính đến 2025–2026) không bị hòa tan thành bản sao của X (Twitter) hay Reddit nằm ở triết lý thiết kế: **biến không gian thảo luận công khai thành cảm giác của một "nhóm chat công khai" (public group chat)** — mạch lạc, nhẹ nhàng, dễ theo dõi ngữ cảnh và trao quyền kiểm soát cho người tạo cuộc trò chuyện.

| Tiêu chí | Meta Threads | X (Twitter) | Reddit / Forum truyền thống |
| :--- | :--- | :--- | :--- |
| **Triết lý cốt lõi** | Public group chat, đối thoại hai chiều thân thiện | Town square, tin nóng, phản ứng tốc độ cao | Cộng đồng theo chủ đề (subreddit), tranh luận sâu dạng cây |
| **Cấu trúc cây hội thoại** | Đường nối dọc (*Thread Line*) liên tục; thụt lề có kiểm soát, gom nhánh phụ | Danh sách phẳng theo tương tác; dễ xảy ra *context collapse* khi viral | Cây lồng nhau sâu vô hạn, khó đọc nhanh trên mobile |
| **Phân loại nội dung** | **Topic Tags** (1 thẻ pill/bài), **Custom Feeds**, **Communities Hub** | `#Hashtag` tự do (nhiều spam), Lists | Subreddit & Post Flair |
| **Định dạng chữ dài** | Self-thread (nối chuỗi) + **Text Attachment** (tới 10.000 ký tự rich-text) | Long-form (trả phí) hoặc thread dấu `+` | Post markdown dài ngay từ đầu |
| **Quyền kiểm soát tác giả** | Mạnh mẽ: `reply_control` 5 cấp, **Reply Approvals**, **Hide Reply**, Hidden Words | Giới hạn reply cơ bản; Community Notes | Moderator subreddit nắm quyền chính |
| **Mật độ giao diện** | Thoáng (Instagram design heritage), bo tròn mềm, icon tối giản | Mật độ thông tin cao, cạnh sắc, thiên về đọc lướt nhanh | Dày đặc, nhiều metadata/karma |

### 1.2 Giải phẫu Cây Hội thoại (Conversation Tree & Thread Lines)

Cây hội thoại là "linh hồn UX" của Threads:

1. **Thread Connector Line (Đường nối dọc):**
   * Một đường kẻ mảnh (thường màu xám nhạt `1.5px–2px`) chạy thẳng từ đáy avatar của bài cha xuống đỉnh avatar của bài con trực tiếp.
   * Người đọc chỉ cần quét mắt theo trục dọc bên trái để biết chính xác *ai đang trả lời ai* mà không cần đọc ký tự `@mention` rườm rà.
2. **Author Self-Thread (Chuỗi tự nối của tác giả):**
   * Ngay trong lúc soạn thảo, nút **"Add to thread"** cho phép tác giả tách một lập luận dài thành nhiều đoạn liên tiếp.
   * Trên feed, chuỗi tự nối của tác giả được hiển thị liên hoàn như một dòng chảy thống nhất, tách biệt trực quan với phần bình luận của cộng đồng.
3. **Phân nhánh có kiểm soát (Controlled Branching):**
   * Thay vì để cây thụt lề 10–15 cấp gây bóp nghẹt chiều ngang màn hình (như Reddit trên điện thoại), Threads giới hạn độ sâu hiển thị trực tiếp (thường 2–3 cấp trên một màn hình chi tiết), gom các nhánh sâu hơn sau nút **"Xem thêm phản hồi"** hoặc mở view focus mới.
4. **Thao tác nhanh trên Mobile:**
   * **Swipe-to-reply** (vuốt trái trên một phản hồi để mở khung trả lời trực tiếp cho đúng nhánh đó), giúp giữ mạch phản biện tự nhiên như ứng dụng nhắn tin.

### 1.3 Hệ sinh thái Định dạng Bài viết (Content Formats)

Qua các bản cập nhật lớn 2024–2026, Threads mở rộng mạnh mẽ các định dạng nhằm phục vụ nhiều kiểu biểu đạt:

* **Text Post chuẩn (500 ký tự):** Giới hạn ngắn để khuyến khích súc tích; lưu ý kỹ thuật là Threads tính độ dài ký tự emoji theo **UTF-8 byte length** (emoji phức tạp tốn nhiều đơn vị hơn ký tự ASCII).
* **Text Attachments (Tối đa 10.000 ký tự):** Giải quyết thói quen người dùng phải chụp ảnh màn hình ghi chú khi viết dài. Bài viết dài được đính kèm như một thẻ mở rộng *"Read more"* ngay trong feed, hỗ trợ định dạng cơ bản (in đậm, nghiêng, gạch chân, gạch ngang, highlight câu nổi bật, danh sách).
* **Polls (Bình chọn):** Nhúng trực tiếp vào card bài viết để kích thích tương tác nhanh không ma sát (zero-friction participation).
* **Carousels (2–20 ảnh/video) & Voice Notes:** Hỗ trợ kể chuyện trực quan và truyền tải sắc thái giọng nói — rất phù hợp với ngữ cảnh luyện giao tiếp.
* **Spoiler Tags:** Làm mờ văn bản hoặc từng ảnh/video riêng lẻ với lớp phủ cảnh báo; người xem chạm (*tap-to-reveal*) để mở khóa nội dung.
* **Ghost Posts (Bài viết ma 24h):** Bài viết tự động lưu trữ sau 24 giờ, không hiển thị công khai danh sách like/reply dưới bài; toàn bộ phản hồi được chuyển thẳng vào hộp thư riêng (DMs) của tác giả. Giúp giảm áp lực "sợ sai / sợ bị phán xét" khi nêu quan điểm thử nghiệm.

### 1.4 Kiến trúc Feed, Khám phá & Điều hướng Desktop

1. **Tách bạch hai chế độ Feed chính:**
   * **For You (Khám phá theo thuật toán):** Kết hợp bài từ người đang theo dõi và nội dung đề xuất. Mô hình ML ưu tiên **tốc độ tương tác sớm (Engagement Velocity)**, **thời gian dừng đọc (Dwell Time)**, **lượt Repost**, và **chất lượng phản hồi** (bình luận dài, thực chất như >8 từ được đánh giá cao hơn comment 1 chữ hoặc emoji). Ngược lại, bài đăng chứa link ngoài ngay trong nội dung chính bị giảm phân phối (*Link Penalty*); tác giả thường đặt link ở bình luận đầu tiên của chính mình.
   * **Following (Theo dõi):** Sắp xếp thuần túy theo **thời gian đảo ngược (Reverse Chronological)**, tạo sự tin cậy và minh bạch cho người dùng trung thành.
2. **Topic Tags, Custom Feeds & Communities Hub:**
   * **Topic Tags** hiển thị dạng *pill* có thể bấm vào để chuyển sang trang chủ đề chuyên biệt, hạn chế tình trạng nhồi nhét hàng chục `#hashtag` gây nhiễu thị giác.
   * **Custom Feeds** cho phép người dùng gom một tập từ khóa + danh sách tác giả thành tab feed riêng có thể chia sẻ.
   * **Communities Hub** tạo các không gian sinh hoạt theo chủ đề với huy hiệu thành viên (flair/champion badge) và biểu tượng tương tác riêng.
3. **Kiểm soát thuật toán chủ động (`Your Algo` / `Dear Algo`):**
   * Cho phép người dùng trực tiếp nói với hệ thống muốn *xem nhiều hơn* hoặc *ít đi* chủ đề nào trong một khoảng thời gian (ví dụ 1, 3 hoặc 7 ngày), giảm cảm giác bị động trước "hộp đen" đề xuất.
4. **Desktop Workspace (`ThreadsDeck`):**
   * Trên màn hình lớn, ngoài giao diện 1 cột tập trung ở giữa, Threads hỗ trợ **ghim nhiều cột song song** (For You, Following, Topic Feed, Search, Activity) có tùy chọn tự động cập nhật (*Auto-update*), thanh điều hướng bên trái (Left Rail) và **Floating Composer (`+`)** ở góc dưới phải.

### 1.5 Cơ chế An toàn & Kiểm soát Hội thoại (Safety & Moderation)

Đây là yếu tố quyết định chất lượng văn hóa thảo luận:

* **Reply Controls (5 cấp độ theo từng bài):** `everyone`, `accounts_you_follow`, `mentioned_only`, `parent_post_author_only`, `followers_only`.
* **Reply Approvals:** Tác giả bật chế độ kiểm duyệt trước — phản hồi mới vào hàng chờ (pending queue) và chỉ hiện công khai khi được duyệt.
* **Hide Reply (Ẩn theo nhánh):** Khi tác giả hoặc moderator ẩn một bình luận cấp 1, **toàn bộ nhánh phản hồi con bên dưới tự động bị ẩn theo**, cắt đứt hiệu quả các chuỗi công kích/lạc đề.
* **Hidden Words:** Người dùng tự cấu hình danh sách từ khóa/cụm từ/emoji không muốn thấy; hệ thống tự động lọc khỏi feed và danh sách bình luận hiển thị với người dùng đó.

---

## 2. Đánh giá hiện trạng SoftSkill AI & Gap Analysis

### 2.1 Khảo sát hiện trạng mã nguồn

Qua kiểm tra trực tiếp repository:

* **Frontend (`frontend/`):** React 19, Vite, TypeScript, Tailwind CSS v4, `shadcn` (`base-nova` trên `@base-ui/react`), `@tanstack/react-query`, `lucide-react`, `Plus Jakarta Sans` với bảng màu chủ đạo Navy/Brand (`#1a365d`, `#2b5282`), Teal (`#006a61`) và Amber (`#dd8d00`).
* **Trang Cộng đồng hiện tại ([CommunityPage.tsx](file:///d:/Android-APP/softskill/frontend/src/features/community/pages/CommunityPage.tsx)):**
  * Nằm trong `StudentPageLayout` (sidebar trái + topbar trên desktop/drawer trên mobile).
  * Gồm 2 tab: **`Bài tranh biện`** (2 bài mẫu hard-code trong `initialPosts`, hỗ trợ poll 2 lựa chọn A/B, nút Thích và bình luận 1 tầng dạng mảng chuỗi `string[]`) và **`Phòng trực tuyến`** (3 phòng mẫu hard-code với modal chat + vote 2 phe).
  * Toàn bộ state chỉ nằm trong `useState` tại client, F5 là mất dữ liệu.
* **Trang Thành tích ([AchievementsPage.tsx](file:///d:/Android-APP/softskill/frontend/src/features/community/pages/AchievementsPage.tsx)) & Giải đấu ([tournament.ts](file:///d:/Android-APP/softskill/frontend/src/features/community/api/tournament.ts)):** Hiện đang dùng dữ liệu tĩnh (`weeklyRanking`, `CURRENT_TOURNAMENT`) ở frontend.
* **Backend (`backend/`):** Laravel 13 (`^13.17`), PHP 8.3+, hỗ trợ cả SQLite (mặc định trong `.env.example`) và **MySQL 8.0+ (InnoDB, `utf8mb4_unicode_ci`, `strict => true` trong `backend/config/database.php`) — môi trường triển khai thực tế của dự án đang dùng MySQL**, Sanctum, `spatie/laravel-permission` (guard `'web'`), `spatie/laravel-query-builder`, `spatie/laravel-data`, `dedoc/scramble` (export OpenAPI sang `api.json` để sinh type TS tự động bằng `npm run api:sync`), `laravel/ai`.
  * Kiểm tra [api.php](file:///d:/Android-APP/softskill/backend/routes/api.php) và `backend/database/migrations`: **chưa có bất kỳ bảng DB, Model, Controller hay route nào cho Community**; bảng `users` hiện chỉ có `id, name, email, email_verified_at, password, google_id, avatar_url` (chưa có `username`/`handle`, `bio`, hay `headline`).
  * `AppServiceProvider.php` bật `Model::shouldBeStrict(! $this->app->isProduction())`: mọi truy vấn thiếu eager-load hoặc mass-assignment thiếu `$fillable` sẽ ném exception ngay ở môi trường dev/test.
* **Các module vệ tinh & trạng thái thực tế:**
  * `PresentationSession` (`backend/app/Models/PresentationSession.php`): **đã triển khai đầy đủ** ở backend, dùng **UUID primary key (`uuid('id')->primary()`)**, lưu `status` (`processing`, `completed`, `failed`...), điểm tổng hợp (`overall_score`), `words_per_minute`, `fillers_count`, `eye_contact_percent`, `posture_score`, `transcript`, `strengths`, `improvements`, và `audio_path` riêng tư (chỉ chủ sở hữu mới stream qua `PresentationSessionController::streamAudio`).
  * `LearningPath`: Hiện **chỉ mới có tài liệu đặc tả** (`docs/superpowers/specs/2026-11-08-learning-path-design.md`) và trạng thái `localStorage` phía frontend (`frontend/src/features/learning/api/daily-learning.ts`), **chưa có migration bảng XP/bài học trong backend**.

### 2.2 Bảng Gap Analysis (Hiện trạng vs. Cộng đồng chuẩn Threads cho SoftSkill AI)

| Khía cạnh | Hiện trạng (`CommunityPage.tsx`) | Mục tiêu thiết kế (Threads-inspired) | Khoảng trống (Gap) cần giải quyết |
| :--- | :--- | :--- | :--- |
| **Lưu trữ & API** | Mock state trên RAM, không có backend | Full-stack Laravel API + DB persistence + React Query | Cần thiết kế toàn bộ schema, migrations, API endpoints, OpenAPI sync |
| **Cấu trúc bài viết** | Bắt buộc có Tiêu đề + Bối cảnh + đúng 2 phương án Poll | Linh hoạt: Post ngắn (500 ký tự), Self-thread nhiều đoạn, đính kèm Poll/Long-text/Session tùy chọn | Tách Poll thành attachment tùy chọn; hỗ trợ self-thread & rich attachments |
| **Cây hội thoại** | `comments: string[]` phẳng, 1 tầng, không có tên tác giả thật ở DB | Cây hội thoại nhiều tầng có **Thread Connector Lines**, đếm reply từng nhánh, trang chi tiết thread | Cần mô hình dữ liệu cây (`parent_id` + `root_id`) và UI component `ThreadTree` |
| **Tương tác xã hội** | Chỉ có `Thích` và `Bình luận` | Thích, Bình luận lồng cấp, **Repost**, **Quote Post** (trích dẫn nêu quan điểm), **Bookmark/Lưu**, **Theo dõi** | Bổ sung bảng quan hệ tương tác và giao diện Quote/Repost |
| **Khám phá & Phân loại** | Không có lọc chủ đề, không có tìm kiếm | Feed **Dành cho bạn** / **Đang theo dõi**, **Topic Tags** theo kỹ năng mềm, tìm kiếm bài/người dùng | Bổ sung `topic_tags`, thuật toán ranking cơ bản và thanh lọc/tìm kiếm |
| **An toàn & Kiểm soát** | Nút `more_horiz` chưa có chức năng | `reply_control`, Ẩn phản hồi (kèm nhánh con), Báo cáo vi phạm, Từ khóa ẩn (*Hidden Words*) | Cần hệ thống permission/policy, bảng reports và hidden words |
| **Gắn kết SoftSkill AI** | Tách rời hoàn toàn khỏi Lộ trình học & Luyện thuyết trình | Chia sẻ `PresentationSession` xin góp ý cộng đồng; chủ đề gắn kỹ năng mềm (STAR, phản biện, đàm phán...) | Tạo attachment type `presentation_session` liên kết trực tiếp với lịch sử luyện tập |

### 2.3 Nguyên tắc chọn lọc: Giữ gì — Bỏ gì — Biến tấu gì?

Áp dụng nguyên tắc **YAGNI** và phù hợp với một ứng dụng giáo dục kỹ năng mềm (không phải mạng xã hội giải trí đại trà):

* **GIỮ (Core Threads DNA):**
  * Giao diện thẻ thoáng, dễ đọc, tập trung vào văn bản và lập luận.
  * **Thread Connector Lines** (đường nối dọc) + **Self-thread** (nối chuỗi ý kiến mạch lạc).
  * **Topic Tag** dạng pill đơn giản (mỗi bài 1 tag chính thay vì loạn `#hashtag`).
  * **Quote Post** (cực kỳ hợp với tranh biện: trích dẫn ý kiến người khác để phản biện văn minh).
  * **Reply Controls & Hide Reply** để bảo vệ tâm lý người học mới luyện nói/viết.
* **BIẾN TẤU CHO SOFTSKILL AI (Domain Adaptation):**
  * **Polls 2–4 lựa chọn** dùng cho tình huống ứng xử công sở/học đường (ví dụ: *"Khi sếp giao việc mơ hồ..."*).
  * **Đính kèm Phiên Luyện Thuyết Trình (`PresentationSession`)**: Cho phép học viên chia sẻ kết quả/bài nói lên cộng đồng để nhận *Peer Feedback* từ bạn học.
  * **Gắn nhãn góc nhìn phản biện (tùy chọn nhẹ):** Khi bình luận vào bài tranh biện có poll, hiển thị badge nhỏ góc nhìn mà người bình luận vừa bình chọn (nếu họ chọn công khai), giúp cuộc thảo luận minh bạch lập luận.
* **BỎ / HOÃN Ở GIAI ĐOẠN ĐẦU (Tránh phình phạm vi):**
  * **Gamification (XP, chuỗi điểm thưởng, huy hiệu đóng góp, bảng xếp hạng/giải đấu cộng đồng):** Tạm thời loại khỏi phạm vi để tập trung 100% vào chất lượng trải nghiệm thảo luận, cây hội thoại và kết nối cộng đồng; giữ nguyên [AchievementsPage.tsx](file:///d:/Android-APP/softskill/frontend/src/features/community/pages/AchievementsPage.tsx) độc lập.
  * Giao thức liên kết liên mạng (Fediverse / ActivityPub) — không cần cho mạng cộng đồng khép kín của ứng dụng học tập.
  * Multi-column "ThreadsDeck" phức tạp — giữ bố cục 1 cột trung tâm sạch sẽ bên trong `StudentPageLayout` (kèm sidebar phụ bên phải trên màn hình `xl` cho Chủ đề nổi bật & Gợi ý kết nối).
  * Video carousel nặng & hệ thống DM 1-1 đầy đủ ở Phase 1 — tránh tốn chi phí media streaming và moderation tin nhắn riêng quá sớm.

---

## 3. Thiết kế Trải nghiệm & Giao diện (UX/UI Design)

### 3.1 Kiến trúc Thông tin (Information Architecture)

Trang `/community` vẫn giữ trong `StudentPageLayout` để đồng nhất điều hướng toàn app, đồng thời bổ sung các route con phục vụ đọc sâu:

* `/community` — Không gian chính với thanh chuyển chế độ (Segmented Tabs):
  1. **Dành cho bạn** (Feed tổng hợp theo thuật toán độ chất lượng & mới nhất)
  2. **Đang theo dõi** (Feed theo thời gian thực từ các học viên/mentor đã follow)
  3. **Tranh biện trực tiếp** (Giữ và nâng cấp tab `Phòng trực tuyến` hiện có, gắn với lịch thực tế)
* `/community/posts/:id` — **Trang chi tiết Thread (Thread Detail View)**: Hiển thị bài gốc (hoặc cả chuỗi tự nối), ngữ cảnh bài cha (nếu mở từ một reply), bộ đếm tương tác, khung trả lời nhanh và **cây hội thoại phân nhánh**.
* `/community/topics/:slug` — Feed lọc theo một **Topic Tag** (ví dụ: `giao-tiep`, `thuyet-trinh`, `lam-viec-nhom`, `xu-ly-xung-dot`, `phong-van`).
* `/community/users/:id` — **Hồ sơ Cộng đồng (Community Profile)**: Tiểu sử ngắn, kỹ năng đang luyện, số người theo dõi, 3 tab: `Bài viết`, `Phản hồi`, `Đã trích dẫn/Repost`.

### 3.2 Layout Responsive & Tương thích Design System

* **Desktop (`lg`/`xl`):**
  * Bên trong vùng nội dung chính của `StudentPageLayout`, sử dụng bố cục **2 cột bất đối xứng** (thay vì dàn trải full-width làm dòng chữ quá dài, khó đọc như một số trang mạng xã hội thiếu tối ưu):
    * **Cột trái (Feed chính):** `max-w-[660px]` căn giữa/trái, chứa Hero banner thu gọn (chỉ hiện CTA *"Đăng suy nghĩ / Đặt tình huống"*), thanh lọc Feed + Topic Pills, và danh sách `ThreadPostCard`.
    * **Cột phải (Discovery Rail - ẩn trên mobile, rộng `300px–320px` trên `xl`):** Tìm kiếm nhanh, **Chủ đề nổi bật tuần này**, **Gợi ý kết nối / Mentor tích cực**, và thẻ nhắc **Thử thách tranh biện hôm nay**.
* **Mobile (`< 768px`):**
  * Bố cục 1 cột gọn gàng, thanh Topic Pills cuộn ngang (`overflow-x-auto`), nút Floating Action Button (`+`) góc dưới phải để mở Composer Modal/Sheet nhanh mọi lúc.
* **Ngôn ngữ thị giác & Component System:**
  * Kế thừa trực tiếp CSS variables và bảng màu hiện có trong `frontend/src/styles.css`: nền canvas dịu `#f8fafc`, thẻ trắng `rounded-[22px]` viền `border-slate-200/80`, chữ tiêu đề/tên `#213a61` / `#1a365d` (`--color-brand-600`), điểm nhấn hành động `#2b5282` (`--color-brand-500`) và `#006a61` (`--color-teal-brand`), font `Plus Jakarta Sans`.
  * **Lưu ý tích hợp Layout & UI Primitives sẵn có:**
    * `StudentPageLayout.tsx` đã có sẵn ô tìm kiếm toàn cục và **nút Chuông Thông báo** (chấm đỏ đang tĩnh) ở Topbar — tính năng Notification của Community nên **nối trực tiếp vào chuông Topbar này** thay vì tạo thêm nút thông báo trùng lặp.
    * Project dùng `shadcn` style `base-nova` trên `@base-ui/react` (`frontend/components.json`): các trigger wrapper (như `TooltipTrigger`, `DropdownMenuTrigger`) dùng prop `render={<button ... />}` thay vì `asChild` của Radix.

### 3.3 Giải phẫu Component `ThreadPostCard` & `ThreadConnectorLine`

Cấu trúc lưới 2 cột bên trong mỗi item của một thread (`grid-cols-[44px_1fr] gap-3`):

```text
+-------------------------------------------------------------------+
| [Avatar]   Bảo Trâm · @baotram · 3g trước        [Topic Pill] [...] |
|    |       Khi sếp giao việc mơ hồ, nên làm nháp hay hỏi lại?      |
|    |       Nếu hỏi nhiều thì sợ thiếu chủ động, tự đoán dễ lệch.   |
|    |       +---------------------------------------------------+  |
|    |       | [Poll / Quote Card / Presentation Session Card]   |  |
|    |       +---------------------------------------------------+  |
|    |       ♡ 24   💬 8   ↻ 3   ❝ 2                    🔖        |
+----+--------------------------------------------------------------+
| [Avatar]   Quốc Trung · 2g trước                                  |
|    |       Mình luôn tóm tắt lại 3 gạch đầu dòng trên Slack...    |
|    |       ♡ 11   💬 2   ↻ 0                                      |
|   [+]      ↳ Xem thêm 2 phản hồi trong nhánh này                  |
+-------------------------------------------------------------------+
```

**Quy tắc UX quan trọng cho Thread Line:**
1. Cột trái rộng cố định `44px` (`w-11`): chứa Avatar tròn (`40px–44px`) và thanh nối dọc `w-[2px] bg-slate-200 mx-auto mt-1.5 flex-1` khi bài đó có item nối tiếp ngay bên dưới (tác giả tự nối hoặc reply nối tiếp).
2. **Self-thread Grouping:** Nếu tác giả đăng chuỗi 3 bài liên tiếp, trên Feed chỉ hiển thị bài 1 + bài 2 (hoặc bài 1 + chỉ báo *"Xem tiếp chuỗi 3 bài viết"*), nối bằng đường kẻ liền nét màu xanh nhạt (`bg-brand-200`) để phân biệt chuỗi lập luận của tác giả với phản hồi từ người khác (`bg-slate-200`).
3. **Nén nhánh sâu (Branch Collapsing):** Trên màn hình chi tiết `/community/posts/:id`:
   * Cấp 0: Bài gốc.
   * Cấp 1: Danh sách phản hồi trực tiếp (sắp xếp theo điểm chất lượng hoặc mới nhất).
   * Cấp 2: Hiển thị tối đa 1–2 phản hồi nổi bật nối ngay dưới mỗi phản hồi cấp 1 bằng Thread Line. Nếu nhánh có >2 phản hồi hoặc sâu hơn cấp 2, hiển thị liên kết *"Xem toàn bộ X phản hồi"* để focus vào nhánh đó mà không bị vỡ layout chiều ngang.

### 3.4 Thiết kế Composer (Trình soạn thảo chuẩn Threads)

Mở bằng Dialog (`shadcn` Dialog trên desktop) hoặc Sheet trượt lên trên mobile:

* **Khối soạn thảo chuỗi (Multi-part Composer):**
  * Mặc định 1 ô soạn thảo (tối đa 500 ký tự, có vòng tròn đếm ký tự trực quan đổi màu vàng khi còn <50 ký tự và đỏ khi vượt ngưỡng).
  * Nút **"+ Thêm vào chuỗi"** (chỉ bật khi ô hiện tại có nội dung) tạo ngay block thứ 2 nối bằng Thread Line ngay trong lúc viết — cực kỳ hữu ích khi học viên trình bày lập luận theo cấu trúc **PREP** (*Point - Reason - Example - Point*) hoặc **STAR**.
* **Thanh công cụ đính kèm (Attachment Toolbar) cho mỗi block:**
  1. **Thêm Bình chọn (Poll):** 2–4 phương án, thời hạn 24h / 3 ngày / 7 ngày / không giới hạn.
  2. **Thêm Bài viết dài (Text Attachment - Phase 2/3):** Mở rộng tối đa 5.000–10.000 ký tự cho bài phân tích sâu hoặc kịch bản thuyết trình mẫu.
  3. **Đính kèm Phiên luyện tập (`PresentationSession`):** Chọn một phiên luyện thuyết trình đã hoàn thành (`status = completed`) để hiển thị thẻ tóm tắt điểm số (`overall_score`, `words_per_minute`, nhận xét chính) nhằm xin góp ý cộng đồng.
  4. **Gắn Spoiler:** Đánh dấu một đoạn text hoặc thẻ kết quả cần bấm mới hiện (hữu ích cho câu đố tình huống hoặc đáp án mẫu).
* **Metadata chân composer (Footer Controls):**
  * **Chọn Topic Tag (1 thẻ bắt buộc hoặc gợi ý):** `Giao tiếp`, `Thuyết trình`, `Tranh biện`, `Phỏng vấn`, `Làm việc nhóm`, `Quản lý cảm xúc`.
  * **Chọn Ai có thể trả lời (`reply_control`):**
    * `Mọi người` (mặc định)
    * `Người bạn theo dõi`
    * `Chỉ người được nhắc tên (@mention)`
    * `Cần duyệt trước khi hiển thị` (tùy chọn nâng cao ở Phase 3).

---

## 4. Cơ chế Thuật toán Feed & An toàn Nội dung

### 4.1 Thuật toán Xếp hạng Feed (Heuristic Ranking thực dụng)

Ở quy mô ứng dụng học tập (hàng trăm đến hàng chục nghìn người dùng), việc dựng hệ thống Deep Learning ranking như Meta là quá tải và không cần thiết (*over-engineering*). Ta đề xuất **Công thức chấm điểm Heuristic có trọng số minh bạch** (tính tại thời điểm query hoặc cập nhật định kỳ qua Scheduled Job):

$$\text{FeedScore}(p) = \frac{B_{\text{base}} + W_{\text{rep}} \cdot R_{\text{substantive}}(p) + W_{\text{repost}} \cdot RP(p) + W_{\text{quote}} \cdot Q(p) + W_{\text{poll}} \cdot V(p) + W_{\text{like}} \cdot L(p) + B_{\text{topic}}(p, u)}{(\text{AgeHours}(p) + 2)^{\gamma}}$$

Trong đó, các trọng số lấy cảm hứng trực tiếp từ cơ chế của Threads:

* **$R_{\text{substantive}}(p)$ (Phản hồi có chiều sâu, $W_{\text{rep}} = 4.0$):** Khác với Like dễ bấm vô thức, bình luận có độ dài $\ge 30$ ký tự (khoảng 7–8 từ tiếng Việt trở lên) mang trọng số cao nhất, phản ánh đúng tinh thần thảo luận kỹ năng mềm.
* **$RP(p)$ & $Q(p)$ (Repost & Quote, $W_{\text{repost}} = 3.5, W_{\text{quote}} = 4.5$):** Quote Post được trọng số cao nhất vì tạo ra cuộc hội thoại mới.
* **$V(p)$ (Lượt bình chọn Poll, $W_{\text{poll}} = 1.5$):** Tạo động lực tham gia cho bài tình huống.
* **$L(p)$ (Lượt thích, $W_{\text{like}} = 1.0$):** Tín hiệu nền nhẹ nhất.
* **$B_{\text{topic}}(p, u)$ (Điểm khớp chủ đề):** Cộng điểm nhẹ nếu bài viết thuộc chủ đề người dùng hay tương tác hoặc phù hợp giai đoạn hiện tại trong `LearningPath`.
* **$\gamma = 1.5$ (Gravity / Time Decay):** Đảm bảo bài mới (kể cả của học viên ít follower) có cơ hội xuất hiện ở nhóm đầu trong 2–6 giờ đầu (*cold-start fairness*), nhưng bài thảo luận chất lượng cao vẫn giữ vị trí 24–48 giờ.
* **Tăng độ tươi mới (Diversity Penalty):** Giới hạn tối đa 2 bài liên tiếp của cùng 1 tác giả trong 1 trang feed.

### 4.2 Tách biệt phạm vi Gamification (Out of Scope hiện tại)

* Theo định hướng ưu tiên hiện tại, **tính năng cộng đồng không tích hợp XP, huy hiệu đóng góp hay bảng xếp hạng/giải đấu**.
* Động lực tham gia đến từ **chất lượng cuộc trò chuyện** (Poll tình huống thực tế, phản hồi theo cây hội thoại rõ ràng, Quote Post trao đổi quan điểm, và xin nhận xét bài thuyết trình ở Phase 2), giúp tránh hiện tượng bình luận cho có để "cày điểm".
* Các thay đổi ở [CommunityPage.tsx](file:///d:/Android-APP/softskill/frontend/src/features/community/pages/CommunityPage.tsx) không đụng tới [AchievementsPage.tsx](file:///d:/Android-APP/softskill/frontend/src/features/community/pages/AchievementsPage.tsx) hay `tournament.ts`.

### 4.3 Hệ thống Kiểm duyệt & An toàn (Moderation & Safety)

1. **Kiểm soát chủ động của tác giả (Creator Controls):**
   * `reply_control`: Lưu trực tiếp trên bài gốc (`everyone | followers | following | mentioned_only | locked`). Kiểm tra ngay ở Backend Policy/FormRequest khi tạo reply.
   * **Ẩn phản hồi (`is_hidden_by_author`):** Chủ bài viết gốc có quyền ẩn bất kỳ bình luận cấp 1 nào; khi truy vấn hiển thị, hệ thống loại bỏ luôn toàn bộ nhánh con có `parent_id` đi qua bình luận bị ẩn (giống hành vi `manage_reply` của Threads). Nếu bình luận bị **chính tác giả xóa mềm (`deleted_at`)** nhưng vẫn còn sub-reply bên dưới, UI giữ một node placeholder *"Phản hồi này đã bị xóa"* để **không làm đứt Thread Line** của các phản hồi con hợp lệ; `replies_count` chỉ đếm các node còn hiển thị.
2. **Lọc từ khóa & Chặn/Tắt tiếng cá nhân (`Hidden Words`, `Mute / Block`):**
   * Người dùng tự thêm danh sách từ/cụm từ nhạy cảm vào `community_hidden_words` và có thể `mute` hoặc `block` tài khoản khác qua `community_user_restrictions`.
   * Bổ sung bộ lọc từ khóa vi phạm tiêu chuẩn cộng đồng ở tầng server khi tạo bài/bình luận.
3. **Báo cáo & Xử lý (Reporting Workflow):**
   * Người dùng báo cáo bài viết/bình luận theo lý do (`spam`, `harassment`, `off_topic`, `misinformation`).
   * Tích hợp phân quyền `spatie/laravel-permission` sẵn có (lưu ý `User.php` gán role với **guard `'web'`** — khi kiểm tra quyền moderator trên API `auth:sanctum` cần thống nhất guard `'web'` hoặc cấu hình rõ trong `Permission`/`Gate`) để ẩn bài vi phạm toàn cục (`status = removed`) hoặc cảnh cáo tài khoản.

---

## 5. Kiến trúc Kỹ thuật, Mô hình Dữ liệu & Tối ưu SQL MySQL 8.0+ (Laravel 13 + React 19)

### 5.1 Lựa chọn Mô hình Dữ liệu Cây Hội thoại (Thread Tree Model)

Trong các bài toán cây bình luận (Adjacency List thuần, Nested Sets, Materialized Path, Closure Table), với stack **Laravel 13 + MySQL 8.0+ (InnoDB)**, giải pháp tối ưu nhất là **Hybrid Adjacency List (Denormalized Root & Thread Pointers)**:

* Mỗi bản ghi trong `community_posts` vừa đại diện cho **bài gốc**, **bài nối trong self-thread**, vừa đại diện cho **một bình luận/reply** (đồng nhất thực thể *Post = Node*, đúng như cách Meta Threads thiết kế API và data model!).
* **Chiến lược Khóa chính & Clustered Index trên InnoDB:**
  * Dùng **`BIGINT UNSIGNED AUTO_INCREMENT`** làm `PRIMARY KEY` cho `community_posts` (8 bytes, tăng tuần tự). Trong **MySQL InnoDB**, mọi Secondary Index đều tự động nhúng giá trị `PRIMARY KEY` ở lá B-Tree; nếu dùng UUID 36 bytes làm PK sẽ làm phình toàn bộ secondary index và gây phân mảnh page (*page splits*) khi insert. Với `BIGINT` tuần tự, dữ liệu ghi nối tiếp vào cuối B-Tree (*append-only*) và Buffer Pool cache được nhiều index hơn gấp 3–4 lần. *(Có thể kèm `public_id` dạng ULID hoặc encode ID nếu không muốn lộ số thứ tự trên URL).*
* Các cột định vị cây:
  * `root_id`: `BIGINT UNSIGNED NULL` — ID của bài viết gốc cao nhất của toàn bộ cuộc thảo luận (`NULL` nếu chính nó là bài gốc). Giúp lấy cây bình luận bằng index `(root_id, ...)` thay vì N+1 query đệ quy.
  * `parent_id`: `BIGINT UNSIGNED NULL` — ID của bài cha trực tiếp (`NULL` nếu là bài gốc).
  * `thread_group_id`: `BIGINT UNSIGNED NULL` — ID dùng để gom chuỗi **Self-thread** của tác giả (ID bài đầu chuỗi).
  * `depth`: `TINYINT UNSIGNED NOT NULL DEFAULT 0` — Độ sâu (`0` = bài gốc, `1` = reply trực tiếp, `2` = reply của reply...). **Mẹo B-Tree MySQL:** Lọc feed gốc bằng `depth = 0 AND status = 'published'` thay vì `parent_id IS NULL` giúp dùng hằng số `NOT NULL` gọn sạch trong Composite Descending Index.
  * `quote_post_id`: ID của bài được trích dẫn (Quote Post), nullable.
  * `repost_of_id`: ID của bài được đăng lại thuần túy (Pure Repost), nullable.

**Lợi ích của thiết kế thống nhất `Post = Node`:**
* Một reply cũng có thể được Like, Repost, Quote, Bookmark, chia sẻ link riêng (`/community/posts/:id`) và xem nhánh con của riêng nó — giống 100% hành vi của Threads.

### 5.2 Sơ đồ Thực thể Quan hệ & Thiết kế Index chuẩn InnoDB

**Lưu ý mở rộng bảng `users` hiện hữu:** Bảng `users` hiện chưa có handle hay tiểu sử. Cần bổ sung migration thêm `username` (`VARCHAR(50)`, unique, nullable hoặc auto-sinh từ `name` + `id` cho tài khoản cũ), `bio` (`VARCHAR(280)`, nullable) và `headline` (`VARCHAR(120)`, nullable) — hoặc tách vào bảng `community_profiles` 1-1 với `users` để giữ bảng `users` gọn sạch.

```text
users (existing + community_profiles: user_id PK/FK, username UNIQUE, bio, headline)
 ├──< community_posts (id BIGINT UNSIGNED PK, user_id, root_id, parent_id, thread_group_id,
 │                     depth TINYINT UNSIGNED, quote_post_id, repost_of_id, topic_tag_id,
 │                     body TEXT, long_body MEDIUMTEXT NULL, body_search VARCHAR(600) NULL,
 │                     is_spoiler TINYINT(1), reply_control ENUM/VARCHAR(24),
 │                     status ENUM/VARCHAR(20), is_hidden_by_author TINYINT(1),
 │                     presentation_session_id CHAR(36) NULL [FK -> presentation_sessions.id],
 │                     share_session_transcript TINYINT(1),
 │                     likes_count INT UNSIGNED, replies_count INT UNSIGNED,
 │                     reposts_count INT UNSIGNED, quotes_count INT UNSIGNED,
 │                     hot_score DECIMAL(12, 4), created_at TIMESTAMP(3), deleted_at TIMESTAMP NULL)
 │      ├──< community_polls (id, post_id, question, expires_at, total_votes)
 │      │      ├──< community_poll_options (id, poll_id, label, votes_count, sort_order)
 │      │      └──< community_poll_votes (poll_id, user_id, option_id, created_at)
 │      ├──< community_post_reactions (user_id, post_id, type ['like','bookmark'], created_at)
 │      └──< community_reports (id, post_id, reporter_id, reason, note, status, reviewed_by, created_at)
 ├──< community_follows (follower_id, following_id, created_at)
 ├──< community_user_restrictions (user_id, target_user_id, type ['mute','block'], created_at)
 ├──< community_hidden_words (id, user_id, word, created_at)
 └──< community_notifications (id, user_id, actor_id, post_id, type, read_at, created_at)

community_topic_tags (id, slug, name, description, color_token, posts_count, is_active)
```

**Thiết kế Index chiến lược cho MySQL 8.0+ (InnoDB):**

| Bảng | Index / Constraint | Mục đích & Lý do kỹ sư DB |
| :--- | :--- | :--- |
| `community_posts` | `INDEX idx_feed_for_you (depth, status, hot_score DESC, id DESC)` | **Descending Index (MySQL 8.0+):** Khớp 100% điều kiện `WHERE depth = 0 AND status = 'published'` và `ORDER BY hot_score DESC, id DESC` → **không phát sinh `Using filesort`**. *(Lưu ý: dùng raw `CREATE INDEX` trong migration để khai báo trộn `DESC`/`ASC`; khi xóa mềm đồng thời set `status = 'deleted'` để không phải lọc `deleted_at IS NULL` phá Covering Index).* |
| `community_posts` | `INDEX idx_feed_following (user_id, depth, status, created_at DESC, id DESC)` | Phục vụ từng nhánh user trong feed `Following` (`LATERAL`) và trang hồ sơ cá nhân theo `Range/Covering Index Scan`. |
| `community_posts` | `INDEX idx_feed_topic (topic_tag_id, depth, status, hot_score DESC, id DESC)` | Lọc nhanh Topic Feed không cần sort lại. |
| `community_posts` | `INDEX idx_thread_tree (root_id, status, is_hidden_by_author, parent_id, likes_count DESC, id ASC)` | Gom cây hội thoại của 1 bài gốc; đặt `parent_id` trước `likes_count DESC, id ASC` để tối ưu Window Function `ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY likes_count DESC, id ASC)`. |
| `community_posts` | `FULLTEXT INDEX ft_body_search (body_search)` | Standard InnoDB Full-Text Parser cho tiếng Việt đã bỏ dấu (tương thích `whereFullText(..., ['mode' => 'boolean'])` của Laravel 13; tránh `ngram` gây phình index & nhiễu âm tiết ngắn). |
| `community_post_reactions` | `PRIMARY KEY (user_id, post_id, type)` + `INDEX idx_post_type (post_id, type)` | **Clustered PK tối ưu theo điểm truy cập chính (Viewer Hydration):** kiểm tra trạng thái `like`/`bookmark` của 15 bài chỉ qua Covering Index, không chạm data page; vừa chống trùng lặp, không cần surrogate `id` thừa! |
| `community_poll_votes` | `PRIMARY KEY (user_id, poll_id)` + `INDEX idx_poll_option (poll_id, option_id)` | Tương tự: lookup vote của user trên trang feed cực nhanh bằng Covering Index + chống vote trùng. |
| `community_follows` | `PRIMARY KEY (follower_id, following_id)` + `INDEX idx_following (following_id, follower_id)` | Truy vấn `Tôi đang follow ai` & `Ai follow tôi` đều là **Index-Only Scan**. |

**Ràng buộc tương thích hệ thống hiện tại:**
* **Kiểu khóa ngoại `PresentationSession`:** Bảng `presentation_sessions` dùng **`uuid('id')->primary()`** (`CHAR(36)` trong MySQL với `utf8mb4_unicode_ci`). Migration của `community_posts` bắt buộc dùng `foreignUuid('presentation_session_id')->nullable()->constrained('presentation_sessions')->nullOnDelete()`. Chỉ cho phép chia sẻ chỉ số/nhận xét/transcript khi chính chủ sở hữu session opt-in; tuyệt đối không lộ `audio_path` riêng tư.
* **Tuân thủ `Model::shouldBeStrict()` (`AppServiceProvider.php`):** Mọi truy vấn feed và cây hội thoại phải eager-load đầy đủ (`->with(['author.communityProfile', 'topicTag', 'poll.options', 'presentationSession', 'quotePost.author'])`), tránh lazy loading gây exception `500`, và khai báo đầy đủ `#[Fillable]` theo convention của `User.php`.

### 5.3 Tối ưu câu lệnh SQL thông minh cho MySQL 8.0+ (InnoDB)

Dưới đây là 7 kỹ thuật SQL chuyên sâu giúp hệ thống đạt độ trễ phản hồi `< 10–15ms` ngay cả khi bảng `community_posts` tăng lên hàng triệu dòng:

#### Kỹ thuật 1: Keyset Cursor Pagination + Late Row Lookup (Tránh `OFFSET` và đọc `TEXT` thừa)
* **Vấn đề:** `OFFSET 5000 LIMIT 15` buộc InnoDB quét và vứt bỏ 5.000 dòng kèm cột `body`/`long_body` (off-page overflow pages).
* **Giải pháp SQL thông minh (Deferred Join + Keyset):** Dùng chỉ mục phủ `idx_feed_for_you` để lấy đúng 16 `id` trước, sau đó mới join lại `PRIMARY KEY` lấy cột `body`:
```sql
SELECT p.id, p.user_id, p.topic_tag_id, p.body, p.quote_post_id, p.repost_of_id,
       p.presentation_session_id, p.likes_count, p.replies_count, p.reposts_count,
       p.hot_score, p.created_at
FROM (
    SELECT id
    FROM community_posts
    WHERE depth = 0
      AND status = 'published'
      AND hot_score <= :cursor_score
      AND (hot_score < :cursor_score OR id < :cursor_id)
    ORDER BY hot_score DESC, id DESC
    LIMIT 16
) AS page_ids
INNER JOIN community_posts AS p ON p.id = page_ids.id
ORDER BY p.hot_score DESC, p.id DESC;
```
* **Tại sao tối ưu:** Subquery `page_ids` chạy **100% trên index `idx_feed_for_you`** (`Using where; Using index`) vì `id` nằm sẵn ở lá Secondary Index của InnoDB và ta **không lọc `deleted_at IS NULL`** (thay bằng gán `status = 'deleted'` khi xóa mềm)! Bước join ngoài chỉ làm 16 lần PK lookup `eq_ref`.
* **Phòng tránh sai số Keyset:** Tuyệt đối dùng `DECIMAL(12, 4)` cho `hot_score` (không dùng `DOUBLE` IEEE 754) và truyền `cursor_score` dạng string qua JSON để tránh sai số làm tròn khi so sánh `hot_score = :cursor_score` dẫn tới sót/lặp bài ở ranh giới trang. *(Lưu ý: dùng điều kiện tách `hot_score <= :cursor_score AND (hot_score < :cursor_score OR id < :cursor_id)` giúp mọi phiên bản MySQL 8.0/8.4 kích hoạt Range Scan ổn định).*

#### Kỹ thuật 2: Feed `Following` bằng `UNION ALL` + `LATERAL` (Tránh `OR` và tránh `Using filesort`)
* **Anti-pattern:** `WHERE (p.user_id = :me OR EXISTS (...))` làm mất index vì `OR`, còn `INNER JOIN ... ORDER BY p2.created_at DESC LIMIT 16` vẫn bị `Using filesort` vì `created_at` không xếp sẵn theo từng `following_id`.
* **Giải pháp SQL thông minh (MySQL 8.0.14+ `CROSS JOIN LATERAL`):** Lấy top 16 bài mới nhất **cho từng người đang follow** (mỗi người đọc đúng tối đa 16 dòng qua `idx_feed_following` không filesort), gộp với bài của chính mình bằng `UNION ALL`:
```sql
SELECT p.*
FROM (
    (
        SELECT id, created_at
        FROM community_posts
        WHERE user_id = :viewer_id AND depth = 0 AND status = 'published'
          AND (created_at < :cursor_ts OR (created_at = :cursor_ts AND id < :cursor_id))
        ORDER BY created_at DESC, id DESC
        LIMIT 16
    )
    UNION ALL
    (
        SELECT lat.id, lat.created_at
        FROM (
            SELECT following_id
            FROM community_follows
            WHERE follower_id = :viewer_id
            ORDER BY created_at DESC
            LIMIT 250
        ) AS f
        CROSS JOIN LATERAL (
            SELECT p2.id, p2.created_at
            FROM community_posts p2
            WHERE p2.user_id = f.following_id
              AND p2.depth = 0
              AND p2.status = 'published'
              AND (p2.created_at < :cursor_ts OR (p2.created_at = :cursor_ts AND p2.id < :cursor_id))
            ORDER BY p2.created_at DESC, p2.id DESC
            LIMIT 16
        ) AS lat
    )
    ORDER BY created_at DESC, id DESC
    LIMIT 16
) AS feed_ids
INNER JOIN community_posts p ON p.id = feed_ids.id
ORDER BY p.created_at DESC, p.id DESC;
```
* **Chặn trần Fan-out `LATERAL`:** Nhờ giới hạn `LIMIT 250` người đang follow và mỗi người lấy tối đa 16 dòng qua index `idx_feed_following` (không filesort), số vòng lặp `loops` trong `EXPLAIN ANALYZE` được chặn trần an toàn ngay cả khi user follow hàng nghìn người. *(Nâng cấp sau nếu cần: sắp xếp theo `last_posted_at` hoặc tách feed fan-out).*

#### Kỹ thuật 3: Dựng Cây Hội thoại + Cắt nhánh bị ẩn bằng CTE & Window Function (MySQL 8.0+)
Thay vì kéo hàng nghìn bình luận về PHP rồi mới lọc nhánh ẩn hoặc cắt top phản hồi:
1. **Truy vấn chuỗi cha (Ancestors)** khi mở trực tiếp một reply sâu: Dùng **`WITH RECURSIVE`** đi ngược từ `parent_id` lên `root_id` (chỉ vài dòng theo PK lookup, `< 1ms`):
```sql
WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, user_id, body, depth, created_at
    FROM community_posts WHERE id = :target_post_id
    UNION ALL
    SELECT p.id, p.parent_id, p.user_id, p.body, p.depth, p.created_at
    FROM community_posts p
    INNER JOIN ancestors a ON p.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY depth ASC;
```
2. **Giới hạn mỗi nhánh cấp 1 chỉ tải sẵn Top 2 reply cấp 2 bằng `ROW_NUMBER()` + Loại bỏ nhánh bị ẩn/block:**
```sql
WITH visible_replies AS (
    SELECT p.*,
           ROW_NUMBER() OVER (
               PARTITION BY p.parent_id
               ORDER BY p.likes_count DESC, p.id ASC
           ) AS branch_rank
    FROM community_posts p
    WHERE p.root_id = :root_id
      AND p.depth IN (1, 2)
      AND p.status = 'published'
      AND p.is_hidden_by_author = 0
      -- Loại bỏ reply cấp 2 nếu reply cấp 1 cha đã bị ẩn hoặc bị moderator gỡ
      AND (
          p.depth = 1
          OR EXISTS (
              SELECT 1 FROM community_posts parent_lvl1
              WHERE parent_lvl1.id = p.parent_id
                AND parent_lvl1.is_hidden_by_author = 0
                AND parent_lvl1.status = 'published'
          )
      )
      -- Lọc user bị viewer block/mute ngay trong SQL
      AND NOT EXISTS (
          SELECT 1 FROM community_user_restrictions r
          WHERE r.user_id = :viewer_id AND r.target_user_id = p.user_id
      )
)
SELECT *
FROM visible_replies
WHERE depth = 1 OR branch_rank <= 2
ORDER BY depth ASC, likes_count DESC, id ASC;
```
* **Hiệu quả:** Dù một bài viết viral có 2.000 bình luận, truy vấn này chỉ trả về **tối đa 2 preview sub-reply đẹp nhất cho mỗi nhánh cấp 1**, lọc sạch nhánh ẩn và tài khoản bị chặn ngay tại MySQL, không chuyển dữ liệu thừa qua mạng!

#### Kỹ thuật 4: Viewer Context Hydration (Triệt tiêu N+1 với Covering Index `O(1)`)
Sau khi có danh sách tối đa 15–30 `post_id` (và `poll_id`) của trang hiện tại, thực hiện **đúng 2 câu query batch** chạm **100% Index-Only**:
```sql
-- Query 1: Trạng thái Like & Bookmark của người xem (Covering Index trên PK (user_id, post_id, type))
SELECT post_id, type
FROM community_post_reactions
WHERE user_id = :viewer_id
  AND post_id IN (:page_post_ids);

-- Query 2: Phương án Poll người xem đã chọn (Covering Index trên PK (user_id, poll_id))
SELECT poll_id, option_id
FROM community_poll_votes
WHERE user_id = :viewer_id
  AND poll_id IN (:page_poll_ids);
```
* **Điểm tinh tế:** Nhờ đặt `user_id` đứng đầu trong `PRIMARY KEY (user_id, post_id, type)` và `PRIMARY KEY (user_id, poll_id)`, InnoDB thực hiện `range` scan siêu nhỏ chỉ đọc đúng mấy trăm byte trong một leaf page!

#### Kỹ thuật 5: Ghi Tương tác An toàn Cao (Lock-free Check & Chống Deadlock AB-BA)
1. **Toggle Like / Bookmark an toàn (Tránh Race Condition & Lưu ý `INSERT IGNORE`):**
   * *Sai lầm phổ biến:* `SELECT ... IF NOT EXISTS -> INSERT -> UPDATE +1` dễ gây lỗi trùng khóa hoặc Deadlock gap-lock trong mức cô lập `REPEATABLE READ` mặc định của InnoDB.
   * *Chuẩn MySQL Engineering & Laravel 13:*
     * Trước tiên kiểm tra bài viết tồn tại (`Post::whereKey($postId)->exists()` hoặc route model binding của Laravel), sau đó dùng `DB::table('community_post_reactions')->insertOrIgnore([...])` (trả về số dòng vừa chèn: `1` nếu mới, `0` nếu đã tồn tại). *(Lưu ý: `INSERT IGNORE` có thể nuốt cả lỗi FK/NOT NULL thành warning, nên **bắt buộc** đảm bảo `post_id` đã được xác thực hợp lệ qua route model binding trước khi chạy).*
   ```sql
   -- Trong DB::transaction(..., attempts: 3) sau khi đã verify post_id tồn tại
   INSERT IGNORE INTO community_post_reactions (user_id, post_id, type, created_at)
   VALUES (:viewer_id, :post_id, 'like', NOW());
   -- Nếu affectingStatement() === 1 thì mới cộng counter:
   UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = :post_id;
   ```
   Và khi bỏ thích:
   ```sql
   DELETE FROM community_post_reactions
   WHERE user_id = :viewer_id AND post_id = :post_id AND type = 'like';
   -- Nếu affectingStatement() === 1:
   UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = :post_id;
   ```
2. **Đổi phương án Poll Vote (Chống Deadlock AB-BA khi 2 người đổi phiếu chéo A↔B):**
   * Nếu User 1 đổi từ `A → B` cùng lúc User 2 đổi từ `B → A`, khóa dòng theo thứ tự `old` rồi `new` sẽ gây Deadlock chéo!
   * *Giải pháp:* Luôn cập nhật `community_poll_votes` trước (`SELECT ... FOR UPDATE`), sau đó **khóa/cập nhật 2 dòng của `community_poll_options` theo thứ tự `id` tăng dần (`LEAST(old, new)` trước, `GREATEST(old, new)` sau)** — hoặc gom trong **1 câu `UPDATE` đơn với `CASE`**:
   ```sql
   UPDATE community_poll_options
   SET votes_count = CASE
       WHEN id = :old_option_id THEN GREATEST(0, votes_count - 1)
       WHEN id = :new_option_id THEN votes_count + 1
   END
   WHERE id IN (:old_option_id, :new_option_id)
     AND poll_id = :poll_id;
   ```
   *(MySQL InnoDB tự quét và khóa các row trong `IN (...)` theo thứ tự Index tăng dần nhất quán → **triệt tiêu Deadlock AB-BA hoàn toàn trong 1 round-trip SQL**!)*

#### Kỹ thuật 6: Tìm kiếm Tiếng Việt với `FULLTEXT` chuẩn + `BOOLEAN MODE`
* **Tránh `LIKE '%từ khóa%'`** gây Full Table Scan, và **tránh `ngram` parser** cho tiếng Việt (vì `ngram` cắt từng 2 ký tự kiểu `'gi','ia','ao'`, vốn sinh cho tiếng CJK không dấu cách, sẽ làm phình index và khớp nhầm nhiều âm tiết tiếng Việt).
* Bổ sung cột `body_search` (text thường đã `strtolower` + bỏ dấu tiếng Việt ở tầng PHP khi lưu, ví dụ `"khi sep giao viec mo ho"`) và đánh **`FULLTEXT INDEX ft_body_search (body_search)`** chuẩn của InnoDB.
* Dùng trực tiếp `->whereFullText('body_search', $sanitizedBooleanQuery, ['mode' => 'boolean'])` trong **Laravel 13** (hậu tố `*` giúp giữ cả các từ ngắn 2 ký tự vốn bị `innodb_ft_min_token_size = 3` bỏ qua nếu tìm chính xác).
* **Bắt buộc Sanitize toán tử Boolean:** InnoDB `IN BOOLEAN MODE` sẽ ném `Syntax error` nếu chuỗi tìm kiếm chứa ký tự đặc biệt như `@`, `++`, `+*`, `+-`, `(`, `)`, `"`. Tầng PHP phải loại bỏ toàn bộ ký tự ngoài chữ cái/số (`preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $q)`) trước khi ghép dạng `+word1* +word2*`.
```sql
SELECT id, body, user_id, created_at,
       MATCH(body_search) AGAINST(:boolean_query IN BOOLEAN MODE) AS relevance
FROM community_posts
WHERE depth = 0
  AND status = 'published'
  AND MATCH(body_search) AGAINST(:boolean_query IN BOOLEAN MODE)
ORDER BY relevance DESC, id DESC
LIMIT 20;
```
*(Kết hợp Deferred Join hoặc chỉ select cột cần thiết để hiển thị kết quả tức thì).*

#### Kỹ thuật 7: Chunked `hot_score` Decay Job (Không khóa bảng lớn)
* Tuyệt đối không chạy một lệnh `UPDATE community_posts SET hot_score = ...` quét toàn bảng (gây giữ lock hàng nghìn dòng và phình InnoDB Undo Log).
* Dùng Job chạy mỗi 15–30 phút, chỉ xử lý bài gốc tạo trong **72 giờ gần nhất**, phân lô theo `id > :last_id` mỗi lần **500 dòng**:
```sql
UPDATE community_posts
SET hot_score = (
    10.0
    + (substantive_replies_count * 4.0)
    + (quotes_count * 4.5)
    + (reposts_count * 3.5)
    + (poll_votes_count * 1.5)
    + (likes_count * 1.0)
) / POW(GREATEST(0, TIMESTAMPDIFF(MINUTE, created_at, NOW()) / 60.0) + 2.0, 1.5)
WHERE id IN (:chunk_of_500_ids);
```
*(Gợi ý nâng cấp: lưu thêm cột counter nhỏ `substantive_replies_count` và `poll_votes_count` trên `community_posts` để công thức tính `hot_score` chạy **không cần JOIN bảng con**, giữ I/O cực thấp).*

### 5.4 Thiết kế RESTful API (Laravel 13 + Scramble OpenAPI)

Tất cả endpoints đặt dưới prefix `/api/v1/community` và middleware `auth:sanctum` (bổ sung RateLimiter mới trong `AppServiceProvider.php` như `community-post`, `community-reply`, `community-react` để chống spam):

| Nhóm | Method & Endpoint | Mô tả & Tham số chính |
| :--- | :--- | :--- |
| **Feed & Khám phá** | `GET /v1/community/feed` | `?tab=for_you\|following&topic=<slug>&cursor=<token>&limit=15` — `Following` dùng `UNION ALL` + `CROSS JOIN LATERAL` keyset `(created_at, id)`; `For You` dùng Deferred Join trên `(hot_score, id)` kèm dedupe ở client |
| | `GET /v1/community/topics` | Danh sách Topic Tags kỹ năng mềm + số lượng bài |
| | `GET /v1/community/search` | `?q=...&type=posts\|users` — Dùng `FULLTEXT` trên `body_search` |
| **Posts & Threads** | `POST /v1/community/posts` | Tạo bài đơn, chuỗi **Self-thread** (`items: [...]`), có thể kèm `poll`, `long_body`, `quote_post_id`, `presentation_session_id`, `topic_tag_id`, `reply_control` |
| | `GET /v1/community/posts/{post}` | Lấy chi tiết Thread: chuỗi `ancestors` (`WITH RECURSIVE`), chuỗi tác giả, và cây phản hồi phân cấp (`ROW_NUMBER()` lấy top 2 sub-reply/nhánh) |
| | `GET /v1/community/posts/{post}/replies` | Lazy-load / phân trang nhánh phản hồi sâu hơn |
| | `POST /v1/community/posts/{post}/replies` | Tạo phản hồi cho một node (tự kiểm tra `reply_control` của bài gốc) |
| | `DELETE /v1/community/posts/{post}` | Xóa mềm bài viết của chính mình |
| **Tương tác** | `POST /v1/community/posts/{post}/repost` | Toggle pure Repost |
| | `POST /v1/community/posts/{post}/reactions` | Toggle `like` hoặc `bookmark` (dùng `INSERT IGNORE` + atomic counter) |
| | `POST /v1/community/polls/{poll}/vote` | Chọn/đổi phương án poll (atomic `UPDATE ... CASE` chống deadlock) |
| **Profile & Follow** | `GET /v1/community/users/{user}` | Profile cộng đồng + thống kê followers/following |
| | `GET /v1/community/users/{user}/posts` | `?tab=posts\|replies\|reposts` |
| | `POST /v1/community/users/{user}/follow` | Toggle theo dõi học viên/mentor |
| **An toàn & Thông báo** | `PATCH /v1/community/posts/{post}/hide-reply` | Chủ bài gốc ẩn/hiện một phản hồi cấp 1 (ẩn luôn nhánh con khi render) |
| | `POST /v1/community/posts/{post}/report` | Gửi báo cáo vi phạm |
| | `GET /v1/community/hidden-words` & `PUT` | Quản lý danh sách từ khóa ẩn cá nhân |
| | `GET /v1/community/notifications` | Danh sách thông báo (reply, quote, repost, follow) + đánh dấu đã đọc |

Mọi Request/Response sử dụng `spatie/laravel-data` hoặc FormRequest + JsonResource chuẩn để `dedoc/scramble` tự sinh `api.json`, sau đó chạy `npm run api:sync` để đồng bộ TypeScript schema sang `frontend/src/api/schema.ts`.

### 5.5 Kiến trúc Frontend (`frontend/src/features/community/`)

Áp dụng mô hình Clean Feature Architecture sẵn có của dự án:

```text
frontend/src/features/community/
├── api/
│   ├── communityKeys.ts      # React Query key factory
│   ├── useCommunityFeed.ts   # useInfiniteQuery cho For You / Following / Topic
│   ├── useThreadDetail.ts    # Query cây hội thoại & lazy branches
│   └── useCommunityMutations.ts # Optimistic UI cho like, vote, repost, reply
├── components/
│   ├── ThreadPostCard.tsx    # Card chuẩn Threads (hỗ trợ self-thread & quote card)
│   ├── ThreadConnectorLine.tsx
│   ├── ThreadTree.tsx        # Render đệ quy có giới hạn depth + "Xem thêm nhánh"
│   ├── ThreadComposerDialog.tsx # Multi-part self-thread + Poll + Session picker
│   ├── PollWidget.tsx        # Thanh % mượt + ARIA state
│   ├── TopicPillBar.tsx
│   └── CommunityRightRail.tsx # Trending topics & Suggested peers (desktop xl)
├── pages/
│   ├── CommunityPage.tsx     # Feed chính + tab Phòng tranh biện
│   ├── ThreadDetailPage.tsx  # Trang chi tiết cây hội thoại (/community/posts/:id)
│   ├── CommunityProfilePage.tsx
│   └── AchievementsPage.tsx
└── types/
    └── community.ts
```

**Kỹ thuật UX cốt lõi phía Frontend:**
* **Optimistic UI Updates:** Khi người dùng bấm Thích, Repost, Bookmark hoặc Vote Poll, cập nhật ngay cache của `@tanstack/react-query` (kèm rollback nếu API lỗi) để đạt độ phản hồi tức thì như app native.
* **Infinite Cursor Scroll:** Sử dụng `useInfiniteQuery` + `IntersectionObserver` để cuộn mượt không giật trang.
* **Smart Polling (trước khi đầu tư WebSockets):** Khi người dùng đang mở trang `ThreadDetailPage`, bật `refetchInterval: 15000` (chỉ khi tab đang active) để cập nhật phản hồi mới mà không làm phức tạp hạ tầng deploy local.

---

## 6. Lộ trình Triển khai & Quản trị Rủi ro

### 6.1 Lộ trình 3 giai đoạn (Phased Roadmap)

| Giai đoạn | Mục tiêu & Phạm vi | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- |
| **Phase 1: Core Threads MVP** *(Ưu tiên triển khai trước)* | - DB migrations cho `posts`, `polls`, `reactions`, `topic_tags`, `follows`<br>- Feed `Dành cho bạn` (ranking heuristic) & `Đang theo dõi` (cursor pagination)<br>- Composer: Text (500 ký tự) + Self-thread nhiều đoạn + Poll (2–4 lựa chọn) + Topic Tag + `reply_control`<br>- Cây hội thoại có Thread Lines (hiển thị 2–3 tầng + nút mở rộng nhánh)<br>- Like, Repost, Bookmark với Optimistic UI<br>- Thay thế hoàn toàn dữ liệu mock trong `CommunityPage.tsx` | 1. Đăng bài đơn, chuỗi self-thread, và poll lưu bền vững vào DB.<br>2. Reply nhiều tầng hiển thị đúng Thread Line; kiểm tra `reply_control` chặn được request trái phép ở backend.<br>3. `api:sync` không lỗi type; toàn bộ unit/feature test Pest (BE) và Vitest (FE) pass. |
| **Phase 2: Engagement, Safety & SoftSkill Integration** | - **Quote Post** (trích dẫn bài viết kèm bình luận)<br>- Đính kèm **PresentationSession** để xin Peer Feedback (chỉ chia sẻ chỉ số & nhận xét, bảo vệ `audio_path`)<br>- Trang Hồ sơ cộng đồng (`/community/users/:id`) & Tìm kiếm<br>- **Hide Reply** (ẩn cả nhánh con), **Hidden Words**, Mute/Block, Report moderation<br>- Gắn Notification Center vào nút chuông sẵn có trên Topbar của `StudentPageLayout` | 1. Học viên chọn được phiên luyện thuyết trình đã chấm điểm (`status = completed`) để đăng xin nhận xét mà không lộ file audio riêng tư.<br>2. Chủ bài viết ẩn một reply cấp 1 thì toàn bộ sub-reply dưới đó biến mất khỏi feed người xem.<br>3. Từ khóa trong `Hidden Words` không xuất hiện với người đã cấu hình. |
| **Phase 3: Advanced Community & AI Synergy** | - **Text Attachment** (bài phân tích dài 10.000 ký tự rich-text *"Read more"*) + **Spoiler Tags**<br>- **Reply Approvals** (hàng chờ duyệt phản hồi)<br>- Đồng bộ tab **Phòng tranh biện trực tuyến** với backend<br>- Tích hợp **`laravel/ai`**: AI gợi ý câu hỏi phản biện cho bài tranh biện ít tương tác hoặc tóm tắt 2 luồng quan điểm từ các reply<br>- **Ghost Posts** (24h Q&A) | 1. Bài dài đính kèm collapse/expand mượt trên feed.<br>2. Chủ bài bật Reply Approval có thể duyệt/từ chối phản hồi trước khi public.<br>3. AI Debate Summarizer hoạt động qua queue/rate-limit chuẩn `EnsureAiConfigured`. |

### 6.2 Rủi ro Kỹ thuật & Biện pháp Giảm thiểu

| Rủi ro | Tác động | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| **N+1 Query khi load cây bình luận + trạng thái Like/Vote của user** | Chậm API khi một bài có >100 phản hồi | Dùng `WITH RECURSIVE` + `ROW_NUMBER()` lấy phẳng/giới hạn top sub-replies trong 1 query, eager-load `author`, batch hydration bằng 2 query `Covering Index` trên PK `(user_id, post_id, type)` và `(user_id, poll_id)`, dựng cây `O(n)`. |
| **Deadlock AB-BA & Hot-row Contention trên MySQL InnoDB** | Lỗi `Deadlock found when trying to get lock` hoặc `Lock wait timeout` khi nhiều người like/đổi phiếu poll cùng lúc | Dùng `INSERT IGNORE` + kiểm tra `affectingStatement()`, khóa/cập nhật 2 option poll trong 1 lệnh `UPDATE ... CASE ... WHERE id IN (...)` theo thứ tự B-Tree tăng dần, bọc `DB::transaction(..., attempts: 3)`. |
| **Suy thoái phân trang `OFFSET` & Full Table Scan khi tìm kiếm `LIKE '%...%'`** | Query chậm dần từ vài ms lên vài giây khi dữ liệu lớn | Dùng Keyset Cursor + Deferred Join (`idx_feed_for_you` Descending Index), tách `Following` bằng `UNION ALL` + `LATERAL`, dùng `FULLTEXT` chuẩn (`whereFullText` chế độ `boolean`) trên `body_search` và kiểm chứng định kỳ bằng `EXPLAIN ANALYZE`. |
| **Spam bài viết / bình luận rỗng hàng loạt** | Giảm chất lượng cộng đồng học tập | Áp dụng `throttle` middleware ở Laravel cho `POST /posts` và `POST /replies`; yêu cầu độ dài tối thiểu khi tính trọng số ranking phản hồi sâu; hỗ trợ Hide Reply & Report. |
| **Quá tải UI trên mobile khi chuỗi tự nối hoặc cây reply quá dài** | Khó đọc, người dùng lạc khỏi mạch chính | Giới hạn hiển thị tối đa 2–3 node mỗi chuỗi trên Feed chính; giới hạn độ sâu thụt lề tối đa 2 cấp trên mobile rồi dùng nút *"Xem nhánh này"* để dịch chuyển gốc nhìn. |

---

## Tài liệu tham chiếu nội bộ

* Hiện trạng giao diện cộng đồng: `frontend/src/features/community/pages/CommunityPage.tsx`
* Khung bố cục học viên & CSS tokens: `frontend/src/components/layout/StudentPageLayout.tsx`, `frontend/src/styles.css`
* Định tuyến frontend: `frontend/src/router/index.tsx`
* API & Model backend hiện có: `backend/routes/api.php`, `backend/app/Models/User.php`, `backend/app/Models/PresentationSession.php`
* Đặc tả Lộ trình học (tham chiếu phong cách thiết kế DB/AI): `docs/superpowers/specs/2026-11-08-learning-path-design.md`
