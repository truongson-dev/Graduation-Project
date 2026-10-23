import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLogout, useMe } from '../lib/auth';
import { ChatPanel } from '../components/Coach/ChatPanel';
import { GradePanel } from '../components/Coach/GradePanel';

export const CoachPage: React.FC = () => {
  const navigate = useNavigate();
  const me = useMe();
  const logout = useLogout();
  const user = me.data;
  const [panel, setPanel] = useState<'chat' | 'grade'>('chat');

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/', { replace: true }),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      <header className="w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#002045] flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#002045] leading-none">
              SkillBridge
            </span>
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1">
              Phòng luyện kỹ năng
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-[#002045]">{user?.name}</span>
            <span className="text-[11px] text-slate-500">{user?.email}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div
          role="tablist"
          aria-label="Chọn chế độ luyện tập"
          className="mb-4 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'chat'}
            onClick={() => setPanel('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-sm transition cursor-pointer ${
              panel === 'chat'
                ? 'bg-white text-[#002045] font-bold shadow-sm'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            AI Mentor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'grade'}
            onClick={() => setPanel('grade')}
            className={`px-3.5 py-1.5 rounded-lg text-sm transition cursor-pointer ${
              panel === 'grade'
                ? 'bg-white text-[#002045] font-bold shadow-sm'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            Chấm bài
          </button>
        </div>

        {panel === 'chat' ? <ChatPanel /> : <GradePanel />}
      </main>

      <footer className="w-full py-3 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} SkillBridge EdTech. Học thật • Làm thật • Vươn xa.
      </footer>
    </div>
  );
};
