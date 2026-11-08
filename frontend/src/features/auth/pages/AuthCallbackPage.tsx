import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { consumeGoogleCallbackCode, consumeGoogleCallbackError, getApiError, useSocialExchange } from '../api/auth';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const exchange = useSocialExchange();
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;

    const callbackError = consumeGoogleCallbackError();
    if (callbackError) {
      setError(callbackError);
      return;
    }

    const code = consumeGoogleCallbackCode();

    if (!code) {
      setError('Không tìm thấy mã đăng nhập Google trong liên kết trả về.');
      return;
    }

    exchangeStarted.current = true;

    exchange
      .mutateAsync(code)
      .then(() => {
        navigate('/home', { replace: true });
      })
      .catch((err) => {
        setError(getApiError(err).message);
      });
  }, [exchange, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/70 p-8 text-center">
        {error ? (
          <>
            <span className="material-symbols-outlined text-red-500 text-[40px]">error</span>
            <h1 className="text-lg font-bold text-[#002045] mt-2">Đăng nhập Google thất bại</h1>
            <p className="text-sm text-slate-600 mt-2">{error}</p>
            <Link
              to="/"
              className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-[#002045] text-white text-sm font-semibold"
            >
              Về trang đăng nhập
            </Link>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[40px] text-[#1a365d] animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-slate-600 mt-3">Đang hoàn tất đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
};
