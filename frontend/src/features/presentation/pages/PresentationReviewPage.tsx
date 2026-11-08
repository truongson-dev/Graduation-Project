import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { GradePanel, type PresentationReview } from '@/features/coach/components/GradePanel';
import type { PresentationEvaluationFeedback } from '@/features/coach/api/ai';
import { savePresentationHistory } from '../api/presentation-history';
import { usePresentationSession, getPresentationAudioUrl, useRetryPresentation } from '../api/presentation-session';
import { PresentationRadarChart } from '../components/PresentationRadarChart';
import { PresentationWaveformPlayer } from '../components/PresentationWaveformPlayer';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/core/utils/cn';
import {
  Gauge,
  MessageSquareQuote,
  Eye,
  UserCheck,
  Lightbulb,
  ArrowRight,
  Clock,
  Sparkles,
  History,
  RotateCcw,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  CheckCircle2,
  TrendingUp,
  Subtitles,
  Layers,
  ChevronRight,
} from 'lucide-react';

function formatDurationSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function PresentationReviewPage() {
  const { id: paramSessionId } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as {
    presentationReview?: PresentationReview;
    isHistoricalReview?: boolean;
  } | null;

  const initialRouteReview = routeState?.presentationReview;
  const activeSessionId = paramSessionId || initialRouteReview?.id;

  // Poll or query backend session from database
  const sessionQuery = usePresentationSession(activeSessionId);
  const retryMutation = useRetryPresentation();

  const sessionData = sessionQuery.data;
  const isServerProcessing = sessionData?.status === 'processing';
  const isServerFailed = sessionData?.status === 'failed';

  const [evalFeedback, setEvalFeedback] = useState<PresentationEvaluationFeedback | null>(
    initialRouteReview?.feedback || null
  );

  // Sync sessionData feedback when completed
  useEffect(() => {
    if (sessionData && sessionData.status === 'completed' && sessionData.overall_score !== null) {
      setEvalFeedback({
        transcript: sessionData.transcript || '',
        words_per_minute: sessionData.words_per_minute ?? 0,
        fillers_count: sessionData.fillers_count ?? 0,
        overall_score: sessionData.overall_score ?? 0,
        is_reading_slides: sessionData.is_reading_slides ?? false,
        slide_coverage_score: sessionData.slide_coverage_score ?? 0,
        elaboration_quality: sessionData.elaboration_quality ?? '',
        voice_feedback: sessionData.voice_feedback ?? '',
        body_language_feedback: sessionData.body_language_feedback ?? '',
        strengths: sessionData.strengths ?? [],
        improvements: sessionData.improvements ?? [],
        actionable_tips: sessionData.actionable_tips ?? [],
      });
    }
  }, [sessionData]);

  const presentationReview: PresentationReview | undefined = useMemo(() => {
    if (sessionData) {
      return {
        id: sessionData.id,
        fileName: sessionData.title || initialRouteReview?.fileName || 'Bài thuyết trình',
        duration: formatDurationSeconds(sessionData.duration_seconds),
        slideContent: sessionData.slide_content || initialRouteReview?.slideContent,
        transcript: evalFeedback?.transcript || sessionData.transcript || initialRouteReview?.transcript || '',
        wordsPerMinute: evalFeedback ? evalFeedback.words_per_minute : (sessionData.words_per_minute ?? initialRouteReview?.wordsPerMinute ?? 0),
        fillers: evalFeedback ? evalFeedback.fillers_count : (sessionData.fillers_count ?? initialRouteReview?.fillers ?? 0),
        eyeContact: sessionData.eye_contact_percent ?? initialRouteReview?.eyeContact ?? 0,
        posture: sessionData.posture_score ?? initialRouteReview?.posture ?? 0,
        confidence: initialRouteReview?.confidence ?? null,
        language: (sessionData.language as 'vi' | 'en') || initialRouteReview?.language || 'vi',
        feedback: evalFeedback || undefined,
      };
    }

    if (initialRouteReview) {
      return {
        ...initialRouteReview,
        id: initialRouteReview.id,
        wordsPerMinute: evalFeedback ? evalFeedback.words_per_minute : initialRouteReview.wordsPerMinute,
        fillers: evalFeedback ? evalFeedback.fillers_count : initialRouteReview.fillers,
        transcript: evalFeedback?.transcript || initialRouteReview.transcript,
        feedback: evalFeedback || initialRouteReview.feedback,
      };
    }

    return undefined;
  }, [sessionData, initialRouteReview, evalFeedback]);

  // Audio URL: prefer local audio blob if available in memory, fallback to server stream endpoint
  const audioUrl = useMemo(() => {
    if (initialRouteReview?.audioBlob instanceof Blob) {
      try {
        return URL.createObjectURL(initialRouteReview.audioBlob);
      } catch {
        // Fallback to server endpoint
      }
    }
    if (sessionData?.audio_path && activeSessionId) {
      return getPresentationAudioUrl(activeSessionId);
    }
    return null;
  }, [sessionData?.audio_path, activeSessionId, initialRouteReview?.audioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Save to legacy localStorage for safety
  useEffect(() => {
    if (presentationReview && !routeState?.isHistoricalReview && !isServerProcessing) {
      savePresentationHistory(presentationReview, presentationReview.id);
    }
  }, [presentationReview, routeState?.isHistoricalReview, isServerProcessing]);

  const handleRetry = () => {
    if (activeSessionId) {
      void retryMutation.mutateAsync(activeSessionId);
    }
  };

  // Radar chart data preparation
  const radarData = useMemo(() => {
    const slideCoverage = evalFeedback?.slide_coverage_score ?? 80;
    const eyeContact = presentationReview?.eyeContact ?? 75;
    const posture = presentationReview?.posture ?? 80;
    const wpm = presentationReview?.wordsPerMinute ?? 125;
    const wpmScore = wpm >= 115 && wpm <= 135 ? 95 : Math.max(40, 100 - Math.abs(wpm - 125) * 1.5);
    const elaboration = evalFeedback?.is_reading_slides ? 50 : 88;

    return [
      { label: 'Bao quát Slide', value: slideCoverage, shortLabel: 'Bao quát' },
      { label: 'Diễn giải & Ví dụ', value: elaboration, shortLabel: 'Diễn giải' },
      { label: 'Nhịp điệu giọng', value: Math.round(wpmScore), shortLabel: 'Giọng nói' },
      { label: 'Tương tác Camera', value: eyeContact, shortLabel: 'Ánh mắt' },
      { label: 'Ổn định tư thế', value: posture, shortLabel: 'Tư thế' },
    ];
  }, [evalFeedback, presentationReview]);

  const overallScore = evalFeedback?.overall_score ?? (presentationReview?.feedback?.overall_score ?? 85);

  return (
    <StudentPageLayout active="/practice/setup" title="AI chấm bài thuyết trình">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Top Minimalist Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/practice/setup"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">
                  Phân tích Thuyết trình Chuyên sâu
                </span>
                {routeState?.isHistoricalReview && (
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-bold px-2 py-0 border-slate-200">
                    Bản ghi lịch sử đã chấm
                  </Badge>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 mt-0.5">
                {presentationReview?.fileName || 'Báo cáo Đánh giá Thuyết trình 4 Trụ cột'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {presentationReview && (
              <>
                <Badge variant="secondary" className="bg-slate-100/80 text-slate-700 border-slate-200 text-xs px-3 py-1 flex items-center gap-1.5 font-medium">
                  <span aria-hidden="true">{presentationReview.language === 'en' ? '🇬🇧' : '🇻🇳'}</span>
                  <span>{presentationReview.language === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}</span>
                </Badge>
                <Badge variant="secondary" className="bg-slate-100/80 text-slate-700 border-slate-200 font-mono text-xs px-3 py-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-slate-500" /> Thời lượng: {presentationReview.duration}
                </Badge>
              </>
            )}
            <Link
              to="/practice/setup"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs font-bold gap-1 rounded-xl')}
            >
              Luyện phiên mới <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Loading State when opening via direct link/history */}
        {sessionQuery.isLoading && !presentationReview && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 animate-pulse">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Đang tải kết quả bài thuyết trình...</h2>
            <p className="mt-1 text-xs text-slate-400">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {/* Not Found / Error State */}
        {sessionQuery.isError && !presentationReview && !isServerProcessing && (
          <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-white p-6 shadow-sm">
            <AlertTriangle className="size-6 text-rose-600" />
            <div className="ml-3 flex-1">
              <AlertTitle className="text-sm font-bold text-rose-900">Không tìm thấy bài thuyết trình</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-rose-700">
                Phiên thuyết trình này không tồn tại hoặc bạn không có quyền truy cập.
              </AlertDescription>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  to="/practice/setup"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-lg text-xs font-semibold gap-1.5')}
                >
                  <ArrowLeft className="size-3.5" /> Về phòng luyện tập
                </Link>
                <Link
                  to="/home"
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-lg text-xs font-semibold')}
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {/* Processing State: Clean Step-by-Step Stepper */}
        {isServerProcessing && (
          <div className="rounded-3xl border border-cyan-200/80 bg-white p-8 sm:p-10 text-center shadow-xs">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 mb-4 animate-pulse">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">AI đang tiến hành phân tích bài thuyết trình…</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hệ thống xử lý ngầm đang bóc tách âm thanh, nhận diện ngữ điệu, đo độ dài ngắt nghỉ và đối chiếu từng trang slide của bạn.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="size-4" /> 1. Tiếp nhận tệp âm thanh
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-200 animate-pulse">
                <Loader2 className="size-4 animate-spin" /> 2. Đang phân tích giọng & từ đệm
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                3. Tổng hợp 4 trụ cột
              </div>
            </div>
          </div>
        )}

        {/* Failed State Alert */}
        {isServerFailed && (
          <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-white p-6 shadow-sm">
            <AlertTriangle className="size-6 text-rose-600" />
            <div className="ml-3 flex-1">
              <AlertTitle className="text-sm font-bold text-rose-900">Không thể hoàn tất đánh giá AI</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-rose-700">
                {sessionData.error_message || 'Trợ lý AI tạm thời bận hoặc gặp sự cố mạng. Vui lòng bấm thử lại.'}
              </AlertDescription>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={retryMutation.isPending}
                  onClick={handleRetry}
                  className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <RotateCcw className={cn("size-3.5", retryMutation.isPending && "animate-spin")} />
                  <span>{retryMutation.isPending ? 'Đang gửi lại...' : 'Thử chấm lại bài này'}</span>
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Main Dashboard Visuals when Completed */}
        {presentationReview && !isServerProcessing && (
          <>
            {/* Top Row: Spider Radar Chart + Waveform Audio Player */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Card: 4-Pillars Radar Chart */}
              <div className="lg:col-span-5 flex flex-col">
                <PresentationRadarChart data={radarData} overallScore={overallScore} className="h-full" />
              </div>

              {/* Right Card: Waveform Audio Player */}
              <div className="lg:col-span-7 flex flex-col">
                <PresentationWaveformPlayer
                  audioUrl={audioUrl}
                  durationLabel={presentationReview.duration}
                  wpm={presentationReview.wordsPerMinute}
                  fillers={presentationReview.fillers}
                  aiSummary={evalFeedback?.elaboration_quality || 'Bài nói tự tin, diễn giải mạch lạc. Hãy duy trì nhịp thở đều đặn và tiếp tục phát huy.'}
                  className="h-full"
                />
              </div>
            </div>

            {/* Row 2: 4 Sleek KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Metric 1: WPM */}
              <Card className="rounded-2xl border-slate-200/90 bg-white p-5 shadow-xs">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Tốc độ nói</span>
                    <Gauge className="size-4 text-blue-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      {presentationReview.wordsPerMinute}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">từ / phút</span>
                  </div>
                  <div className="mt-3">
                    <Progress
                      value={Math.min(100, (presentationReview.wordsPerMinute / 180) * 100)}
                      className="h-1.5 bg-slate-100"
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-blue-700">Mục tiêu</span>
                    <span>115–135 wpm</span>
                  </div>
                </CardContent>
              </Card>

              {/* Metric 2: Fillers */}
              <Card className="rounded-2xl border-slate-200/90 bg-white p-5 shadow-xs">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Từ đệm</span>
                    <MessageSquareQuote className="size-4 text-amber-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      {presentationReview.fillers}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">lần</span>
                  </div>
                  <div className="mt-3">
                    <Progress
                      value={Math.min(100, presentationReview.fillers * 12)}
                      className="h-1.5 bg-slate-100"
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-amber-700">Đánh giá</span>
                    <span>{presentationReview.fillers <= 2 ? 'Rất ít (Tốt)' : 'Cần giảm'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Metric 3: Eye Contact */}
              <Card className="rounded-2xl border-slate-200/90 bg-white p-5 shadow-xs">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Giao tiếp mắt</span>
                    <Eye className="size-4 text-violet-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      {presentationReview.eyeContact}%
                    </span>
                    <span className="text-xs text-slate-400 font-medium">thời lượng</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={presentationReview.eyeContact} className="h-1.5 bg-slate-100" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-violet-700">Mục tiêu</span>
                    <span>&gt; 60%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Metric 4: Posture */}
              <Card className="rounded-2xl border-slate-200/90 bg-white p-5 shadow-xs">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Ổn định tư thế</span>
                    <UserCheck className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      {presentationReview.posture}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 100</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={presentationReview.posture} className="h-1.5 bg-slate-100" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-emerald-700">Mục tiêu</span>
                    <span>&gt; 70 điểm</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Actionable Roadmap (Strengths & Improvements) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Strengths Card */}
              <Card className="rounded-3xl border-emerald-200/80 bg-emerald-50/40 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-4">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Điểm mạnh nổi bật đã ghi nhận
                </div>
                <ul className="space-y-3">
                  {(evalFeedback?.strengths || ['Mở đầu rõ ràng, đúng trọng tâm', 'Tác phong tự tin trước máy quay']).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 border border-emerald-100 shadow-2xs">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-800 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Actionable Tips Card */}
              <Card className="rounded-3xl border-amber-200/80 bg-amber-50/40 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs uppercase tracking-wider mb-4">
                  <TrendingUp className="size-4 text-amber-600" /> Mẹo thực hành cho lần nói tới
                </div>
                <ul className="space-y-3">
                  {(evalFeedback?.actionable_tips || ['Ngắt nhịp 1 giây trước khi chuyển ý chính', 'Hạ nhịp khi nhắc đến số liệu']).map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 border border-amber-100 shadow-2xs">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-extrabold text-amber-800 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-800 leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Row 4: 4 Pillars Deep-Dive Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="size-4 text-blue-700" /> Báo cáo Chi tiết 4 Trụ Cột Thuyết Trình
                </h3>
                <span className="text-xs text-slate-400">Chuẩn khung đánh giá kỹ năng thuyết trình hiện đại</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Bao quát Slide</span>
                    <span className="text-sm font-black text-teal-700 font-mono">{evalFeedback?.slide_coverage_score ?? 85}%</span>
                  </div>
                  <Progress value={evalFeedback?.slide_coverage_score ?? 85} className="mt-3 h-2 bg-slate-100" />
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    Mức độ truyền tải và bao quát các ý chính, thuật ngữ và số liệu trên các trang slide.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Diễn giải & Kể chuyện</span>
                    <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200 font-bold text-xs">
                      {evalFeedback?.is_reading_slides ? 'Đọc slide' : 'Diễn giải tốt'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback?.elaboration_quality || 'Khả năng dùng ngôn từ tự nhiên để phân tích và mở rộng ý tưởng.'}
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Giọng nói & Nhịp điệu</span>
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 font-mono font-bold text-xs">
                      {presentationReview.wordsPerMinute} wpm
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback?.voice_feedback || 'Đánh giá cao độ, ngắt nghỉ, năng lượng và tốc độ phát âm.'}
                  </p>
                </div>

                {/* Pillar 4 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">4. Ngôn ngữ cơ thể</span>
                    <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 font-bold text-xs">
                      Mắt {presentationReview.eyeContact}% · Tư thế {presentationReview.posture}/100
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                    {evalFeedback?.body_language_feedback || 'Đánh giá tỷ lệ nhìn thẳng vào máy quay và tư thế cân bằng hai vai.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 5: Synced Transcript & Slide Content Tabs */}
            <Card className="rounded-3xl border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <Tabs defaultValue="transcript" className="w-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <TabsList className="bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="transcript" className="text-xs font-bold gap-1.5 rounded-lg px-3">
                      <Subtitles className="size-3.5" /> Bản chép lời nói (Transcript)
                    </TabsTrigger>
                    <TabsTrigger value="slide" className="text-xs font-bold gap-1.5 rounded-lg px-3">
                      <FileText className="size-3.5" /> Nội dung Slide đối chiếu
                    </TabsTrigger>
                  </TabsList>
                  <span className="text-[11px] font-mono text-slate-400">Đã đồng bộ AI</span>
                </div>

                <TabsContent value="transcript" className="mt-4">
                  <div className="max-h-64 overflow-y-auto rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                    {presentationReview.transcript || '[Không ghi nhận được lời nói hoặc mic bị tắt]'}
                  </div>
                </TabsContent>

                <TabsContent value="slide" className="mt-4">
                  <div className="max-h-64 overflow-y-auto rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                    {presentationReview.slideContent || '[Chưa có nội dung văn bản slide]'}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Hidden fallback grade panel for direct synchronous mode if necessary */}
            <div className="hidden">
              <GradePanel
                presentationReview={presentationReview}
                onEvaluated={setEvalFeedback}
                isHistoricalReview={routeState?.isHistoricalReview || Boolean(sessionData && sessionData.status === 'completed')}
              />
            </div>
          </>
        )}
      </div>
    </StudentPageLayout>
  );
}
