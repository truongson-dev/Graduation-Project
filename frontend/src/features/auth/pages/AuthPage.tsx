import { useState, type FC } from 'react';
import { Navigate } from 'react-router';
import { AuthForm } from '../components/AuthForm';
import { HelpModal } from '@/components/layout/HelpModal';
import { useMe } from '../api/auth';

export const AuthPage: FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const me = useMe();

  if (me.data) {
    return <Navigate to="/home" replace />;
  }

  const handleForgotPassword = () => {
    setIsHelpOpen(true);
  };

  return (
    <div className="auth-page min-h-screen flex flex-col text-slate-800 antialiased selection:bg-blue-100 selection:text-[#002045]">
      <main className="auth-main flex-1 flex items-center justify-center px-4">
        <div className="auth-card w-full">
          <AuthForm onForgotPassword={handleForgotPassword} />
        </div>
      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} type="forgot_password" />
    </div>
  );
};
