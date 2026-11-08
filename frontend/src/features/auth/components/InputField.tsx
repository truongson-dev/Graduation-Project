import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/core/utils/cn';

interface InputFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  autoComplete?: string;
  headerRightAction?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  error,
  helperText,
  required = false,
  autoComplete,
  headerRightAction,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label}
        </Label>
        {headerRightAction && <div>{headerRightAction}</div>}
      </div>

      <div className="relative">
        {icon && (
          <span
            className="auth-field-icon material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none text-slate-400"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <Input
          id={id}
          name={id}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(
            'auth-input h-10 w-full rounded-xl border text-sm transition bg-slate-50/40 text-slate-800 placeholder:text-slate-400',
            icon ? 'pl-10' : 'pl-3.5',
            isPasswordField ? 'pr-11' : 'pr-4',
            error
              ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20 bg-red-50/20'
              : 'border-slate-200 focus-visible:border-[#1a365d] focus-visible:ring-[#1a365d]/20 hover:border-slate-300'
          )}
        />

        {isPasswordField && (
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPassword(!showPassword)}
            className="auth-password-toggle absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            {showPassword ? (
              <Eye className="size-4.5" />
            ) : (
              <EyeOff className="size-4.5" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!error && helperText && (
        <p id={`${id}-helper`} className="mt-1 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
