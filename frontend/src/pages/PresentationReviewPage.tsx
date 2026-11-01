import { useLocation } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { GradePanel, type PresentationReview } from '../components/Coach/GradePanel';

export function PresentationReviewPage() {
  const location = useLocation();
  const presentationReview = (location.state as {
    presentationReview?: PresentationReview;
  } | null)?.presentationReview;

  return (
    <StudentPageLayout active="/practice/setup" title="AI chấm bài thuyết trình">
      <section className="mb-5 rounded-[22px] bg-gradient-to-r from-[#123a79] to-sky-500 p-5 text-white sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-sky-100">PHÂN TÍCH SAU LUYỆN TẬP</p>
        <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Báo cáo đánh giá bài thuyết trình 4 trụ cột</h2>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-blue-50 sm:text-sm">
          AI phân tích tương quan giữa nội dung slide, bản chép lời và các chỉ số ngôn ngữ cơ thể của bạn.
        </p>
      </section>
      <div className="mx-auto max-w-4xl">
        <GradePanel presentationReview={presentationReview} />
      </div>
    </StudentPageLayout>
  );
}
