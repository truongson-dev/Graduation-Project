import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { AppIcon as Icon } from '../components/Common/AppIcon';

type Post = { id: number; author: string; initials: string; role: string; time: string; title: string; body: string; options: string[]; votes: number[]; comments: string[] };
type RoomComment = { author: string; initials: string; text: string };
const initialPosts: Post[] = [
  { id: 1, author: 'Bảo Trâm', initials: 'BT', role: 'Sinh viên năm 4 · Ngoại Thương', time: '3 giờ trước', title: 'Khi sếp giao việc mơ hồ, nên chủ động làm nháp hay hỏi lại yêu cầu?', body: 'Nếu hỏi nhiều thì sợ bị đánh giá thiếu chủ động, còn tự đoán có thể khiến kết quả lệch hướng. Bạn sẽ chọn cách nào và vì sao?', options: ['Chủ động làm bản nháp rồi xác nhận', 'Hỏi rõ mục tiêu và thời hạn trước'], votes: [68, 32], comments: ['Mình sẽ xác nhận deadline trước để chủ động sắp xếp.', 'Có thể gửi lại cách hiểu của mình kèm bản nháp ngắn.'] },
  { id: 2, author: 'Quốc Trung', initials: 'QT', role: 'Cựu sinh viên · Bách Khoa TP.HCM', time: '5 giờ trước', title: 'Đồng nghiệp nhận hết công lao trong buổi họp tổng kết: xử lý sao cho khéo?', body: 'Làm thế nào đính chính đóng góp của mình mà vẫn giữ tinh thần hợp tác trong nhóm?', options: ['Trao đổi riêng sau cuộc họp', 'Bổ sung dữ kiện ngay trong buổi họp'], votes: [54, 46], comments: [] },
];

const rooms = [
  { id: 'room-1', topic: 'Làm việc từ xa giúp tăng năng suất?', category: 'KỸ NĂNG LÀM VIỆC', time: 'ĐANG DIỄN RA', people: 8, sideA: 'Ủng hộ', sideB: 'Phản biện', color: 'from-blue-700 to-sky-500' },
  { id: 'room-2', topic: 'Sinh viên có nên đi thực tập từ năm nhất?', category: 'PHÁT TRIỂN SỰ NGHIỆP', time: 'BẮT ĐẦU 20:30', people: 12, sideA: 'Nên đi sớm', sideB: 'Ưu tiên nền tảng', color: 'from-blue-700 to-cyan-500' },
  { id: 'room-3', topic: 'AI trong tuyển dụng: công bằng hay thiên kiến?', category: 'CÔNG NGHỆ & XÃ HỘI', time: 'BẮT ĐẦU 21:00', people: 6, sideA: 'Cơ hội', sideB: 'Rủi ro', color: 'from-teal-700 to-cyan-500' },
];
const initialRoomComments: RoomComment[] = [
  { author: 'Thu Hà', initials: 'TH', text: 'Mình đồng ý với ý về tính linh hoạt, nhất là khi nhóm có quy ước phối hợp rõ ràng.' },
  { author: 'Quốc Trung', initials: 'QT', text: 'Hai bên có thể bổ sung số liệu về năng suất để so sánh khách quan hơn.' },
  { author: 'Minh Anh', initials: 'MA', text: 'Cảm ơn mọi người, đội A xin phản hồi ý này ở lượt tiếp theo.' },
];

export function CommunityPage() {
  const location = useLocation();
  const [tab, setTab] = useState<'discussions' | 'rooms'>(() => new URLSearchParams(location.search).get('tab') === 'rooms' ? 'rooms' : 'discussions');
  const [posts, setPosts] = useState(initialPosts);
  const [votesByPost, setVotesByPost] = useState<Record<number, number>>({});
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [optionDrafts, setOptionDrafts] = useState(['', '']);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [roomComments, setRoomComments] = useState<Record<string, RoomComment[]>>({});
  const [roomCommentDraft, setRoomCommentDraft] = useState('');
  const [roomVotes, setRoomVotes] = useState<Record<string, [number, number]>>({});
  const [roomVoteChoice, setRoomVoteChoice] = useState<Record<string, number>>({});

  const vote = (postId: number, optionIndex: number) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const previous = votesByPost[postId];
    setPosts((current) => current.map((item) => {
      if (item.id !== postId) return item;
      const counts = [...item.votes];
      if (previous !== undefined) counts[previous] = Math.max(0, counts[previous] - 1);
      counts[optionIndex] += 1;
      return { ...item, votes: counts };
    }));
    setVotesByPost((current) => ({ ...current, [postId]: optionIndex }));
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const options = optionDrafts.map((item) => item.trim()).filter(Boolean);
    if (!titleDraft.trim() || !bodyDraft.trim() || options.length < 2) return;
    setPosts((current) => [{ id: Date.now(), author: 'Bạn', initials: 'TS', role: 'Học viên SkillBridge', time: 'Vừa xong', title: titleDraft.trim(), body: bodyDraft.trim(), options, votes: options.map(() => 0), comments: [] }, ...current]);
    setTitleDraft(''); setBodyDraft(''); setOptionDrafts(['', '']); setShowComposer(false); setTab('discussions');
  };

  const submitComment = (postId: number) => {
    if (!commentDraft.trim()) return;
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...post.comments, commentDraft.trim()] } : post));
    setCommentDraft('');
  };

  const submitRoomComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeRoom || !roomCommentDraft.trim()) return;
    setRoomComments((current) => ({
      ...current,
      [activeRoom.id]: [...(current[activeRoom.id] ?? initialRoomComments), { author: 'Bạn', initials: 'HV', text: roomCommentDraft.trim() }],
    }));
    setRoomCommentDraft('');
  };

  const voteRoom = (team: number) => {
    if (!activeRoom) return;
    const previousChoice = roomVoteChoice[activeRoom.id];
    setRoomVotes((current) => {
      const counts: [number, number] = [...(current[activeRoom.id] ?? [18, 14])];
      if (previousChoice !== undefined) counts[previousChoice] = Math.max(0, counts[previousChoice] - 1);
      counts[team] += 1;
      return { ...current, [activeRoom.id]: counts };
    });
    setRoomVoteChoice((current) => ({ ...current, [activeRoom.id]: team }));
  };

  const activeRoom = rooms.find((room) => room.id === roomId);
  const activeRoomVotes: [number, number] = activeRoom ? roomVotes[activeRoom.id] ?? [18, 14] : [0, 0];
  const activeRoomVoteTotal = activeRoomVotes[0] + activeRoomVotes[1];
  const activeRoomComments = activeRoom ? roomComments[activeRoom.id] ?? initialRoomComments : [];
  return <StudentPageLayout active="/community" title="Cộng đồng tranh biện">
    <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#123a79] via-blue-700 to-cyan-500 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
      <div aria-hidden="true" className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" />
      <div className="relative flex flex-wrap items-end justify-between gap-4"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sky-100">CÙNG NHAU LÊN TIẾNG</p><h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Ý tưởng tốt hơn khi được tranh luận</h2><p className="mt-2 text-sm leading-relaxed text-blue-50">Chia sẻ tình huống, bình chọn góc nhìn và gặp gỡ học viên trong những phiên tranh biện trực tuyến.</p></div><button type="button" onClick={() => { setTab('discussions'); setShowComposer(true); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-800 shadow hover:bg-sky-50"><Icon name="edit_square" />Đặt tình huống</button></div>
    </section>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setTab('discussions')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${tab === 'discussions' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Icon name="forum" className="text-base" />Bài tranh biện</button><button type="button" onClick={() => setTab('rooms')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${tab === 'rooms' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Icon name="videocam" className="text-base" />Phòng trực tuyến</button></div>{tab === 'discussions' && <p className="text-xs text-slate-500">{posts.length} chủ đề đang mở</p>}</div>

    {tab === 'discussions' ? <div className="mt-4 w-full">
      <div className="flex flex-col gap-4">
        {showComposer && <form onSubmit={submitPost} className="rounded-[22px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-[#213a61]">Đặt tình huống tranh biện</h3><p className="mt-1 text-xs text-slate-500">Nêu vấn đề rõ ràng và đưa ra hai góc nhìn để mọi người cùng thảo luận.</p></div><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setShowComposer(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Icon name="close" /></button></div><label className="mt-4 block text-xs font-bold text-slate-600">Tiêu đề<textarea required rows={2} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} placeholder="Ví dụ: Có nên bật camera trong mọi cuộc họp trực tuyến?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><label className="mt-3 block text-xs font-bold text-slate-600">Bối cảnh<textarea required rows={3} value={bodyDraft} onChange={(event) => setBodyDraft(event.target.value)} placeholder="Chia sẻ bối cảnh để mọi người có đủ thông tin đưa ra quan điểm..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><div className="mt-3 grid gap-3 sm:grid-cols-2">{optionDrafts.map((option, index) => <label key={index} className="text-xs font-bold text-slate-600">Phương án {index ? 'B' : 'A'}<input required value={option} onChange={(event) => setOptionDrafts((current) => current.map((value, currentIndex) => currentIndex === index ? event.target.value : value))} placeholder={index ? 'Góc nhìn thứ hai' : 'Góc nhìn thứ nhất'} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>)}</div><div className="mt-4 flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800"><Icon name="send" className="text-sm" />Đăng chủ đề</button></div></form>}
        <div className="flex flex-col gap-4">
        {posts.map((post) => {
          const total = post.votes.reduce((sum, value) => sum + value, 0);
          const liked = Boolean(likedPosts[post.id]);
          return <article key={post.id} className="w-full overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4 sm:px-5 sm:pt-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-800">{post.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{post.author}<span className="font-normal text-slate-400"> · {post.role}</span></p><p className="mt-0.5 text-[10px] text-slate-400">{post.time} · <Icon name="public" className="text-xs" /> Công khai</p></div><button type="button" aria-label="Tùy chọn bài viết" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><Icon name="more_horiz" /></button></div>
            <div className="px-4 pb-4 sm:px-5"><h3 className="text-base font-extrabold leading-snug text-[#213a61]">{post.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{post.body}</p>
              <div className="mt-4 rounded-2xl bg-[#f5f8fd] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-700">Bình chọn góc nhìn</p><span className="text-[10px] text-slate-400">{total} lượt bình chọn</span></div><div className="grid gap-2 sm:grid-cols-2">{post.options.map((option, index) => { const count = post.votes[index] ?? 0; const percent = total ? Math.round(count / total * 100) : 0; const chosen = votesByPost[post.id] === index; return <button type="button" key={option} onClick={() => vote(post.id, index)} aria-pressed={chosen} className={`relative min-h-11 overflow-hidden rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${chosen ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}><span className="relative z-10 flex justify-between gap-2"><span>{option}</span><span>{percent}%</span></span><span aria-hidden="true" className="absolute inset-y-0 left-0 bg-blue-100/80 transition-all" style={{ width: `${percent}%` }} /></button>; })}</div></div>
              <div className="mt-3 flex items-center justify-start gap-4 border-y border-slate-100 py-1.5"><button type="button" aria-pressed={liked} onClick={() => setLikedPosts((current) => ({ ...current, [post.id]: !current[post.id] }))} className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${liked ? 'text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Icon name={liked ? 'thumb_up' : 'thumb_up_off_alt'} />{liked ? 'Đã thích' : 'Thích'}</button><button type="button" onClick={() => setCommentingId(commentingId === post.id ? null : post.id)} className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"><Icon name="chat_bubble_outline" />Bình luận · {post.comments.length}</button></div>
              {commentingId === post.id && <div className="flex items-center gap-2 pt-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-800">HV</span><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitComment(post.id); } }} placeholder="Viết bình luận..." className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-blue-300" /><button type="button" onClick={() => submitComment(post.id)} aria-label="Gửi bình luận" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"><Icon name="send" className="text-base" /></button></div>}
            </div>
          </article>;
        })}
      </div>
      </div>
    </div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{rooms.map((room) => <article key={room.id} className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm"><div className={`relative flex min-h-40 flex-col justify-between bg-gradient-to-br ${room.color} p-5 text-white`}><div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold"><span className={`h-2 w-2 rounded-full ${room.time === 'ĐANG DIỄN RA' ? 'animate-pulse bg-rose-300' : 'bg-sky-200'}`} />{room.time}</div><span className="text-[10px] font-bold tracking-[.12em] text-white/75">{room.category}</span><h3 className="max-w-lg pr-20 text-lg font-extrabold leading-snug">{room.topic}</h3><div className="flex items-center gap-2 text-[10px] font-semibold text-white/80"><Icon name="groups" className="text-sm" />{room.people} người đang quan tâm</div></div><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">{room.sideA}</span><span className="rounded-full bg-sky-50 px-3 py-1.5 text-[10px] font-bold text-sky-700">{room.sideB}</span></div><button type="button" onClick={() => setRoomId(room.id)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800"><Icon name="videocam" className="text-base" />Vào phòng</button></div></article>)}</div>}

    {activeRoom && <div role="dialog" aria-modal="true" aria-labelledby="room-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-[#f3f6fb] shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />Tranh biện trực tiếp · Khán giả tham gia</p><h2 id="room-title" className="mt-0.5 truncate text-sm font-extrabold text-[#213a61] sm:text-base">{activeRoom.topic}</h2></div>
          <button type="button" onClick={() => setRoomId(null)} aria-label="Đóng phòng" className="ml-3 rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Icon name="close" /></button>
        </header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_350px]">
          <main className="flex min-w-0 flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-800 to-sky-700 p-5 text-center text-white sm:min-h-64">
                <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] font-bold">ĐỘI A · {activeRoom.sideA}</span><span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-bold"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />ĐANG NÓI</span>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 bg-white/15 text-xl font-extrabold shadow-lg">MA</span><p className="mt-2 text-sm font-bold">Minh Anh</p><p className="text-[11px] text-blue-100">Trình bày luận điểm · Lượt 2</p><p className="mt-3 max-w-sm text-xs leading-relaxed text-white/90">“{activeRoom.sideA} có thể tạo cơ hội thử sức sớm, học từ công việc thực tế và hiểu rõ hơn hướng phát triển của mình.”</p>
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Icon name="mic" /></span>
              </section>
              <section className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-blue-900 to-cyan-800 p-5 text-center text-white sm:min-h-64">
                <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] font-bold">ĐỘI B · {activeRoom.sideB}</span><span className="absolute right-3 top-3 rounded-full bg-black/25 px-2 py-1 text-[9px] font-semibold text-white/75">SẮP ĐẾN LƯỢT</span>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 bg-white/10 text-xl font-extrabold">ĐH</span><p className="mt-2 text-sm font-bold">Đức Huy</p><p className="text-[11px] text-blue-100">Chuẩn bị phản biện</p><p className="mt-3 max-w-sm text-xs leading-relaxed text-white/85">“Ưu tiên nền tảng giúp người học có kiến thức vững trước khi chọn môi trường thực tập phù hợp.”</p>
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Icon name="mic_off" /></span>
              </section>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="flex items-center gap-2 text-xs font-bold text-slate-700"><Icon name="schedule" className="text-blue-700" />Vòng 2 · Phản biện <span className="font-mono text-slate-500">01:42</span></span><div className="flex items-center gap-2"><button type="button" aria-pressed={micOn} onClick={() => setMicOn((value) => !value)} className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${micOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}><Icon name={micOn ? 'mic' : 'mic_off'} />{micOn ? 'Tắt mic' : 'Bật mic'}</button><button type="button" aria-pressed={cameraOn} onClick={() => setCameraOn((value) => !value)} className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${cameraOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}><Icon name={cameraOn ? 'videocam' : 'videocam_off'} />{cameraOn ? 'Tắt camera' : 'Bật camera'}</button></div></div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-[#213a61]">Khán giả bình chọn đội thắng</h3><p className="mt-1 text-[11px] text-slate-500">Bạn có thể đổi lựa chọn trước khi phiên kết thúc.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{activeRoomVoteTotal} lượt bình chọn</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{[activeRoom.sideA, activeRoom.sideB].map((side, index) => { const percent = activeRoomVoteTotal ? Math.round(activeRoomVotes[index] / activeRoomVoteTotal * 100) : 0; const chosen = roomVoteChoice[activeRoom.id] === index; return <button key={side} type="button" onClick={() => voteRoom(index)} aria-pressed={chosen} className={`relative overflow-hidden rounded-xl border px-3 py-3 text-left ${chosen ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}><span className="relative z-10 flex items-center justify-between gap-2 text-xs font-bold text-slate-700"><span>Đội {index === 0 ? 'A' : 'B'} · {side}</span><span>{percent}%</span></span><span aria-hidden="true" className="absolute inset-y-0 left-0 bg-blue-100/80" style={{ width: `${percent}%` }} />{chosen && <span className="relative z-10 mt-1 block text-[10px] font-semibold text-blue-700">Bạn đã bình chọn</span>}</button>; })}</div></section>
          </main>
          <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h3 className="text-sm font-extrabold text-[#213a61]">Bình luận trực tiếp</h3><p className="mt-0.5 text-[10px] text-slate-400">{activeRoom.people} người đang theo dõi</p></div><Icon name="forum" className="text-xl text-blue-700" /></div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">{activeRoomComments.map((comment, index) => <div key={`${comment.author}-${index}`} className="flex items-start gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-extrabold text-sky-800">{comment.initials}</span><div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold text-slate-700">{comment.author}</p><p className="mt-0.5 text-xs leading-relaxed text-slate-600">{comment.text}</p></div></div>)}<p className="flex items-center gap-1.5 text-[10px] text-emerald-700"><Icon name="verified_user" className="text-sm" />Quản trị viên đang điều phối phiên</p></div>
            <form onSubmit={submitRoomComment} className="flex items-center gap-2 border-t border-slate-100 p-3"><input value={roomCommentDraft} onChange={(event) => setRoomCommentDraft(event.target.value)} placeholder="Viết bình luận..." aria-label="Bình luận trong phòng" className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-blue-300" /><button type="submit" aria-label="Gửi bình luận" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"><Icon name="send" className="text-base" /></button></form>
          </aside>
        </div>
      </div>
    </div>}
  </StudentPageLayout>;
}
