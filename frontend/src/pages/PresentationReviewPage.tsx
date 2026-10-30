import { useLocation } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { GradePanel } from '../components/Coach/GradePanel';

export function PresentationReviewPage() {
  const location = useLocation();
  const presentationReview = (location.state as {
    presentationReview?: {
      transcript: string;
      duration: string;
      wordsPerMinute: number;
      fillers: number;
      eyeContact: number;
      posture: number;
      confidence: number | null;
      fileName: string;
    };
  } | null)?.presentationReview;

  return <StudentPageLayout active="/practice/setup" title="AI chấm bài thuyết trình">
    <section className="mb-5 rounded-[22px] bg-gradient-to-r from-[#123a79] to-sky-500 p-5 text-white sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-sky-100">PHÂN TÍCH SAU LUYỆN TẬP</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Nhận góp ý để lần sau tự tin hơn</h2><p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-blue-50 sm:text-sm">AI đánh giá nội dung, cách diễn đạt và các chỉ số trình bày của bạn.</p></section>
    <div className="mx-auto max-w-4xl"><GradePanel presentationReview={presentationReview} /></div>
  </StudentPageLayout>;
}
