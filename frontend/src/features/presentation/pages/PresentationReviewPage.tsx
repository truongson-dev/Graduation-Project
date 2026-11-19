import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { type PresentationReview } from '../types';
import { useEvaluatePresentation, type PresentationEvaluationFeedback } from '@/features/coach/api/ai';
import { savePresentationHistory } from '../api/presentation-history';
import {
  usePresentationSession,
  getPresentationAudioUrl,
  useRetryPresentation,
} from '../api/presentation-session';
import { PresentationWaveformPlayer } from '../components/PresentationWaveformPlayer';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils/cn';

const PresentationRadarChart = React.lazy(() =>
  import('../components/PresentationRadarChart').then((m) => ({
    default: m.PresentationRadarChart,
  })),
);

import {
  RotateCcw,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Subtitles,
  ChevronRight,
  Target,
  Layers,
  Volume2,
  Activity,
  Lightbulb,
} from 'lucide-react';

function formatDurationSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Only true hesitation sounds — never regular grammatical words like 'là' or 'thì'
const PURE_FILLER_WORDS = new Set(['ờ', 'à', 'ừm', 'ơ', 'um', 'uh', 'er', 'ah']);

function HighlightedTranscript({ text, fillersCount }: { text: string; fillersCount: number }) {
  if (!text) {
    return (
      <span className="text-slate-400 italic">[Không ghi nhận được lời nói hoặc mic bị tắt]</span>
    );
  }

  // If AI reported 0 fillers, do NOT highlight any words!
  if (fillersCount <= 0) {
    return <span>{text}</span>;
  }

  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/^[^\w\u00C0-\u1EF9]+|[^\w\u00C0-\u1EF9]+$/g, '');
        const isFiller = PURE_FILLER_WORDS.has(clean);
        if (isFiller) {
          return (
            <mark
              key={i}
              className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-900 border border-amber-300/60"
              title="Từ đệm phát hiện"
            >
              {word}
            </mark>
          );
        }
        return <span key={i}>{word}</span>;
      })}
    </>
  );
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

  const [clientFeedback, setClientFeedback] = useState<PresentationEvaluationFeedback | null>(null);

  // Derive evalFeedback directly during render
  const evalFeedback: PresentationEvaluationFeedback | null = useMemo(() => {
    if (sessionData && sessionData.status === 'completed' && sessionData.overall_score !== null) {
      return {
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
      };
    }
    return clientFeedback || initialRouteReview?.feedback || null;
  }, [sessionData, clientFeedback, initialRouteReview?.feedback]);

  const presentationReview: PresentationReview | undefined = useMemo(() => {
    if (sessionData) {
      return {
        id: sessionData.id,
        fileName: sessionData.title || initialRouteReview?.fileName || 'Bài thuyết trình',
        duration: formatDurationSeconds(sessionData.duration_seconds),
        slideContent: sessionData.slide_content || initialRouteReview?.slideContent,
        transcript:
          evalFeedback?.transcript ||
          sessionData.transcript ||
          initialRouteReview?.transcript ||
          '',
        wordsPerMinute: evalFeedback
          ? evalFeedback.words_per_minute
          : (sessionData.words_per_minute ?? initialRouteReview?.wordsPerMinute ?? 0),
        fillers: evalFeedback
          ? evalFeedback.fillers_count
          : (sessionData.fillers_count ?? initialRouteReview?.fillers ?? 0),
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
        wordsPerMinute: evalFeedback
          ? evalFeedback.words_per_minute
          : initialRouteReview.wordsPerMinute,
        fillers: evalFeedback ? evalFeedback.fillers_count : initialRouteReview.fillers,
        transcript: evalFeedback?.transcript || initialRouteReview.transcript,
        feedback: evalFeedback || initialRouteReview.feedback,
      };
    }

    return undefined;
  }, [sessionData, initialRouteReview, evalFeedback]);

  const evaluatePresentation = useEvaluatePresentation();
  const evaluatedRef = useRef(false);

  useEffect(() => {
    // If it's a historical review, completed session, or feedback already exists, NEVER re-evaluate
    if (
      routeState?.isHistoricalReview ||
      Boolean(sessionData && sessionData.status === 'completed') ||
      evalFeedback !== null
    ) {
      return;
    }

    // If session ID looks like a backend UUID (has hyphens) and no feedback, background queue handles it
    if (presentationReview?.id && presentationReview.id.includes('-')) {
      return;
    }

    if (
      presentationReview &&
      !evaluatedRef.current &&
      (presentationReview.audioBlob || presentationReview.slideContent)
    ) {
      evaluatedRef.current = true;
      const formData = new FormData();
      if (presentationReview.audioBlob instanceof Blob) {
        formData.append('audio', presentationReview.audioBlob, 'presentation-audio.webm');
      }
      formData.append(
        'slide_content',
        presentationReview.slideContent || '[Chưa có nội dung slide]'
      );
      formData.append('duration', presentationReview.duration || '01:00');
      formData.append('eye_contact_percent', String(presentationReview.eyeContact ?? 0));
      formData.append('posture_score', String(presentationReview.posture ?? 0));
      formData.append('language', presentationReview.language || 'vi');

      evaluatePresentation
        .mutateAsync(formData)
        .then((res) => {
          setClientFeedback(res);
        })
        .catch(() => undefined);
    }
  }, [presentationReview, routeState?.isHistoricalReview, sessionData, evalFeedback, evaluatePresentation]);

  // Audio URL
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
      if (audioUrl?.startsWith('blob:')) {
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

  const wordsCount = useMemo(() => {
    const text = presentationReview?.transcript || '';
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [presentationReview?.transcript]);

  const slideCoverage = evalFeedback?.slide_coverage_score ?? 85;
  const wpm = presentationReview?.wordsPerMinute ?? 125;
  const fillers = presentationReview?.fillers ?? 0;
  const eyeContact = presentationReview?.eyeContact ?? 75;
  const posture = presentationReview?.posture ?? 80;

  // Accurate presentation status (fixes "5% but says good elaboration" bug)
  const slideStatus = useMemo(() => {
    if (slideCoverage < 30 || wordsCount < 15 || wpm < 50) {
      return {
        label: 'Chưa đủ nội dung',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badgeText: 'Chưa đạt',
        feedback:
          'Bài thuyết trình quá ngắn hoặc chưa đi vào nội dung slide. Hãy dành thời gian phân tích và diễn giải từng ý chính trên slide.',
      };
    }
    if (slideCoverage < 60) {
      return {
        label: 'Chưa bao quát',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeText: 'Cần mở rộng',
        feedback:
          'Mới chỉ bao quát một phần nhỏ ý chính trên slide. Cần trình bày đầy đủ các luận điểm, ví dụ và số liệu.',
      };
    }
    if (evalFeedback?.is_reading_slides) {
      return {
        label: 'Đọc thụ động slide',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeText: 'Đọc slide',
        feedback:
          'Đang đọc nguyên văn nội dung trên slide. Nên chuyển sang tóm tắt ý chính và dùng ngôn từ tự nhiên để diễn giải.',
      };
    }
    return {
      label: 'Diễn giải tốt',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badgeText: 'Diễn giải tốt',
      feedback:
        evalFeedback?.elaboration_quality ||
        'Khả năng dùng ngôn từ tự nhiên để phân tích và mở rộng ý tưởng tốt, bám sát các ý chính trên slide.',
    };
  }, [
    slideCoverage,
    wordsCount,
    wpm,
    evalFeedback?.is_reading_slides,
    evalFeedback?.elaboration_quality,
  ]);

  // Radar chart data preparation
  const radarData = useMemo(() => {
    const wpmScore =
      wpm >= 115 && wpm <= 135 ? 95 : Math.max(30, Math.min(90, 100 - Math.abs(wpm - 125) * 1.5));

    let elaborationScore = 80;
    if (slideCoverage < 30 || wordsCount < 15 || wpm < 50) {
      elaborationScore = Math.max(10, Math.min(slideCoverage * 2, 35));
    } else if (slideCoverage < 60) {
      elaborationScore = Math.max(35, Math.min(slideCoverage, 55));
    } else if (evalFeedback?.is_reading_slides) {
      elaborationScore = 55;
    } else {
      elaborationScore = 88;
    }

    return [
      { label: 'Bao quát Slide', value: slideCoverage, shortLabel: 'Bao quát' },
      { label: 'Diễn giải & Ví dụ', value: elaborationScore, shortLabel: 'Diễn giải' },
      { label: 'Nhịp điệu giọng', value: Math.round(wpmScore), shortLabel: 'Giọng nói' },
      { label: 'Tương tác Camera', value: eyeContact, shortLabel: 'Ánh mắt' },
      { label: 'Ổn định tư thế', value: posture, shortLabel: 'Tư thế' },
    ];
  }, [slideCoverage, eyeContact, posture, wpm, wordsCount, evalFeedback?.is_reading_slides]);

  const overallScore =
    evalFeedback?.overall_score ?? presentationReview?.feedback?.overall_score ?? 85;

  const scoreBadge = useMemo(() => {
    if (overallScore >= 80)
      return { label: 'Xuất sắc', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (overallScore >= 65)
      return { label: 'Đạt chuẩn', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'Cần rèn luyện', class: 'bg-amber-50 text-amber-700 border-amber-200' };
  }, [overallScore]);

  return (
    <StudentPageLayout active="/practice/setup" title="AI chấm bài thuyết trình">
      <div className="mx-auto max-w-7xl space-y-5 pb-12">
        {/* Clean Enterprise Topbar */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium"
              >
                <Link to="/practice/setup" className="hover:text-slate-900 transition-colors">
                  Phòng luyện tập
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-700">Báo cáo đánh giá</span>
                {routeState?.isHistoricalReview && (
                  <>
                    <span className="text-slate-300">/</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-50 text-slate-600 font-medium px-2 py-0 border-slate-200"
                    >
                      Bản ghi lịch sử đã chấm
                    </Badge>
                  </>
                )}
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {presentationReview?.fileName || 'Báo cáo Đánh giá Thuyết trình'}
                </h1>
                <Badge
                  variant="outline"
                  className={cn('text-xs font-semibold px-2 py-0.5 border', scoreBadge.class)}
                >
                  {scoreBadge.label} ({overallScore}/100)
                </Badge>
              </div>

              {presentationReview && (
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                  <span className="font-medium text-slate-700">
                    {presentationReview.language === 'en' ? '🇬🇧 Tiếng Anh' : '🇻🇳 Tiếng Việt'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono tabular-nums">
                    <Clock className="size-3.5 text-slate-400 inline mr-1" />
                    Thời lượng: {presentationReview.duration}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono tabular-nums">{wordsCount} từ phát âm</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Link
                to="/practice/setup"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'text-xs font-medium gap-1.5 h-9 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                <ArrowLeft className="size-3.5" /> Quay lại
              </Link>
              <Link
                to="/practice/setup"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'text-xs font-medium gap-1 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-xs',
                )}
              >
                Luyện phiên mới <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State when opening via direct link/history */}
        {sessionQuery.isLoading && !presentationReview && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
              <Loader2 className="size-5 animate-spin" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">
              Đang tải kết quả bài thuyết trình...
            </h2>
            <p className="mt-1 text-xs text-slate-400">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {/* Not Found / Error State */}
        {sessionQuery.isError && !presentationReview && !isServerProcessing && (
          <Alert variant="destructive" className="rounded-lg border-rose-200 bg-white p-5">
            <AlertTriangle className="size-5 text-rose-600" />
            <div className="ml-3 flex-1">
              <AlertTitle className="text-sm font-semibold text-rose-900">
                Không tìm thấy bài thuyết trình
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs text-rose-700">
                Phiên thuyết trình này không tồn tại hoặc bạn không có quyền truy cập.
              </AlertDescription>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  to="/practice/setup"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'rounded-md text-xs font-medium gap-1.5',
                  )}
                >
                  <ArrowLeft className="size-3.5" /> Về phòng luyện tập
                </Link>
                <Link
                  to="/home"
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'sm' }),
                    'rounded-md text-xs font-medium',
                  )}
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {/* Processing State */}
        {isServerProcessing && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-3">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              AI đang phân tích bài thuyết trình…
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hệ thống xử lý ngầm đang bóc tách âm thanh, nhận diện ngữ điệu, đo độ dài ngắt nghỉ và
              đối chiếu từng trang slide của bạn.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="size-3.5" /> 1. Tiếp nhận tệp âm thanh
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                <Loader2 className="size-3.5 animate-spin" /> 2. Đang phân tích giọng &amp; từ đệm
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                3. Tổng hợp đánh giá
              </div>
            </div>
          </div>
        )}

        {/* Failed State Alert */}
        {isServerFailed && (
          <Alert variant="destructive" className="rounded-lg border-rose-200 bg-white p-5">
            <AlertTriangle className="size-5 text-rose-600" />
            <div className="ml-3 flex-1">
              <AlertTitle className="text-sm font-semibold text-rose-900">
                Không thể hoàn tất đánh giá AI
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs text-rose-700">
                {sessionData?.error_message ||
                  'Trợ lý AI tạm thời bận hoặc gặp sự cố mạng. Vui lòng bấm thử lại.'}
              </AlertDescription>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={retryMutation.isPending}
                  onClick={handleRetry}
                  className="rounded-md text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <RotateCcw
                    className={cn('size-3.5', retryMutation.isPending && 'animate-spin')}
                  />
                  <span>
                    {retryMutation.isPending ? 'Đang gửi lại...' : 'Thử chấm lại bài này'}
                  </span>
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Main Dashboard Visuals when Completed */}
        {presentationReview && !isServerProcessing && (
          <>
            {/* 1. KHỐI TÓM TẮT KẾT QUẢ TRỰC QUAN (Executive Verdict & Core Metrics) */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left: Score & AI Verdict (5 cols) */}
                <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-5 lg:pb-0 lg:pr-6">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center size-20 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                      <span className="text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                        {overallScore}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">/ 100 điểm</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Đánh giá chung:</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-semibold px-2 py-0 border', scoreBadge.class)}
                        >
                          {scoreBadge.label}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {evalFeedback?.elaboration_quality ||
                          (overallScore < 50
                            ? 'Bài nói cần bổ sung thêm nội dung và tăng tốc độ phát âm để đảm bảo truyền tải đủ thông điệp.'
                            : 'Bài nói hoàn thành tốt, nhịp điệu phát âm rõ ràng và có độ tự tin cao.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: 4 Clean Metrics (7 cols) - No repetition, intuitive and friendly */}
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Metric 1: WPM */}
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-medium text-slate-500 block">Tốc độ nói</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {wpm}
                      </span>
                      <span className="text-[11px] text-slate-500">từ / phút</span>
                    </div>
                    <span
                      className={cn(
                        'mt-1.5 text-[11px] block font-medium',
                        wpm >= 115 && wpm <= 135 ? 'text-emerald-600' : 'text-amber-600',
                      )}
                    >
                      {wpm >= 115 && wpm <= 135
                        ? 'Tối ưu (115–135)'
                        : wpm < 115
                          ? 'Hơi chậm (<115)'
                          : 'Hơi nhanh (>135)'}
                    </span>
                  </div>

                  {/* Metric 2: Fillers */}
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-medium text-slate-500 block">Từ đệm</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {fillers}
                      </span>
                      <span className="text-[11px] text-slate-500">lần</span>
                    </div>
                    <span
                      className={cn(
                        'mt-1.5 text-[11px] block font-medium',
                        fillers <= 2 ? 'text-emerald-600' : 'text-amber-600',
                      )}
                    >
                      {fillers === 0
                        ? 'Không có (Rất tốt)'
                        : fillers <= 2
                          ? 'Ít (Tốt)'
                          : 'Cần giảm'}
                    </span>
                  </div>

                  {/* Metric 3: Eye contact & Posture */}
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Giao tiếp mắt
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {eyeContact}%
                      </span>
                      <span className="text-[11px] text-slate-500">mắt</span>
                    </div>
                    <span className="mt-1.5 text-[11px] block text-slate-500">
                      Tư thế: <strong className="text-slate-800 font-mono">{posture}/100</strong>
                    </span>
                  </div>

                  {/* Metric 4: Slide coverage */}
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Bao quát Slide
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {slideCoverage}%
                      </span>
                      <span className="text-[11px] text-slate-500">nội dung</span>
                    </div>
                    <span className={cn('mt-1.5 text-[11px] block font-medium', slideStatus.color)}>
                      {slideStatus.badgeText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. KHU VỰC THAO TÁC CHÍNH (2 Cột Rõ Ràng, Dễ Dùng) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* CỘT TRÁI (6 cols): Studio Âm thanh & Lời thoại */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Volume2 className="size-4 text-slate-500" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Nghe lại bài nói &amp; Bản gỡ băng
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {wordsCount} từ phát âm
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Embedded Waveform Player */}
                    <PresentationWaveformPlayer
                      bare
                      audioUrl={audioUrl}
                      durationLabel={presentationReview.duration}
                      wpm={presentationReview.wordsPerMinute}
                      fillers={presentationReview.fillers}
                      aiSummary={
                        evalFeedback?.elaboration_quality ||
                        'Bài nói duy trì tốc độ và phát âm tự nhiên.'
                      }
                    />

                    {/* Integrated Synchronized Tabs */}
                    <div className="pt-3 border-t border-slate-200">
                      <Tabs defaultValue="transcript" className="w-full">
                        <div className="flex items-center justify-between pb-2 flex-wrap gap-2 border-b border-slate-100">
                          <TabsList className="bg-slate-100 p-0.5 rounded-md h-8">
                            <TabsTrigger
                              value="transcript"
                              className="text-xs font-medium gap-1.5 rounded px-2.5 h-7"
                            >
                              <Subtitles className="size-3.5" /> Lời nói đã ghi nhận
                            </TabsTrigger>
                            <TabsTrigger
                              value="slide"
                              className="text-xs font-medium gap-1.5 rounded px-2.5 h-7"
                            >
                              <FileText className="size-3.5" /> Nội dung Slide đối chiếu
                            </TabsTrigger>
                          </TabsList>
                          {fillers > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-700">
                              <span className="inline-block size-2 rounded-full bg-amber-400" />
                              <span>Vàng: Vị trí từ đệm</span>
                            </div>
                          )}
                        </div>

                        <TabsContent value="transcript" className="mt-3">
                          <div className="max-h-72 overflow-y-auto rounded border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-800 leading-relaxed font-sans select-text">
                            <HighlightedTranscript
                              text={presentationReview.transcript}
                              fillersCount={presentationReview.fillers}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="slide" className="mt-3">
                          <div className="max-h-72 overflow-y-auto rounded border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap select-text">
                            {presentationReview.slideContent || '[Chưa có nội dung văn bản slide]'}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>

                {/* Radar Chart (Clean, No Repetitive Table) */}
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-slate-500" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Biểu đồ Năng lực 5 Trục
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      Tổng kết:{' '}
                      <strong className="text-slate-900 font-bold">{overallScore}/100</strong>
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <Suspense fallback={<Skeleton className="h-[220px] w-full rounded-md" />}>
                      <PresentationRadarChart
                        bare
                        data={radarData}
                        overallScore={overallScore}
                        className="h-[220px]"
                      />
                    </Suspense>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (6 cols): Nhận xét AI & Hướng dẫn Cải thiện */}
              <div className="lg:col-span-6 space-y-5">
                {/* Chẩn đoán 4 Trụ Cột (Tập trung lời khuyên, không lặp số liệu) */}
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-slate-500" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Chẩn đoán Chi tiết 4 Trụ Cột
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">AI Diagnostic</span>
                  </div>

                  <div className="p-4 sm:p-5 divide-y divide-slate-100">
                    {/* Trụ cột 1: Slide */}
                    <div className="pb-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          1. Bao quát Slide &amp; Số liệu
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-semibold', slideStatus.color)}
                        >
                          {slideStatus.label} ({slideCoverage}%)
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {slideStatus.feedback}
                      </p>
                    </div>

                    {/* Trụ cột 2: Diễn giải */}
                    <div className="py-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          2. Diễn giải &amp; Kể chuyện
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold',
                            slideCoverage < 30
                              ? 'text-rose-700 bg-rose-50 border-rose-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200',
                          )}
                        >
                          {slideCoverage < 30
                            ? 'Chưa đủ nội dung'
                            : evalFeedback?.is_reading_slides
                              ? 'Đọc slide'
                              : 'Diễn giải tốt'}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {slideCoverage < 30
                          ? 'Thời lượng bài nói quá ngắn để đánh giá khả năng dẫn chứng và kể chuyện. Hãy thực hành nói đầy đủ các luận điểm.'
                          : evalFeedback?.elaboration_quality ||
                            'Khả năng dùng ngôn từ tự nhiên để phân tích và mở rộng ý tưởng.'}
                      </p>
                    </div>

                    {/* Trụ cột 3: Giọng nói */}
                    <div className="py-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          3. Giọng nói &amp; Nhịp điệu
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {presentationReview.wordsPerMinute} wpm
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {evalFeedback?.voice_feedback ||
                          (wpm < 80
                            ? 'Tốc độ nói hiện tại khá chậm. Hãy tăng nhịp độ lên khoảng 115–135 từ/phút để bài nói thêm năng lượng và cuốn hút.'
                            : 'Nhịp nói duy trì tốt, phát âm rõ ràng.')}
                      </p>
                    </div>

                    {/* Trụ cột 4: Ngôn ngữ cơ thể */}
                    <div className="pt-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          4. Ngôn ngữ cơ thể &amp; Ánh mắt
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          Mắt {presentationReview.eyeContact}% · Tư thế {presentationReview.posture}
                          /100
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {evalFeedback?.body_language_feedback ||
                          'Tác phong nhìn thẳng vào máy quay và giữ vai cân bằng tốt, tạo được sự tự tin cần thiết.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lộ trình Hành động Phiên tới */}
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-slate-500" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Kế hoạch Luyện tập Phiên tới
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Action Plan</span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Strengths */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" /> Điểm bạn đã làm tốt
                      </div>
                      <div className="space-y-1.5">
                        {(evalFeedback?.strengths && evalFeedback.strengths.length > 0
                          ? evalFeedback.strengths
                          : ['Tác phong tự tin trước máy quay', 'Tập trung nhìn thẳng camera']
                        ).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 rounded border border-emerald-100 bg-emerald-50/30 p-2 text-xs text-slate-800 leading-relaxed"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 mt-0.5 font-mono">
                              ✓
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actionable Tips */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <Lightbulb className="size-3.5 text-blue-600" /> Việc cần làm để tăng điểm
                          lần sau
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Gợi ý AI</span>
                      </div>
                      <div className="space-y-1.5">
                        {(evalFeedback?.actionable_tips && evalFeedback.actionable_tips.length > 0
                          ? evalFeedback.actionable_tips
                          : [
                              'Trình bày đầy đủ nội dung slide thay vì chỉ nói câu chào mở đầu.',
                              'Dành ít nhất 30–60 giây để phân tích và diễn giải từng trang slide.',
                            ]
                        ).map((tip, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-800 leading-relaxed"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800 mt-0.5 font-mono">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <span>{tip}</span>
                            </div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600 shrink-0">
                              {idx === 0 ? 'Ưu tiên 1' : 'Ưu tiên 2'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </StudentPageLayout>
  );
}
