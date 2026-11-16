import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import { markLearningCompletedToday } from '../api/daily-learning';

type Question = { type: 'choice' | 'true_false' | 'fill_blank'; prompt: string; options?: string[]; answer: number | string; explanation: string };

const questions: Question[] = [
  { type: 'choice', prompt: 'Đồng nghiệp nói: “Việc này cần làm gấp.” Bạn nên hỏi gì để làm rõ yêu cầu?', options: ['Gấp thật không?', 'Khi nào bạn cần hoàn thành?', 'Tôi sẽ làm khi có thể.', 'Việc nào cũng gấp cả.'], answer: 1, explanation: 'Hỏi về thời hạn giúp biến yêu cầu mơ hồ thành một mốc thời gian cụ thể.' },
  { type: 'choice', prompt: 'Câu hỏi nào giúp làm rõ tiêu chí hoàn thành công việc?', options: ['Kết quả cuối cùng cần trông như thế nào?', 'Việc này có khó không?', 'Em làm xong là được chứ?', 'Ai cũng làm như vậy đúng không?'], answer: 0, explanation: 'Câu hỏi làm rõ giúp hai bên thống nhất thế nào là hoàn thành.' },
  { type: 'choice', prompt: 'Sau khi người nói trả lời chung chung, bạn nên làm gì?', options: ['Đổi chủ đề.', 'Đặt câu hỏi đào sâu hoặc yêu cầu ví dụ cụ thể.', 'Kết luận thay họ.', 'Không hỏi thêm.'], answer: 1, explanation: 'Câu hỏi đào sâu đưa câu trả lời từ khái quát thành thông tin có thể kiểm chứng.' },
  { type: 'true_false', prompt: 'Câu hỏi mở tạo không gian để người đối diện suy nghĩ và chia sẻ nhiều hơn.', options: ['Đúng', 'Sai'], answer: 0, explanation: 'Đúng. Câu hỏi mở không giới hạn câu trả lời trong “có” hoặc “không”.' },
  { type: 'true_false', prompt: 'Câu hỏi đóng luôn là lựa chọn tốt nhất khi cần khám phá nguyên nhân.', options: ['Đúng', 'Sai'], answer: 1, explanation: 'Sai. Khi khám phá nguyên nhân, nên bắt đầu bằng câu hỏi mở.' },
  { type: 'fill_blank', prompt: 'Câu hỏi ______ giúp loại bỏ sự mơ hồ về yêu cầu, tiêu chí hoặc thời hạn.', answer: 'làm rõ', explanation: 'Đáp án: làm rõ.' },
  { type: 'fill_blank', prompt: 'Kỹ thuật hỏi “Tại sao?” nhiều lần để tìm nguyên nhân gốc được gọi là ______ Whys.', answer: '5', explanation: 'Đáp án: 5 Whys.' },
  { type: 'choice', prompt: 'Khi nhóm chỉ đưa ra hai phương án đối lập, câu hỏi nào giúp tư duy rộng hơn?', options: ['Phương án nào nhanh hơn?', 'Lựa chọn thứ ba có thể là gì?', 'Ai chịu trách nhiệm?', 'Có cần làm ngay không?'], answer: 1, explanation: 'Tìm lựa chọn thứ ba giúp nhóm thoát khỏi tư duy chỉ có hai khả năng.' },
  { type: 'choice', prompt: 'Muốn hỏi AI và nhận kết quả rõ ràng, prompt nên có gì?', options: ['Viết giúp tôi đi.', 'Hãy làm thật hay.', 'Mục tiêu, bối cảnh, đầu ra và giới hạn.', 'Bạn biết mọi thứ đúng không?'], answer: 2, explanation: 'Mục tiêu, bối cảnh, đầu ra và giới hạn giúp AI hiểu đúng nhiệm vụ.' },
  { type: 'true_false', prompt: 'Một câu hỏi tốt cần có mục đích rõ ràng và phù hợp với người được hỏi.', options: ['Đúng', 'Sai'], answer: 0, explanation: 'Đúng. Mục đích và bối cảnh quyết định cách chọn câu hỏi.' },
];

export const LessonPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topic = params.get('topic') || 'Nghệ thuật đặt câu hỏi';
  const lesson = params.get('lesson') || 'Câu hỏi mở và câu hỏi đóng';
  const ordered = useMemo(() => [...questions].sort(() => Math.random() - 0.5), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const question = ordered[index];
  const correct = question.type === 'fill_blank' ? text.trim().toLocaleLowerCase() === String(question.answer).toLocaleLowerCase() : selected === question.answer;

  const submit = () => { if ((question.type === 'fill_blank' ? !text.trim() : selected === null) || submitted) return; setSubmitted(true); };
  const next = () => {
    if (index >= ordered.length - 1) {
      markLearningCompletedToday();
      navigate('/learning-path');
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setText('');
    setSubmitted(false);
  };

  return <main className="min-h-screen bg-white text-slate-800">
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-7 sm:px-10">
      <header className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/learning-path')} aria-label="Thoát bài học" className="text-3xl leading-none text-slate-400 hover:text-slate-700">×</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#1cb0f6] transition-all" style={{ width: `${((index + (submitted ? 1 : 0)) / ordered.length) * 100}%` }} />
        </div>
        <span className="text-lg font-bold text-[#1cb0f6]">💙∞</span>
      </header>
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col pt-12">
        <p className="text-center text-xs font-bold uppercase tracking-[.16em] text-[#1cb0f6]">{topic}</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold text-slate-800">{lesson}</h1>
        <p className="mt-12 text-center text-lg font-extrabold leading-relaxed">{question.prompt}</p>
        {question.type === 'fill_blank' ? (
          <input value={text} onChange={(event) => setText(event.target.value)} disabled={submitted} placeholder="Nhập đáp án" className="mx-auto mt-8 w-full max-w-md rounded-xl border-2 border-slate-200 px-4 py-4 text-center text-lg font-semibold outline-none focus:border-[#1cb0f6]" />
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(question.options || []).map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                disabled={submitted}
                onClick={() => setSelected(optionIndex)}
                className={`rounded-2xl border-2 px-4 py-4 text-left font-semibold transition ${
                  submitted && optionIndex === question.answer
                    ? 'border-[#1cb0f6] bg-sky-50 text-sky-900 shadow-sm'
                    : submitted && selected === optionIndex
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : selected === optionIndex
                    ? 'border-[#1cb0f6] bg-sky-50/70 text-sky-900 ring-2 ring-sky-200'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/40'
                }`}
              >
                <span className="mr-2 text-slate-400 font-bold">{String.fromCharCode(65 + optionIndex)}.</span>{option}
              </button>
            ))}
          </div>
        )}
      </section>
      {submitted ? (
        <div className={`${correct ? 'bg-sky-50 border-sky-200' : 'bg-amber-50 border-amber-200'} -mx-5 mt-8 border-t px-5 py-5 sm:-mx-10 sm:px-10`}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div>
              <p className={`text-lg font-extrabold ${correct ? 'text-[#0284c7]' : 'text-amber-700'}`}>
                {correct ? '✓ Làm tốt lắm! +10 KN' : 'Chưa chính xác, hãy thử lại!'}
              </p>
              <p className="mt-1 text-sm text-slate-600">{question.explanation}</p>
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-2xl bg-[#1cb0f6] px-6 py-3 font-extrabold text-white shadow-[0_4px_0_#1899d6] transition hover:bg-[#1899d6] active:translate-y-1 active:shadow-none"
            >
              {index === ordered.length - 1 ? 'Hoàn thành' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      ) : (
        <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
          <button type="button" onClick={next} className="rounded-2xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-400 hover:bg-slate-50">BỎ QUA</button>
          <span className="text-sm font-semibold text-slate-400">⌨ SỬ DỤNG BÀN PHÍM</span>
          <button
            type="button"
            onClick={submit}
            disabled={question.type === 'fill_blank' ? !text.trim() : selected === null}
            className="rounded-2xl bg-[#1cb0f6] px-7 py-3 font-extrabold text-white shadow-[0_4px_0_#1899d6] transition hover:bg-[#1899d6] active:translate-y-1 active:shadow-none disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
          >
            KIỂM TRA
          </button>
        </footer>
      )}
    </div>
  </main>;
};
