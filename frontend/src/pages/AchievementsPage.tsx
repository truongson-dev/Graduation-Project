import { useState } from 'react';
import { Link } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';

type Rank = { name: string; school: string; xp: number; initials: string; color: string };
const rankings: Record<string, Rank[]> = {
  'Tuần này': [
    { name: 'Minh Anh', school: 'ĐH Ngoại Thương', xp: 1480, initials: 'MA', color: 'bg-rose-100 text-rose-700' },
    { name: 'Đức Huy', school: 'ĐH Bách Khoa Hà Nội', xp: 1320, initials: 'ĐH', color: 'bg-sky-100 text-sky-700' },
    { name: 'Thu Hà', school: 'ĐH Kinh Tế Quốc Dân', xp: 1190, initials: 'TH', color: 'bg-amber-100 text-amber-700' },
    { name: 'Trương Thanh Sơn', school: 'Học viên SkillBridge', xp: 1080, initials: 'TS', color: 'bg-blue-100 text-blue-700' },
    { name: 'Bảo Trâm', school: 'ĐH Ngoại Thương', xp: 960, initials: 'BT', color: 'bg-fuchsia-100 text-fuchsia-700' },
    { name: 'Quốc Trung', school: 'ĐH Bách Khoa TP.HCM', xp: 870, initials: 'QT', color: 'bg-teal-100 text-teal-700' },
  ],
  'Tháng này': [
    { name: 'Đức Huy', school: 'ĐH Bách Khoa Hà Nội', xp: 5620, initials: 'ĐH', color: 'bg-sky-100 text-sky-700' },
    { name: 'Minh Anh', school: 'ĐH Ngoại Thương', xp: 5180, initials: 'MA', color: 'bg-rose-100 text-rose-700' },
    { name: 'Trương Thanh Sơn', school: 'Học viên SkillBridge', xp: 4360, initials: 'TS', color: 'bg-blue-100 text-blue-700' },
    { name: 'Thu Hà', school: 'ĐH Kinh Tế Quốc Dân', xp: 4180, initials: 'TH', color: 'bg-amber-100 text-amber-700' },
    { name: 'Quốc Trung', school: 'ĐH Bách Khoa TP.HCM', xp: 3970, initials: 'QT', color: 'bg-teal-100 text-teal-700' },
    { name: 'Bảo Trâm', school: 'ĐH Ngoại Thương', xp: 3760, initials: 'BT', color: 'bg-fuchsia-100 text-fuchsia-700' },
  ],
  'Tất cả': [
    { name: 'Minh Anh', school: 'ĐH Ngoại Thương', xp: 18480, initials: 'MA', color: 'bg-rose-100 text-rose-700' },
    { name: 'Trương Thanh Sơn', school: 'Học viên SkillBridge', xp: 16320, initials: 'TS', color: 'bg-blue-100 text-blue-700' },
    { name: 'Đức Huy', school: 'ĐH Bách Khoa Hà Nội', xp: 14950, initials: 'ĐH', color: 'bg-sky-100 text-sky-700' },
    { name: 'Thu Hà', school: 'ĐH Kinh Tế Quốc Dân', xp: 13180, initials: 'TH', color: 'bg-amber-100 text-amber-700' },
    { name: 'Bảo Trâm', school: 'ĐH Ngoại Thương', xp: 11800, initials: 'BT', color: 'bg-fuchsia-100 text-fuchsia-700' },
    { name: 'Quốc Trung', school: 'ĐH Bách Khoa TP.HCM', xp: 10440, initials: 'QT', color: 'bg-teal-100 text-teal-700' },
  ],
};

const badges = [
  { icon: 'forum', title: 'Người mở lời', detail: 'Bắt đầu 5 cuộc thảo luận', color: 'bg-cyan-50 text-cyan-700', progress: '5/5' },
  { icon: 'record_voice_over', title: 'Nói điều thuyết phục', detail: 'Hoàn thành 10 lượt luyện nói', color: 'bg-violet-50 text-violet-700', progress: '8/10' },
  { icon: 'local_fire_department', title: 'Bền bỉ mỗi ngày', detail: 'Học liên tục trong 7 ngày', color: 'bg-orange-50 text-orange-600', progress: '7/7' },
];

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function AchievementsPage() {
  const [period, setPeriod] = useState('Tuần này');
  const ranking = rankings[period];
  const podium = [ranking[1], ranking[0], ranking[2]];
  return <StudentPageLayout active="/achievements" title="Thành tích & vinh danh">
    <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#123a79] via-blue-700 to-sky-500 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[34px] border-white/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sky-100">THÀNH TỰU CỦA BẠN</p><h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Ghi nhận từng bước tiến</h2><p className="mt-2 text-sm leading-relaxed text-blue-50">Xem lại những kỹ năng bạn đã rèn luyện, theo dõi mục tiêu và chinh phục cột mốc tiếp theo.</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><Icon name="workspace_premium" className="text-3xl text-amber-300" /><div><p className="text-[10px] font-semibold text-blue-100">XP CỦA BẠN</p><p className="text-xl font-extrabold">1,250 XP</p></div></div></div>
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#213a61]">Bảng vinh danh</h2><p className="mt-1 text-xs text-slate-500">Tôn vinh sự chăm chỉ và tiến bộ của học viên.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{Object.keys(rankings).map((name) => <button type="button" key={name} onClick={() => setPeriod(name)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${period === name ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{name}</button>)}</div></div>
        <div className="mt-7 grid grid-cols-3 items-end gap-2 sm:gap-4">{podium.map((person, index) => { const place = index === 1 ? 1 : index === 0 ? 2 : 3; const height = place === 1 ? 'h-36' : place === 2 ? 'h-28' : 'h-24'; const medal = place === 1 ? 'text-amber-500' : place === 2 ? 'text-slate-400' : 'text-orange-600'; return <div key={person.name} className="flex min-w-0 flex-col items-center text-center"><div className="relative mb-2"><span className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-extrabold ring-4 ring-white shadow-md sm:h-14 sm:w-14 ${person.color}`}>{person.initials}</span><span className={`absolute -right-1 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ${medal}`}><Icon name={place === 1 ? 'workspace_premium' : 'military_tech'} className="text-lg" /></span></div><p className="max-w-full truncate text-xs font-bold text-slate-800 sm:text-sm">{person.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{person.xp.toLocaleString('vi-VN')} XP</p><div className={`mt-3 flex w-full flex-col items-center justify-center rounded-t-2xl bg-gradient-to-b from-blue-50 to-sky-100 ${height}`}><span className="text-2xl font-black text-blue-700">{place}</span><span className="text-[10px] font-semibold text-blue-500">HẠNG</span></div></div>; })}</div>
        <div className="mt-4 rounded-2xl bg-[#f7f9fd] p-2 sm:p-3">{ranking.slice(3).map((person, index) => <div key={person.name} className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3"><span className="w-6 text-center text-xs font-bold text-slate-400">{index + 4}</span><span className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold ${person.color}`}>{person.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{person.name}</p><p className="truncate text-[10px] text-slate-400">{person.school}</p></div><span className="text-xs font-extrabold text-blue-700">{person.xp.toLocaleString('vi-VN')} XP</span></div>)}</div>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#213a61]">Huy hiệu của bạn</h2><p className="mt-1 text-xs text-slate-500">Ghi nhận những kỹ năng bạn đã rèn luyện.</p></div><Icon name="military_tech" className="text-3xl text-amber-500" /></div><div className="mt-4 flex flex-col gap-3">{badges.map((badge) => <div key={badge.title} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${badge.color}`}><Icon name={badge.icon} className="text-[23px]" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-slate-800">{badge.title}</p><span className="text-[10px] font-bold text-blue-700">{badge.progress}</span></div><p className="mt-0.5 text-[10px] text-slate-500">{badge.detail}</p></div></div>)}</div></section>
        <section className="flex min-h-[220px] flex-1 flex-col rounded-[22px] border border-blue-100 bg-gradient-to-br from-white to-sky-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Chặng tiếp theo</p><h2 className="mt-1 text-lg font-extrabold text-[#213a61]">Tiếp tục tích lũy XP</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Hoàn thành bài luyện tập và chia sẻ góc nhìn để tiến gần hơn tới thứ hạng mới.</p><Link to="/learning-path" className="mt-auto inline-flex items-center gap-2 self-start rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800">Xem lộ trình <Icon name="arrow_forward" className="text-sm" /></Link></section>
      </div>
    </section>
  </StudentPageLayout>;
}
