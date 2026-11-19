import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải trang..."
      aria-busy="true"
      className="flex flex-col gap-6 w-full animate-fadeIn select-none"
    >
      <span className="sr-only">Đang tải nội dung trang...</span>

      {/* 1. Header / Breadcrumb Skeleton (shadcn pattern) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48 sm:w-64 rounded-xl" />
          <Skeleton className="h-4 w-36 sm:w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 sm:w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Hero Banner Card Skeleton (shadcn Card) */}
      <Card className="rounded-[24px] border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col justify-between gap-4 min-h-[160px] sm:min-h-[190px]">
          <div className="flex flex-col gap-3 max-w-xl">
            <Skeleton className="h-8 w-4/5 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </Card>

      {/* 3. Main Course / Learning Cards Grid Skeleton (shadcn Card Grid) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            className="rounded-[22px] border-slate-200/80 bg-white p-5 shadow-xs"
          >
            <CardContent className="p-0 flex flex-col gap-4 min-h-[175px]">
              <div className="flex items-center justify-between">
                <Skeleton className="size-11 rounded-2xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-3/5 rounded-md" />
              </div>
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Split Two-Column Layout Skeleton (Tasks & Streak) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,0.85fr)]">
        {/* Left Column: Tasks list (shadcn Card) */}
        <Card className="rounded-[22px] border-slate-200/80 bg-white p-5 shadow-xs">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-3">
            {[1, 2].map((task) => (
              <div
                key={task}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
              >
                <Skeleton className="size-10 rounded-xl shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right Column: Weekly Streak Card (shadcn Card) */}
        <Card className="rounded-[22px] border-slate-200/80 bg-white p-5 shadow-xs">
          <CardHeader className="p-0 pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-4">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <div className="grid grid-cols-7 gap-1.5 py-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-3 w-4 rounded-sm" />
                  <Skeleton className="size-8 rounded-full" />
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
