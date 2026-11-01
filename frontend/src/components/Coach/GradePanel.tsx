import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { getApiError } from '../../lib/api';
import {
  useGradeAnswer,
  useEvaluatePresentation,
  type GradeFeedback,
  type PresentationEvaluationFeedback,
} from '../../lib/ai';

export interface PresentationReview {
  slideContent?: string;
  transcript: string;
  duration: string;
  wordsPerMinute: number;
  fillers: number;
  eyeContact: number;
  posture: number;
  confidence: number | null;
  fileName: string;
  language?: 'vi' | 'en';
}

export interface GradePanelProps {
  presentationReview?: PresentationReview;
}

const SKILLS = [
  'Giao tiếp',
  'Thuyết trình',
  'Làm việc nhóm',
  'Quản lý thời gian',
  'Tư duy phản biện',
  'Giải quyết vấn đề',
];

const SCORE_TONE = {
  high: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  mid: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-red-50 border-red-200 text-red-700',
} as const;

function scoreTone(score: number): string {
  if (score >= 80) return SCORE_TONE.high;
  if (score >= 60) return SCORE_TONE.mid;

  return SCORE_TONE.low;
}

function scoreBorderColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

/**
 * Renders either the Presentation 4-Pillars AI Evaluation Dashboard (when presentationReview is provided)
 * or the standard Situation / Question Answer Grader.
 */
export const GradePanel: React.FC<GradePanelProps> = ({ presentationReview }) => {
  // --- Presentation 4-Pillar Evaluation Mode ---
  const evaluatePresentation = useEvaluatePresentation();
  const [evalFeedback, setEvalFeedback] = useState<PresentationEvaluationFeedback | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const evaluatedRef = useRef(false);

  const performEvaluation = async () => {
    if (!presentationReview) return;
    setEvalError(null);

    try {
      const result = await evaluatePresentation.mutateAsync({
        slide_content: presentationReview.slideContent || '[Chưa có nội dung slide]',
        transcript: presentationReview.transcript.trim() || '[Người học chưa nói trong phiên]',
        duration: presentationReview.duration || '00:00',
        words_per_minute: presentationReview.wordsPerMinute ?? 0,
        fillers_count: presentationReview.fillers ?? 0,
        eye_contact_percent: presentationReview.eyeContact ?? 0,
        posture_score: presentationReview.posture ?? 0,
        language: presentationReview.language || 'vi',
      });
      setEvalFeedback(result);
    } catch (err) {
      setEvalError(getApiError(err).message);
    }
  };

  useEffect(() => {
    if (presentationReview && !evaluatedRef.current) {
      evaluatedRef.current = true;
      void performEvaluation();
    }
  }, [presentationReview]);

  // --- Classic Question Answer Grader Mode ---
  const gradeAnswer = useGradeAnswer();
  const [skill, setSkill] = useState(SKILLS[0]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [context, setContext] = useState('');
  const [classicFeedback, setClassicFeedback] = useState<GradeFeedback | null>(null);
  const [classicError, setClassicError] = useState<string | null>(null);

  const ready = question.trim() !== '' && answer.trim() !== '';

  const submitClassic = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || gradeAnswer.isPending) return;

    setClassicError(null);
    setClassicFeedback(null);

    try {
      const result = await gradeAnswer.mutateAsync({
        skill,
        question: question.trim(),
        answer: answer.trim(),
        context: context.trim() === '' ? null : context.trim(),
      });
      setClassicFeedback(result);
    } catch (submitError) {
      setClassicError(getApiError(submitError).message);
    }
  };

  const resetClassic = () => {
    setQuestion('');
    setAnswer('');
    setContext('');
    setClassicFeedback(null);
    setClassicError(null);
  };

  // ----------------------------------------------------
  // Render Presentation Review Mode
  // ----------------------------------------------------
  if (presentationReview) {
    return (
      <div className="space-y-6">
        {/* Metric Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 p-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Icon name="timer" className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thời lượng</p>
              <p className="text-base font-bold text-slate-800">{presentationReview.duration}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Icon name="speed" className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tốc độ nói</p>
              <p className="text-base font-bold text-slate-800">{presentationReview.wordsPerMinute} <span className="text-xs font-normal text-slate-500">từ/p</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Icon name="format_quote" className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Từ đệm</p>
              <p className="text-base font-bold text-slate-800">{presentationReview.fillers} <span className="text-xs font-normal text-slate-500">từ</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Icon name="visibility" className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Giao tiếp mắt</p>
              <p className="text-base font-bold text-slate-800">{presentationReview.eyeContact}%</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {evaluatePresentation.isPending && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700 animate-pulse">
              <Icon name="auto_awesome" className="text-3xl animate-spin" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800">AI đang phân tích bài thuyết trình của bạn…</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Đang so sánh đối chiếu giữa nội dung slide, bản chép lời nói, nhịp độ và ngôn ngữ cơ thể theo bộ tiêu chí 4 trụ cột.
            </p>
          </div>
        )}

        {/* Error State */}
        {evalError && !evaluatePresentation.isPending && (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-rose-600 text-2xl shrink-0">error</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-rose-900">Không thể tải đánh giá từ AI</h4>
                <p className="mt-1 text-xs text-rose-700">{evalError}</p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void performEvaluation()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-800 cursor-pointer"
                  >
                    <Icon name="refresh" className="text-base" /> Thử phân tích lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main 4-Pillar Evaluation Report */}
        {evalFeedback && !evaluatePresentation.isPending && (
          <div className="space-y-6">
            {/* Overall Score & Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative flex flex-col items-center shrink-0">
                  <div
                    className="w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-inner"
                    style={{ borderColor: scoreBorderColor(evalFeedback.overall_score) }}
                  >
                    <span className="text-3xl font-extrabold text-slate-800">{evalFeedback.overall_score}</span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">/ 100</span>
                  </div>
                  <span
                    className={`mt-2.5 px-3 py-0.5 rounded-full text-xs font-bold ${scoreTone(evalFeedback.overall_score)}`}
                  >
                    {evalFeedback.overall_score >= 80 ? 'Xuất sắc' : evalFeedback.overall_score >= 60 ? 'Đạt yêu cầu' : 'Cần cải thiện'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#002045]">
                      {evalFeedback.overall_score >= 80
                        ? 'Phong thái tự tin & Nội dung thuyết phục'
                        : evalFeedback.overall_score >= 60
                        ? 'Nắm vững nội dung, cần hoàn thiện diễn đạt'
                        : 'Cần chú trọng diễn giải và kết nối người nghe'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void performEvaluation()}
                      aria-label="Phân tích lại"
                      title="Yêu cầu AI đánh giá lại"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <Icon name="refresh" className="text-base" /> Phân tích lại
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Bài thuyết trình được AI đánh giá toàn diện dựa trên 4 khía cạnh: tính chuẩn xác so với slide, chất lượng mở rộng ý tưởng, nhịp điệu phát âm và biểu cảm tương tác.
                  </p>

                  {/* Reading vs Elaboration Banner */}
                  <div className="mt-4">
                    {evalFeedback.is_reading_slides ? (
                      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-amber-900 shadow-xs flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">warning</span>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-amber-900">Cảnh báo: Có xu hướng đọc lại chữ trên slide</h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                            AI nhận thấy phần nói của bạn trùng lặp trực tiếp nhiều đoạn văn trên slide. Để bài nói lôi cuốn, hãy chỉ ghi các từ khóa chính lên slide và dùng lời nói để kể câu chuyện, phân tích ví dụ.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-emerald-900 shadow-xs flex items-start gap-3">
                        <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">verified</span>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-emerald-900">Diễn giải tự nhiên, không phụ thuộc slide</h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-emerald-800">
                            Rất tốt! Bạn làm chủ được mạch trình bày, sử dụng slide như một điểm tựa trực quan và mở rộng ý tưởng bằng ngôn từ riêng.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Pillars Grid */}
            <div>
              <h4 className="text-sm font-bold text-[#002045] mb-3 flex items-center gap-2">
                <Icon name="grid_view" className="text-blue-700" /> Đánh giá chi tiết 4 trụ cột
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1: Slide Coverage */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <Icon name="slideshow" className="text-lg" />
                      </span>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Bao quát Slide</h5>
                    </div>
                    <span className="text-sm font-extrabold text-teal-700">{evalFeedback.slide_coverage_score}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, evalFeedback.slide_coverage_score))}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    Mức độ truyền tải và bao quát các ý chính, số liệu trên slide: đạt {evalFeedback.slide_coverage_score}% nội dung dự kiến.
                  </p>
                </div>

                {/* Pillar 2: Elaboration Quality */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <Icon name="psychology" className="text-lg" />
                    </span>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Diễn giải &amp; Mở rộng</h5>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback.elaboration_quality}
                  </p>
                </div>

                {/* Pillar 3: Voice Feedback */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <Icon name="mic" className="text-lg" />
                      </span>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Giọng nói &amp; Nhịp điệu</h5>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {presentationReview.wordsPerMinute} wpm
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {presentationReview.fillers} đệm
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback.voice_feedback}
                  </p>
                </div>

                {/* Pillar 4: Body Language Feedback */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                        <Icon name="accessibility_new" className="text-lg" />
                      </span>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">4. Ngôn ngữ cơ thể</h5>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                        Mắt {presentationReview.eyeContact}%
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Tư thế {presentationReview.posture}/100
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback.body_language_feedback}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs">
                <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <Icon name="check_circle" className="text-emerald-600 text-lg" /> Điểm mạnh nổi bật
                </h5>
                <ul className="mt-3 space-y-2 text-xs text-slate-700">
                  {evalFeedback.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-xs">
                <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                  <Icon name="trending_up" className="text-amber-600 text-lg" /> Điểm cần rèn luyện thêm
                </h5>
                <ul className="mt-3 space-y-2 text-xs text-slate-700">
                  {evalFeedback.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actionable Tips */}
            {evalFeedback.actionable_tips.length > 0 && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 shadow-xs">
                <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-900">
                  <Icon name="tips_and_updates" className="text-sky-700 text-lg" /> Mẹo thực hành cho lần nói tới
                </h5>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evalFeedback.actionable_tips.map((tip, idx) => (
                    <div key={idx} className="rounded-xl border border-sky-200/70 bg-white p-3 text-xs text-slate-700 leading-relaxed shadow-xs flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-800">
                        {idx + 1}
                      </span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Transcript & Slide Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Icon name="description" className="text-blue-700 text-base" /> Xem nội dung bản chép lời &amp; slide
                </span>
                <Icon name={showDetails ? 'expand_less' : 'expand_more'} className="text-lg text-slate-400" />
              </button>

              {showDetails && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bản chép lời nói (Transcript)</h6>
                    <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed border border-slate-200">
                      {presentationReview.transcript || '[Không ghi nhận được lời nói]'}
                    </div>
                  </div>

                  {presentationReview.slideContent && (
                    <div>
                      <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nội dung văn bản trích xuất từ Slide</h6>
                      <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap border border-slate-200">
                        {presentationReview.slideContent}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Link
                to="/practice/setup"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Icon name="arrow_back" className="text-base" /> Luyện tập phiên mới
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // Render Situation/Question Answer Grader Form (Classic)
  // ----------------------------------------------------
  return (
    <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-[#002045]">Chấm bài luyện tập tình huống</h2>
        <p className="text-xs text-slate-500">
          Dán câu hỏi tình huống và câu trả lời của bạn để nhận điểm kèm góp ý.
        </p>
      </div>

      <form onSubmit={submitClassic} className="p-5 space-y-4" noValidate>
        <div>
          <label
            htmlFor="grade-skill"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Kỹ năng
          </label>
          <select
            id="grade-skill"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d] cursor-pointer"
          >
            {SKILLS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="grade-question"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Câu hỏi / tình huống
          </label>
          <textarea
            id="grade-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, 2000))}
            rows={3}
            placeholder="Ví dụ: Nhóm bạn có một thành viên không chịu đóng góp. Bạn xử lý thế nào?"
            className="w-full resize-y px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/40 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
          />
        </div>

        <div>
          <label
            htmlFor="grade-answer"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Câu trả lời của bạn
          </label>
          <textarea
            id="grade-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value.slice(0, 5000))}
            rows={6}
            placeholder="Viết câu trả lời của bạn bằng tiếng Việt..."
            className="w-full resize-y px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/40 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">{answer.length}/5000</p>
        </div>

        <div>
          <label
            htmlFor="grade-context"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Bối cảnh thêm (không bắt buộc)
          </label>
          <textarea
            id="grade-context"
            value={context}
            onChange={(event) => setContext(event.target.value.slice(0, 2000))}
            rows={2}
            placeholder="Ví dụ: sinh viên năm 3, đang luyện phỏng vấn thực tập"
            className="w-full resize-y px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/40 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
          />
        </div>

        {classicError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
            <span>{classicError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetClassic}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition cursor-pointer"
          >
            Xoá nội dung
          </button>
          <button
            type="submit"
            disabled={!ready || gradeAnswer.isPending}
            className="px-4 py-2 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white text-sm font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gradeAnswer.isPending ? 'Đang chấm...' : 'Chấm điểm'}
          </button>
        </div>
      </form>

      {classicFeedback && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-bold ${scoreTone(classicFeedback.score)}`}
            >
              {classicFeedback.score}
            </span>
            <div>
              <p className="text-sm font-bold text-[#002045]">
                Điểm: {classicFeedback.score}/100
              </p>
              <p className="text-xs text-slate-500">Nhận xét của giảng viên AI</p>
            </div>
          </div>

          <p className="text-sm text-slate-700 whitespace-pre-wrap">{classicFeedback.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Điểm mạnh
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-700 list-disc list-inside">
                {classicFeedback.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Cần cải thiện
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-700 list-disc list-inside">
                {classicFeedback.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
