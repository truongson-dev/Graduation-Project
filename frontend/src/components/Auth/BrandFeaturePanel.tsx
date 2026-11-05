import React from 'react';
import { AppIcon } from '../Common/AppIcon';

interface FeatureItem {
  id: string;
  icon: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  title: string;
  description: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'voice-slide-ai',
    icon: 'mic',
    iconBg: 'bg-cyan-400/30',
    iconBorder: 'border-cyan-200/40',
    iconColor: 'text-cyan-100',
    title: 'AI Chấm giọng nói & Slide tức thì',
    description: 'Phân tích âm lượng, từ đệm, độ tự tin và cấu trúc bài thuyết trình.',
  },
  {
    id: 'critical-thinking-arena',
    icon: 'psychology',
    iconBg: 'bg-amber-400/30',
    iconBorder: 'border-amber-200/40',
    iconColor: 'text-amber-100',
    title: 'Phòng đấu Tư duy phản biện',
    description: 'Tranh luận các tình huống công sở thực tế 1:1 cùng AI hoặc bạn bè.',
  },
  {
    id: 'industry-cert',
    icon: 'workspace_premium',
    iconBg: 'bg-emerald-400/30',
    iconBorder: 'border-emerald-200/40',
    iconColor: 'text-emerald-100',
    title: 'Chứng chỉ kỹ năng chuẩn doanh nghiệp',
    description: 'Chia sẻ link chứng chỉ xác thực lên CV và LinkedIn xin việc.',
  },
];

export const BrandFeaturePanel: React.FC = () => {
  return (
    <div className="lg:col-span-5 bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#0d9488] p-8 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
      {/* Background Subtle Shapes */}
      <div
        className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-cyan-300/25 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-teal-300/20 blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute right-10 bottom-1/3 w-32 h-32 rounded-full bg-blue-300/20 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug mb-3 text-white drop-shadow-sm">
          Làm chủ kỹ năng thực chiến cùng AI Mentor
        </h1>
        <p className="text-blue-100 text-sm leading-relaxed mb-8 font-normal">
          Rèn luyện thuyết trình, phản biện sắc sảo và tự tin bước vào kỳ thực tập và phỏng vấn công sở.
        </p>

        {/* Value Props List */}
        <div className="space-y-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md shadow-sm transition duration-200 hover:bg-white/20"
            >
              <div
                className={`w-9 h-9 rounded-xl ${feature.iconBg} border ${feature.iconBorder} flex items-center justify-center shrink-0 mt-0.5 ${feature.iconColor}`}
              >
                <AppIcon name={feature.icon} className="text-[20px]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">
                  {feature.title}
                </h4>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Perks Box */}
      <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-white text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm">
              K26
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shadow-sm">
              FTU
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shadow-sm">
              BK
            </div>
          </div>
          <div className="text-xs">
            <div className="font-bold text-white tracking-wide">45,000+ sinh viên</div>
            <div className="text-blue-100">đang rèn luyện mỗi ngày</div>
          </div>
        </div>
      </div>
    </div>
  );
};
