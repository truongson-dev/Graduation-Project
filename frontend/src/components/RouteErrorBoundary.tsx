import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Đã xảy ra lỗi không mong muốn';
  let message = 'Hệ thống đã ghi nhận lỗi. Vui lòng thử tải lại trang hoặc quay về trang chủ.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = '404 - Không tìm thấy trang';
      message = 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.';
    } else {
      title = `${error.status} - ${error.statusText || 'Lỗi điều hướng'}`;
      message = typeof error.data === 'string' ? error.data : error.data?.message || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-white p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto rounded-xl border-slate-200"
          >
            <RefreshCw className="size-4 mr-2" />
            Tải lại trang
          </Button>
          <Button
            onClick={() => navigate('/home')}
            className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="size-4 mr-2" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}
