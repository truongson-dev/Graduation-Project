import { useState } from 'react';
import { Link } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import { CURRENT_TOURNAMENT } from '../api/tournament';
import { ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/core/utils/cn';

type Rank = {
  name: string;
  school: string;
  xp: number;
  initials: string;
  color: string;
};

type Tier = {
  name: string;
  column: number;
  row: number;
};

const tiers: Tier[] = [
  { name: 'Đồng', column: 0, row: 0 },
  { name: 'Bạc', column: 1, row: 0 },
  { name: 'Vàng', column: 2, row: 0 },
  { name: 'Lam Ngọc', column: 3, row: 0 },
  { name: 'Hồng Ngọc', column: 4, row: 0 },
  { name: 'Ngọc Lục Bảo', column: 0, row: 1 },
  { name: 'Thạch Anh Tím', column: 1, row: 1 },
  { name: 'Ngọc Trai', column: 2, row: 1 },
  { name: 'Hắc Diệu Thạch', column: 3, row: 1 },
  { name: 'Kim Cương', column: 4, row: 1 },
];

const weeklyRanking: Rank[] = [
  { name: 'Minh Anh', school: 'ĐH Ngoại Thương', xp: 1480, initials: 'MA', color: 'bg-rose-100 text-rose-700' },
  { name: 'Đức Huy', school: 'ĐH Bách Khoa Hà Nội', xp: 1320, initials: 'ĐH', color: 'bg-sky-100 text-sky-700' },
  { name: 'Thu Hà', school: 'ĐH Kinh Tế Quốc Dân', xp: 1190, initials: 'TH', color: 'bg-amber-100 text-amber-700' },
  { name: 'Trương Thanh Sơn', school: 'Học viên SoftSkill AI', xp: 1080, initials: 'TS', color: 'bg-blue-100 text-blue-700' },
  { name: 'Bảo Trâm', school: 'ĐH Ngoại Thương', xp: 960, initials: 'BT', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { name: 'Quốc Trung', school: 'ĐH Bách Khoa TP.HCM', xp: 870, initials: 'QT', color: 'bg-teal-100 text-teal-700' },
  { name: 'Hải Yến', school: 'Học viện SoftSkill AI', xp: 810, initials: 'HY', color: 'bg-orange-100 text-orange-700' },
  { name: 'Gia Bảo', school: 'ĐH Kinh Tế TP.HCM', xp: 745, initials: 'GB', color: 'bg-indigo-100 text-indigo-700' },
  { name: 'Khánh Linh', school: 'ĐH FPT', xp: 690, initials: 'KL', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Hoàng Long', school: 'ĐH Công Nghệ', xp: 640, initials: 'HL', color: 'bg-violet-100 text-violet-700' },
];

const rankings: Record<string, Rank[]> = {
  'Tuần này': weeklyRanking,
  'Tháng này': weeklyRanking.map((person, index) => ({ ...person, xp: person.xp * 4 - index * 35 })),
  'Tất cả': weeklyRanking.map((person, index) => ({ ...person, xp: person.xp * 12 - index * 120 })),
};

const CURRENT_USER = 'Trương Thanh Sơn';
const CURRENT_TIER = CURRENT_TOURNAMENT.tier;

function TierEmblem({ tier, active }: { tier: Tier; active: boolean }) {
  return (
    <div className="flex min-w-[72px] flex-col items-center gap-1.5">
      <div
        aria-hidden="true"
        className={`bg-no-repeat transition-transform duration-200 ${
          active ? 'h-20 w-20 scale-110 drop-shadow-md' : 'h-12 w-12 opacity-65'
        }`}
        style={{
          backgroundImage: "url('/achievement-tiers.png')",
          backgroundSize: '500% 200%',
          backgroundPosition: `${tier.column * 25}% ${tier.row * 100}%`,
        }}
      />
      <span
        className={`max-w-[82px] text-center text-[10px] font-bold leading-tight ${
          active ? 'text-amber-800 font-extrabold' : 'text-slate-400'
        }`}
      >
        {tier.name}
      </span>
    </div>
  );
}

function RankMarker({ place }: { place: number }) {
  if (place > 3) {
    return <span className="w-8 text-center text-sm font-extrabold tabular-nums text-slate-500">{place}</span>;
  }

  const medalColor = {
    1: { fill: '#facc15', ribbon: '#eab308', stroke: '#ca8a04' },
    2: { fill: '#cbd5e1', ribbon: '#94a3b8', stroke: '#64748b' },
    3: { fill: '#fdba74', ribbon: '#f97316', stroke: '#c2410c' },
  }[place as 1 | 2 | 3];

  return (
    <span className="flex h-8 w-8 items-center justify-center" aria-label={`Hạng ${place}`}>
      <svg aria-hidden="true" viewBox="0 0 32 36" className="h-8 w-7 drop-shadow-sm">
        <path d="M8 19 7 34l9-5 9 5-1-15" fill={medalColor.ribbon} />
        <circle cx="16" cy="13" r="11" fill={medalColor.fill} stroke={medalColor.stroke} strokeWidth="2" />
        <text x="16" y="17" textAnchor="middle" fontSize="12" fontWeight="800" fill={medalColor.stroke}>
          {place}
        </text>
      </svg>
    </span>
  );
}

export function AchievementsPage() {
  const [period, setPeriod] = useState('Tuần này');
  const ranking = rankings[period] ?? weeklyRanking;
  const currentUserIndex = ranking.findIndex((person) => person.name === CURRENT_USER);
  const currentUser = ranking[currentUserIndex];
  const currentTierIndex = tiers.findIndex((tier) => tier.name === CURRENT_TIER);
  const visibleTiers = tiers.slice(0, currentTierIndex + 1);
  const topPercent = currentUserIndex >= 0 ? Math.ceil(((currentUserIndex + 1) / ranking.length) * 100) : 100;

  return (
    <StudentPageLayout active="/achievements" title="Thành tích & Vinh danh">
      <div className="mx-auto w-full max-w-5xl pb-10">
        <section className="rounded-3xl border border-slate-200/90 bg-white shadow-[0_18px_45px_rgba(30,64,175,0.08)] overflow-hidden">
          {/* Header Banner with Tiers */}
          <header className="relative isolate overflow-hidden border-b border-amber-200 bg-gradient-to-b from-amber-100 via-yellow-50 to-white px-4 pb-6 pt-6 sm:px-7 sm:pt-8 text-center">
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 flex items-center justify-center gap-1.5">
                <Trophy className="size-4 text-amber-500" /> BẢNG XẾP HẠNG HỌC VIÊN
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#18345d] sm:text-3xl">
                Giải đấu {CURRENT_TIER}
              </h1>
              <p className="mt-1 text-xs font-bold text-amber-700 bg-amber-100/70 inline-block px-3 py-1 rounded-full">
                Còn {CURRENT_TOURNAMENT.daysRemaining} ngày kết thúc mùa giải
              </p>
            </div>

            <div className="mt-6 pb-2">
              <div className="flex items-end justify-center gap-1.5 sm:gap-4 overflow-x-auto py-2">
                {visibleTiers.map((tier) => (
                  <TierEmblem key={tier.name} tier={tier} active={tier.name === CURRENT_TIER} />
                ))}
              </div>
            </div>
          </header>

          {/* Leaderboard Controls (Tabs) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-7 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-[#18345d]">Thứ hạng giải đấu</h2>
              <p className="text-xs text-slate-500">Cập nhật theo XP đạt được qua các bài luyện tập</p>
            </div>

            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="bg-slate-200/70 p-1 rounded-xl h-auto">
                {Object.keys(rankings).map((name) => (
                  <TabsTrigger
                    key={name}
                    value={name}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold data-active:bg-white data-active:text-blue-700 data-active:shadow-2xs"
                  >
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Ranking List with Zones */}
          <div className="space-y-1.5 px-3 py-3 sm:px-6" aria-label="Bảng xếp hạng">
            {ranking.map((person, index) => {
              const place = index + 1;
              const isCurrentUser = person.name === CURRENT_USER;
              const isPromotion = place <= 3;
              const isRelegation = place >= 8;

              return (
                <div
                  key={person.name}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition sm:px-4 ${
                    isCurrentUser
                      ? 'bg-blue-50 ring-2 ring-blue-500/30'
                      : index % 2 === 0
                        ? 'bg-slate-50/80'
                        : 'bg-white'
                  }`}
                >
                  <RankMarker place={place} />
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold shadow-2xs ${person.color}`}
                  >
                    {person.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{person.name}</p>
                      {isCurrentUser && (
                        <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 font-extrabold uppercase">
                          Bạn
                        </Badge>
                      )}
                      {isPromotion && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-700 bg-emerald-50 border-emerald-200 hidden sm:inline-flex">
                          Thăng hạng
                        </Badge>
                      )}
                      {isRelegation && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-rose-700 bg-rose-50 border-rose-200 hidden sm:inline-flex">
                          Nguy cơ
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400 font-medium">{person.school}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums text-[#18345d]">
                    {person.xp.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">XP</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Card with Progress & CTA */}
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-100/70 px-2 text-sm font-black text-blue-800">
                Top {topPercent}%
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="size-3.5 text-amber-500" />
                  Bạn đang nằm trong top {topPercent}% học viên tiến bộ nhanh
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {currentUser?.xp.toLocaleString('vi-VN')} XP tích lũy — tiếp tục bài luyện để giữ vững vị trí!
                </p>
              </div>
            </div>
            <Link
              to="/learning-path"
              className={cn(buttonVariants({ variant: 'default' }), 'rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold px-4 py-2 gap-1.5')}
            >
              Tiếp tục học <ArrowRight className="size-4" />
            </Link>
          </footer>
        </section>
      </div>
    </StudentPageLayout>
  );
}
