import { useState, type FC } from 'react';
import { Navigate } from 'react-router';
import { Header } from '../components/Common/Header';
import { BrandFeaturePanel } from '../components/Auth/BrandFeaturePanel';
import { AuthForm } from '../components/Auth/AuthForm';
import { HelpModal } from '../components/HelpModal';
import { useMe } from '../lib/auth';

export const AuthPage: FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [modalType, setModalType] = useState<'help' | 'forgot_password'>('help');
  const me = useMe();

  if (me.data) {
    return <Navigate to="/coach" replace />;
  }

  const handleOpenHelp = () => {
    setModalType('help');
    setIsHelpOpen(true);
  };

  const handleForgotPassword = () => {
    setModalType('forgot_password');
    setIsHelpOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc] text-slate-800 antialiased selection:bg-blue-100 selection:text-[#002045]">
      <Header onOpenHelp={handleOpenHelp} />

      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl border border-slate-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <BrandFeaturePanel />
          <AuthForm onForgotPassword={handleForgotPassword} />
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} SkillBridge EdTech. Học thật • Làm thật • Vươn xa.
      </footer>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} type={modalType} />
    </div>
  );
};
