import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { GradePanel, type PresentationReview } from '../components/Coach/GradePanel';
import { AppIcon as Icon } from '../components/Common/AppIcon';
import { savePresentationHistory } from '../lib/presentation-history';

type MetricKey = 'pace' | 'fillers' | 'eyeContact' | 'posture';

const metricDetails: Record<MetricKey, { label: string; icon: string; unit: string; practice: string; instruction: string; target: string; color: string; bar: string }> = {
  pace: { label: 'Tốc độ nói', icon: 'speed', unit: 'từ/phút', practice: 'Luyện nhịp nói 1 phút', instruction: 'Trình bày một ý trong 60 giây, giữ nhịp 115–135 từ/phút và ngắt câu rõ ràng.', target: 'Mục tiêu 115–135 từ/phút', color: 'text-blue-700', bar: 'bg-blue-600' },
  fillers: { label: 'Từ đệm', icon: 'format_quote', unit: 'lần', practice: 'Nói rõ ý, bỏ từ đệm', instruction: 'Nói 5 câu ngắn. Khi cần nghĩ, dừng một nhịp thay vì dùng “à”, “ừm” hoặc “kiểu như”.', target: 'Càng ít càng tốt', color: 'text-amber-700', bar: 'bg-amber-500' },
  eyeContact: { label: 'Giao tiếp mắt', icon: 'visibility', unit: '%', practice: 'Giao tiếp với camera', instruction: 'Nhìn vào camera khi nói ý chính; chỉ liếc slide khi cần chuyển nội dung.', target: 'Mục tiêu từ 60%', color: 'text-violet-700', bar: 'bg-violet-600' },
  posture: { label: 'Tư thế', icon: 'accessibility_new', unit: '/100', practice: 'Ổn định tư thế trình bày', instruction: 'Đặt camera ngang tầm mắt, giữ vai cân bằng và đứng hoặc ngồi vững trong 1 phút.', target: 'Mục tiêu từ 70/100', color: 'text-emerald-700', bar: 'bg-emerald-600' },
};

function getMetrics(review: PresentationReview) {
  return [
    { key: 'pace' as const, value: review.wordsPerMinute, display: `${review.wordsPerMinute} từ/phút`, bar: Math.min(100, (review.wordsPerMinute / 180) * 100), weakness: review.wordsPerMinute === 0 ? 1 : review.wordsPerMinute < 115 ? (115 - review.wordsPerMinute) / 115 : review.wordsPerMinute > 135 ? (review.wordsPerMinute - 135) / 135 : 0 },
    { key: 'fillers' as const, value: review.fillers, display: `${review.fillers} lần`, bar: Math.min(100, review.fillers * 10), weakness: Math.min(1, review.fillers / 10) },
    { key: 'eyeContact' as const, value: review.eyeContact, display: `${review.eyeContact}%`, bar: Math.max(0, Math.min(100, review.eyeContact)), weakness: Math.max(0, (60 - review.eyeContact) / 60) },
    { key: 'posture' as const, value: review.posture, display: `${review.posture}/100`, bar: Math.max(0, Math.min(100, review.posture)), weakness: Math.max(0, (70 - review.posture) / 70) },
  ];
}

export function PresentationReviewPage() {
  const location = useLocation();
  const routeState = location.state as {
    presentationReview?: PresentationReview;
    isHistoricalReview?: boolean;
  } | null;
  const presentationReview = routeState?.presentationReview;
  const savedReviewRef = useRef<PresentationReview | null>(null);

  useEffect(() => {
    if (presentationReview && !routeState?.isHistoricalReview && savedReviewRef.current !== presentationReview) {
      savedReviewRef.current = presentationReview;
      savePresentationHistory(presentationReview);
    }
  }, [presentationReview, routeState?.isHistoricalReview]);

  const metrics = presentationReview ? getMetrics(presentationReview) : [];
  const practicePriorities = [...metrics].sort((first, second) => second.weakness - first.weakness).slice(0, 3);

  return (
    <StudentPageLayout active="/practice/setup" title="AI chấm bài thuyết trình">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-50" />
          <Link
            to="/practice/setup"
            aria-label="Quay lại trang chuẩn bị thuyết trình"
            className="relative mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Icon name="arrow_back" className="text-xl" />
          </Link>
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Báo cáo sau buổi luyện</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#18345d] sm:text-3xl">Bài trình bày của bạn</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Xem lại những gì đang làm tốt, chọn một kỹ năng cần tập trung và bắt đầu bằng bài luyện ngắn.</p>
            </div>
            {presentationReview && <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon name="timer" className="text-xl" /></span>
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Thời lượng</p><p className="text-lg font-extrabold tabular-nums text-slate-800">{presentationReview.duration}</p></div>
            </div>}
          </div>
          {presentationReview && <p className="relative mt-5 truncate border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">Tài liệu: {presentationReview.fileName}</p>}
        </section>

        {presentationReview && <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="metrics-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="metrics-title" className="text-lg font-extrabold text-[#18345d]">Bản đồ kỹ năng</h2><p className="mt-1 text-xs text-slate-500">Các chỉ số ghi nhận trong phiên vừa rồi</p></div>
              <span className="text-[11px] font-medium text-slate-500">Tốc độ nói hiển thị trên thang 0–180</span>
            </div>
            <div className="mt-6 space-y-5">
              {metrics.map((metric) => {
                const detail = metricDetails[metric.key];
                return <div key={metric.key} className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)_100px] sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2"><Icon name={detail.icon} className={`text-lg ${detail.color}`} /><span className="text-sm font-semibold text-slate-700">{detail.label}</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${detail.bar} transition-[width] duration-500`} style={{ width: `${metric.bar}%` }} /></div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-sm font-extrabold tabular-nums text-slate-800">{metric.display}</span><span className="text-[10px] text-slate-400 sm:hidden">{detail.target}</span></div>
                  <span className="hidden text-right text-[10px] text-slate-500 sm:col-start-2 sm:block">{detail.target}</span>
                </div>;
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Icon name="tips_and_updates" className="text-xl" /></span><div><h2 className="text-lg font-extrabold text-amber-950">Ưu tiên cải thiện</h2><p className="text-xs text-amber-800">Bắt đầu từ kỹ năng còn xa mục tiêu nhất.</p></div></div>
              <ol className="mt-5 space-y-3">
                {practicePriorities.map((metric, index) => <li key={metric.key} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-white p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">{index + 1}</span>
                  <div><p className="text-sm font-bold text-slate-800">{metricDetails[metric.key].label}: {metricDetails[metric.key].practice}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{metricDetails[metric.key].instruction}</p></div>
                </li>)}
              </ol>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
              <h2 className="text-lg font-extrabold text-[#18345d]">Bài luyện tiếp theo</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">Chọn một bài, luyện ngắn rồi quay lại trình bày để so sánh tiến bộ.</p>
              <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{metricDetails[practicePriorities[0].key].label} · 1 phút</span>
                <h3 className="mt-1 text-base font-extrabold text-slate-800">{metricDetails[practicePriorities[0].key].practice}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{metricDetails[practicePriorities[0].key].instruction}</p>
                <Link to="/practice/setup" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Luyện lại ngay <Icon name="arrow_forward" /></Link>
              </div>
            </div>
          </section>
        </>}

        <GradePanel presentationReview={presentationReview} />
      </div>
    </StudentPageLayout>
  );
}
