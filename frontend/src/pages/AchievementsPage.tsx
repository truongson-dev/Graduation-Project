import { Link } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { AppIcon as Icon } from '../components/Common/AppIcon';
import { CURRENT_TOURNAMENT } from '../lib/tournament';

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
  { name: 'Trương Thanh Sơn', school: 'Học viên SkillBridge', xp: 1080, initials: 'TS', color: 'bg-blue-100 text-blue-700' },
  { name: 'Bảo Trâm', school: 'ĐH Ngoại Thương', xp: 960, initials: 'BT', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { name: 'Quốc Trung', school: 'ĐH Bách Khoa TP.HCM', xp: 870, initials: 'QT', color: 'bg-teal-100 text-teal-700' },
  { name: 'Hải Yến', school: 'Học viện SkillBridge', xp: 810, initials: 'HY', color: 'bg-orange-100 text-orange-700' },
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
        className={`bg-no-repeat transition-transform duration-200 ${active ? 'h-20 w-20 scale-110' : 'h-12 w-12 opacity-70'}`}
        style={{
          backgroundImage: "url('/achievement-tiers.png')",
          backgroundSize: '500% 200%',
          backgroundPosition: `${tier.column * 25}% ${tier.row * 100}%`,
        }}
      />
      <span className={`max-w-[82px] text-center text-[10px] font-semibold leading-tight ${active ? 'text-amber-700' : 'text-slate-400'}`}>
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
        <text x="16" y="17" textAnchor="middle" fontSize="12" fontWeight="800" fill={medalColor.stroke}>{place}</text>
      </svg>
    </span>
  );
}

export function AchievementsPage() {
  const ranking = rankings['Tuần này'];
  const currentUserIndex = ranking.findIndex((person) => person.name === CURRENT_USER);
  const currentUser = ranking[currentUserIndex];
  const currentTierIndex = tiers.findIndex((tier) => tier.name === CURRENT_TIER);
  const visibleTiers = tiers.slice(0, currentTierIndex + 1);
  const topPercent = currentUserIndex >= 0 ? Math.ceil(((currentUserIndex + 1) / ranking.length) * 100) : 100;

  return (
    <StudentPageLayout active="/achievements" title="Thành tích">
      <div className="mx-auto w-full max-w-5xl pb-10">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(30,64,175,0.08)]">
          <header className="sticky top-0 z-20 isolate overflow-hidden rounded-t-2xl border-b border-amber-200 bg-gradient-to-b from-amber-100 via-yellow-50 to-white px-4 pb-5 pt-5 sm:px-7 sm:pt-7">
            <svg aria-hidden="true" viewBox="0 0 900 240" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70">
              <g fill="none" stroke="#f4b400" strokeLinecap="round" strokeWidth="3">
                <path d="M95 88v-18m0 72v-18M59 106h18m36 0h18M70 81l13 13m25 25 13 13m0-51-13 13m-25 25-13 13" />
                <path d="M795 61V43m0 72V97m-36-18h18m36 0h18m-61-25 13 13m25 25 13 13m0-51-13 13m-25 25-13 13" />
                <path d="M238 48v-9m0 38v-9m-19-10h9m20 0h9m-33-13 7 7m14 14 7 7m0-28-7 7m-14 14-7 7" />
                <path d="M655 130v-10m0 42v-10m-21-11h10m22 0h10m-36-15 7 7m15 15 7 7m0-29-7 7m-15 15-7 7" />
              </g>
              <g fill="#fb923c"><circle cx="95" cy="106" r="4"/><circle cx="795" cy="79" r="4"/><circle cx="238" cy="58" r="3"/><circle cx="655" cy="141" r="3"/></g>
            </svg>
            <div className="relative text-center">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Hạng của bạn</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#18345d]">Giải đấu {CURRENT_TIER}</h1>
                <p className="mt-1 text-sm font-semibold text-amber-600">Còn {CURRENT_TOURNAMENT.daysRemaining} ngày</p>
            </div>

            <div className="mt-5 pb-2">
              <div className="flex items-end justify-center gap-1 sm:gap-3">
                {visibleTiers.map((tier) => (
                  <TierEmblem key={tier.name} tier={tier} active={tier.name === CURRENT_TIER} />
                ))}
              </div>
            </div>
          </header>

          <div className="border-b border-slate-100 px-4 py-4 sm:px-7">
            <div>
              <h2 className="text-base font-extrabold text-[#18345d]">Bảng xếp hạng</h2>
            </div>
          </div>

          <div className="space-y-1 px-2 py-2 sm:px-4" aria-label="Bảng xếp hạng tuần này">
            {ranking.map((person, index) => {
              const place = index + 1;
              const isCurrentUser = person.name === CURRENT_USER;

              return (
                <div
                  key={person.name}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 transition sm:px-4 ${
                    isCurrentUser
                      ? 'bg-blue-50 ring-1 ring-inset ring-blue-100'
                      : index % 2 === 0
                        ? 'bg-slate-50/80'
                        : 'bg-white'
                  }`}
                >
                  <RankMarker place={place} />
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${person.color}`}>
                    {person.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{person.name}</p>
                      {isCurrentUser && (
                        <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Bạn</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{person.school}</p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-[#18345d]">
                    {person.xp.toLocaleString('vi-VN')} XP
                  </span>
                </div>
              );
            })}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-50 px-2 text-sm font-extrabold text-blue-700">
                {topPercent}%
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">Bạn đang nằm trong top {topPercent}% người học tốt</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{currentUser?.xp.toLocaleString('vi-VN')} XP tích lũy — mỗi bài luyện giúp bạn tiến xa hơn.</p>
              </div>
            </div>
            <Link
              to="/learning-path"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Tiếp tục học
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </footer>
        </section>
      </div>
    </StudentPageLayout>
  );
}
