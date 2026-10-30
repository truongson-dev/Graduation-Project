import { useState } from 'react';
import { getApiError } from '../../lib/api';
import { useGradeAnswer, type GradeFeedback } from '../../lib/ai';

interface PresentationReview {
  transcript: string;
  duration: string;
  wordsPerMinute: number;
  fillers: number;
  eyeContact: number;
  posture: number;
  confidence: number | null;
  fileName: string;
}

interface GradePanelProps {
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

/**
 * Practice screen: send one learner answer through POST /v1/ai/feedback and show
 * the structured grade returned by the AnswerGrader agent.
 */
export const GradePanel: React.FC<GradePanelProps> = ({ presentationReview }) => {
  const grade = useGradeAnswer();

  const [skill, setSkill] = useState(presentationReview ? 'Thuyết trình' : SKILLS[0]);
  const [question, setQuestion] = useState(presentationReview ? `Hãy đánh giá phần thuyết trình “${presentationReview.fileName}” về nội dung, cách diễn đạt và khả năng trình bày.` : '');
  const [answer, setAnswer] = useState(presentationReview?.transcript ?? '');
  const [context, setContext] = useState(presentationReview ? [
    `Thời lượng: ${presentationReview.duration}.`,
    `Tốc độ nói: ${presentationReview.wordsPerMinute} từ/phút.`,
    `Từ đệm nhận diện được: ${presentationReview.fillers}.`,
    `Eye contact ước lượng: ${presentationReview.eyeContact}%.`,
    `Tư thế ước lượng: ${presentationReview.posture}/100.`,
    `Điểm thể hiện tự tin ước lượng: ${presentationReview.confidence ?? 'chưa đủ dữ liệu'}.`,
  ].join(' ') : '');
  const [feedback, setFeedback] = useState<GradeFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = question.trim() !== '' && answer.trim() !== '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ready || grade.isPending) return;

    setError(null);
    setFeedback(null);

    try {
      const result = await grade.mutateAsync({
        skill,
        question: question.trim(),
        answer: answer.trim(),
        context: context.trim() === '' ? null : context.trim(),
      });

      setFeedback(result);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  };

  const reset = () => {
    setQuestion('');
    setAnswer('');
    setContext('');
    setFeedback(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-[#002045]">Chấm bài luyện tập</h2>
        <p className="text-xs text-slate-500">
          Dán câu hỏi tình huống và câu trả lời của bạn để nhận điểm kèm góp ý.
        </p>
      </div>

      {presentationReview && (
        <div className="mx-5 mt-4 rounded-xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-xs leading-relaxed text-teal-900">
          Đã điền bản chép lời và chỉ số từ phiên luyện tập. Hãy xem lại nội dung rồi nhấn <strong>Chấm điểm</strong> để gửi yêu cầu đến AI.
          {!presentationReview.transcript && ' Trình duyệt không tạo được bản chép lời; hãy nhập nội dung bạn đã trình bày vào ô bên dưới.'}
        </div>
      )}

      <form onSubmit={submit} className="p-5 space-y-4" noValidate>
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

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition cursor-pointer"
          >
            Xoá nội dung
          </button>
          <button
            type="submit"
            disabled={!ready || grade.isPending}
            className="px-4 py-2 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white text-sm font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {grade.isPending ? 'Đang chấm...' : 'Chấm điểm'}
          </button>
        </div>
      </form>

      {feedback && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-bold ${scoreTone(feedback.score)}`}
            >
              {feedback.score}
            </span>
            <div>
              <p className="text-sm font-bold text-[#002045]">
                Điểm: {feedback.score}/100
              </p>
              <p className="text-xs text-slate-500">Nhận xét của giảng viên AI</p>
            </div>
          </div>

          <p className="text-sm text-slate-700 whitespace-pre-wrap">{feedback.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Điểm mạnh
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-700 list-disc list-inside">
                {feedback.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Cần cải thiện
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-700 list-disc list-inside">
                {feedback.improvements.map((item) => (
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
