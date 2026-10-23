import React, { useState } from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon: string;
  error?: string;
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
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label}
        </label>
        {headerRightAction && <div>{headerRightAction}</div>}
      </div>

      <div className="relative">
        <span
          className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none"
          aria-hidden="true"
        >
          {icon}
        </span>

        <input
          id={id}
          name={id}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full pl-10 ${
            isPasswordField ? 'pr-11' : 'pr-4'
          } py-2.5 rounded-xl border text-sm transition bg-slate-50/40 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20'
              : 'border-slate-200 focus:border-[#1a365d] focus:ring-[#1a365d]/20 hover:border-slate-300'
          }`}
        />

        {isPasswordField && (
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? 'visibility' : 'visibility_off'}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
