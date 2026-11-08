import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, KeyRound } from 'lucide-react';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

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
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-100 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 font-bold text-slate-800 text-lg">
            {type === 'help' ? (
              <HelpCircle className="size-5 text-[#1a365d]" />
            ) : (
              <KeyRound className="size-5 text-[#1a365d]" />
            )}
            <span>{type === 'help' ? title : 'Khôi phục mật khẩu'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 text-sm text-slate-600 leading-relaxed">
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

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
