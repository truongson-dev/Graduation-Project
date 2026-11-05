import { useEffect, useRef } from 'react';
import { ForgotPasswordForm } from './Auth/ForgotPasswordForm';
import { AppIcon } from './Common/AppIcon';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  type?: 'help' | 'forgot_password';
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  title = 'Trung tâm trợ giúp SkillBridge',
  type = 'help',
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={type === 'help' ? title : 'Khôi phục mật khẩu'}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 focus:outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AppIcon name={type === 'help' ? 'help_outline' : 'lock_reset'} className="text-[24px] text-[#1a365d]" />
            <h3 className="font-bold text-slate-800 text-lg">
              {type === 'help' ? title : 'Khôi phục mật khẩu'}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <AppIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="py-4 text-sm text-slate-600 leading-relaxed">
          {type === 'help' ? (
            <div className="space-y-3">
              <p>
                Chào mừng bạn đến với <strong>SkillBridge</strong>! Đội ngũ cố vấn và hỗ trợ học tập
                sẵn sàng hỗ trợ bạn 24/7:
              </p>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-xs space-y-1">
                <p>
                  Email hỗ trợ: <strong>support@skillbridge.edu.vn</strong>
                </p>
                <p>
                  Hotline sinh viên: <strong>1900 6868 (8:00 - 21:00)</strong>
                </p>
                <p>
                  Cộng đồng học viên: <strong>facebook.com/groups/skillbridge</strong>
                </p>
              </div>
            </div>
          ) : (
            <ForgotPasswordForm />
          )}
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold cursor-pointer transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
