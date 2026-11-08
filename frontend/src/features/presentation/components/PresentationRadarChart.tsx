import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, PolarRadiusAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/core/utils/cn"

export interface RadarDataPoint {
  label: string
  value: number // 0 to 100
  shortLabel?: string
}

export interface PresentationRadarChartProps {
  data: RadarDataPoint[]
  overallScore: number
  className?: string
}

const chartConfig = {
  score: {
    label: "Điểm năng lực",
    color: "#2563eb",
  },
} satisfies ChartConfig

export function PresentationRadarChart({
  data,
  overallScore,
  className,
}: PresentationRadarChartProps) {
  // Format data for Recharts RadarChart
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      pillar: d.shortLabel || d.label,
      score: Math.max(0, Math.min(100, d.value)),
      fullMark: 100,
    }))
  }, [data])

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { label: "Xuất sắc", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    if (score >= 65) return { label: "Đạt chuẩn", color: "text-blue-700 bg-blue-50 border-blue-200" }
    return { label: "Cần rèn luyện", color: "text-amber-700 bg-amber-50 border-amber-200" }
  }

  const status = getScoreStatus(overallScore)

  return (
    <Card className={cn("rounded-2xl border-slate-200/90 bg-white shadow-xs flex flex-col justify-between", className)}>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Biểu đồ Năng lực 4 Trụ Cột
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Phân tích tương quan 5 tiêu chí thuyết trình
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn("font-bold text-xs px-2.5 py-0.5 border", status.color)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-0 px-2 flex-1 flex items-center justify-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[240px] w-full"
        >
          <RadarChart data={chartData} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarGrid className="stroke-slate-200" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="pillar"
              tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Điểm đánh giá"
              dataKey="score"
              fill="var(--color-score)"
              fillOpacity={0.25}
              stroke="var(--color-score)"
              strokeWidth={2}
              dot={{
                r: 3.5,
                fill: "var(--color-score)",
                stroke: "#ffffff",
                strokeWidth: 1.5,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="pt-2 pb-4 px-5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Điểm tổng kết:</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black font-mono text-slate-900">{overallScore}</span>
          <span className="text-xs text-slate-400 font-medium">/ 100</span>
        </div>
      </CardFooter>
    </Card>
  )
}
