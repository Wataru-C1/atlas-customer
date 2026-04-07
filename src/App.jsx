import { useState, useEffect } from "react";

// ─── Supabase Config ───
const SUPABASE_URL = "https://nvzxehjvamwkmeisantd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52enhlaGp2YW13a21laXNhbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDI5MDYsImV4cCI6MjA5MTA3ODkwNn0.KZuq36rEfx3QiavwV3Z4CwT9bpwwOBBg9WxX_1WWSYY";

const headers = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function fetchReservations() {
  return supaFetch("reservations?select=*&order=date.asc,time.asc");
}
async function fetchSettings() {
  const rows = await supaFetch("settings?id=eq.1&select=data");
  return rows[0]?.data || null;
}
async function insertReservation(r) {
  return supaFetch("reservations", {
    method: "POST",
    body: JSON.stringify({
      date: r.date, time: r.time, name: r.name, phone: r.phone,
      menu_id: r.menuId, menu_name: r.menuName, status: "confirmed",
    }),
  });
}

const DEFAULT_SETTINGS = {
  schedule: {
    0: ["09:00-11:00","11:00-13:00","14:00-16:00","16:00-18:00","18:00-20:00","20:00-22:00"],
    1: ["18:00-20:00","20:00-22:00"], 2: ["18:00-20:00","20:00-22:00"],
    3: ["18:00-20:00","20:00-22:00"], 4: ["18:00-20:00","20:00-22:00"],
    5: ["18:00-20:00","20:00-22:00"], 6: ["18:00-20:00","20:00-22:00"],
  },
  menuItems: [
    { id: "1", name: "検査・測定", duration: 30, price: 3000 },
    { id: "2", name: "上部頚椎調整", duration: 60, price: 4000 },
    { id: "3", name: "初診", duration: 60, price: 3000 },
  ],
};

const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS_JP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const isSameDay = (a, b) => fmt(a) === fmt(b);

const theme = {
  navy: "#1a2744", navyLight: "#243352", navyDark: "#111b30",
  accent: "#c9a96e", accentLight: "#dfc89e",
  white: "#f8f6f1", gray: "#8a9ab5", grayLight: "#c5cdd9",
  red: "#d45d5d", green: "#5daa68", bg: "#f0ede6",
};

const ChevronLeft = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 4l-6 6 6 6"/></svg>;
const ChevronRight = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 4l6 6-6 6"/></svg>;
const CalendarIcon = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 8h14M7 2v4M13 2v4"/></svg>;
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8"/><path d="M10 5v5l3 3"/></svg>;
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="7" r="4"/><path d="M3 19c0-4 3-7 7-7s7 3 7 7"/></svg>;
const PhoneIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4c0-1 1-2 2-2h2l2 4-2 2c1 3 3 5 5 6l2-2 4 2v2c0 1-1 2-2 2C8 18 2 12 2 5c0 0 0-1 1-1z"/></svg>;
const CheckIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.green} strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>;

export default function App() {
  const [reservations, setReservations] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [bookedRes, setBookedRes] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([fetchReservations(), fetchSettings()]);
        setReservations(r);
        const st = s || DEFAULT_SETTINGS;
        setSettings(st);
        setSelectedMenu(st.menuItems[0]?.id || "");
      } catch (e) {
        console.error(e);
        setError("データの読み込みに失敗しました");
      }
      setLoaded(true);
    })();
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);

  const handleBook = async () => {
    setSubmitting(true);
    try {
      const menu = settings.menuItems.find((m) => m.id === selectedMenu);
      const res = { date: fmt(selectedDate), time: selectedTime, name, phone, menuId: selectedMenu, menuName: menu?.name || "" };
      const inserted = await insertReservation(res);
      setBookedRes({ ...res, id: inserted[0]?.id || "—" });
      setReservations([...reservations, inserted[0]]);
      setStep(3);
    } catch (e) {
      console.error(e);
      alert("予約に失敗しました。もう一度お試しください。");
    }
    setSubmitting(false);
  };

  const resetAll = () => { setStep(0); setSelectedDate(null); setSelectedTime(null); setName(""); setPhone(""); setBookedRes(null); };
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear-1); } else setCalMonth(calMonth-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear+1); } else setCalMonth(calMonth+1); };

  if (!loaded) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:theme.bg }}>
      <div style={{ textAlign:"center", color:theme.navy }}>
        <img src="/logo.jpg" alt="ATLAS" style={{ width:64, height:64, borderRadius:"50%", border:`2px solid ${theme.accent}`, objectFit:"cover", marginBottom:8 }} />
        <div style={{ fontSize:28, fontWeight:700, letterSpacing:4, fontFamily:"'Georgia',serif" }}>ATLAS</div>
        <div style={{ fontSize:12, color:theme.gray, marginTop:8 }}>読み込み中...</div>
      </div>
    </div>
  );
  if (error) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:theme.bg }}>
      <div style={{ textAlign:"center", color:theme.red, fontSize:14 }}>{error}</div>
    </div>
  );

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const isClosedDay = (d) => { const ds = settings.schedule?.[new Date(calYear, calMonth, d).getDay()]; return !ds || ds.length === 0; };
  const isPast = (d) => { const date = new Date(calYear, calMonth, d); date.setHours(0,0,0,0); return date < today; };
  const getSlots = () => {
    if (!selectedDate) return [];
    const daySlots = settings.schedule?.[selectedDate.getDay()] || [];
    const dateStr = fmt(selectedDate);
    const now = new Date();
    return daySlots.map((slot) => {
      const [h, m] = slot.split("-")[0].split(":").map(Number);
      const isBooked = reservations.some((r) => r.date === dateStr && r.time === slot && r.status !== "cancelled");
      let isPastTime = false;
      if (isSameDay(selectedDate, now)) { isPastTime = h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()); }
      return { time: slot, booked: isBooked, pastTime: isPastTime };
    });
  };

  return (
    <div style={{ minHeight:"100vh", background:theme.bg, fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif" }}>
      <header style={{ background:`linear-gradient(135deg, ${theme.navy} 0%, ${theme.navyLight} 100%)`, padding:"16px 20px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 2px 12px rgba(26,39,68,0.3)" }}>
        <img src="/logo.jpg" alt="ATLAS" style={{ width:40, height:40, borderRadius:"50%", border:`2px solid ${theme.accent}`, objectFit:"cover" }} />
        <div>
          <div style={{ color:theme.white, fontSize:16, fontWeight:700, letterSpacing:3, fontFamily:"'Georgia',serif" }}>ATLAS</div>
          <div style={{ color:theme.accentLight, fontSize:9, letterSpacing:1.5, marginTop:-1 }}>上部頸椎専門 ｜ ご予約</div>
        </div>
      </header>

      <div style={{ background:`${theme.accent}18`, borderBottom:`1px solid ${theme.accent}30`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <PhoneIcon />
        <span style={{ fontSize:12, color:theme.navy, fontWeight:500 }}>
          出張施術をご希望の方は <a href="tel:070-9080-1454" style={{ fontWeight:700, color:theme.accent, textDecoration:"none" }}>070-9080-1454</a> までお電話ください
        </span>
      </div>

      {step === 0 && (
        <div style={{ padding:"20px 16px", maxWidth:440, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <h2 style={{ color:theme.navy, fontSize:18, fontWeight:700, margin:0 }}>ご予約日を選択</h2>
            <p style={{ color:theme.gray, fontSize:12, margin:"4px 0 0" }}>ご希望の日付をタップしてください</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, padding:"0 4px" }}>
            <button onClick={prevMonth} style={{ background:"none", border:"none", cursor:"pointer", color:theme.navy, padding:4 }}><ChevronLeft /></button>
            <span style={{ fontSize:15, fontWeight:600, color:theme.navy }}>{calYear}年 {MONTHS_JP[calMonth]}</span>
            <button onClick={nextMonth} style={{ background:"none", border:"none", cursor:"pointer", color:theme.navy, padding:4 }}><ChevronRight /></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {DAYS_JP.map((d,i) => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, padding:"4px 0", color:i===0?theme.red:i===6?"#4a7fb5":theme.gray }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {calendarDays.map((d,i) => {
              if (!d) return <div key={`e${i}`} />;
              const closed = isClosedDay(d); const past = isPast(d); const disabled = closed || past;
              const dow = new Date(calYear, calMonth, d).getDay();
              return (
                <button key={d} disabled={disabled} onClick={() => { setSelectedDate(new Date(calYear, calMonth, d)); setStep(1); }}
                  style={{ aspectRatio:"1", border:"1px solid transparent", borderRadius:10, background:disabled?"#e8e5df":"#fff", color:disabled?"#bbb":dow===0?theme.red:dow===6?"#4a7fb5":theme.navy, fontSize:14, fontWeight:500, cursor:disabled?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:disabled?"none":"0 1px 3px rgba(0,0,0,0.06)" }}
                >{d}</button>
              );
            })}
          </div>
          <div style={{ marginTop:16, display:"flex", gap:12, justifyContent:"center", fontSize:11, color:theme.gray }}>
            <span>● 選択可能</span><span style={{ color:"#bbb" }}>● 定休日/過去</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding:"20px 16px", maxWidth:440, margin:"0 auto" }}>
          <button onClick={() => setStep(0)} style={{ background:"none", border:"none", color:theme.accent, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:12, padding:0 }}><ChevronLeft /> 日付を変更</button>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:theme.navy, color:theme.white, padding:"6px 16px", borderRadius:20, fontSize:13, fontWeight:600 }}>
              <CalendarIcon />{selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{DAYS_JP[selectedDate.getDay()]}）
            </div>
            <h2 style={{ color:theme.navy, fontSize:18, fontWeight:700, margin:"12px 0 0" }}>お時間を選択</h2>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:theme.gray, fontWeight:600, display:"block", marginBottom:6 }}>メニュー</label>
            <select value={selectedMenu} onChange={(e) => setSelectedMenu(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${theme.grayLight}`, fontSize:14, color:theme.navy, background:"#fff", outline:"none" }}>
              {settings.menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.duration}分 / ¥{m.price.toLocaleString()}）</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
            {getSlots().map((s) => (
              <button key={s.time} disabled={s.booked||s.pastTime} onClick={() => { setSelectedTime(s.time); setStep(2); }}
                style={{ padding:"14px 0", borderRadius:10, fontSize:15, fontWeight:600, border:s.booked||s.pastTime?"none":`1px solid ${theme.grayLight}`, background:s.booked?theme.red+"15":s.pastTime?"#e8e5df":"#fff", color:s.booked?theme.red:s.pastTime?"#bbb":theme.navy, cursor:s.booked||s.pastTime?"default":"pointer", boxShadow:s.booked||s.pastTime?"none":"0 1px 4px rgba(0,0,0,0.06)" }}>
                {s.time}{s.booked && <div style={{ fontSize:9, marginTop:2, fontWeight:400 }}>✕ 予約済</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (() => {
        const menu = settings.menuItems.find((m) => m.id === selectedMenu);
        const canSubmit = name.trim().length > 0 && phone.trim().length >= 8 && !submitting;
        return (
          <div style={{ padding:"20px 16px", maxWidth:440, margin:"0 auto" }}>
            <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:theme.accent, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:12, padding:0 }}><ChevronLeft /> 時間を変更</button>
            <div style={{ background:theme.navy, borderRadius:14, padding:16, marginBottom:20, color:theme.white }}>
              <div style={{ fontSize:11, color:theme.accentLight, fontWeight:600, marginBottom:8, letterSpacing:1 }}>ご予約内容</div>
              <div style={{ display:"flex", gap:20, fontSize:13 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><CalendarIcon /> {selectedDate.getMonth()+1}/{selectedDate.getDate()}（{DAYS_JP[selectedDate.getDay()]}）</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><ClockIcon /> {selectedTime}</div>
              </div>
              {menu && <div style={{ marginTop:8, fontSize:12, color:theme.grayLight }}>{menu.name}（{menu.duration}分）</div>}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:theme.gray, fontWeight:600, display:"flex", alignItems:"center", gap:4, marginBottom:6 }}><UserIcon /> お名前 <span style={{ color:theme.red }}>*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${theme.grayLight}`, fontSize:15, color:theme.navy, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, color:theme.gray, fontWeight:600, display:"flex", alignItems:"center", gap:4, marginBottom:6 }}><PhoneIcon /> 電話番号 <span style={{ color:theme.red }}>*</span></label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" type="tel" style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${theme.grayLight}`, fontSize:15, color:theme.navy, outline:"none", boxSizing:"border-box" }} />
            </div>
            <button onClick={handleBook} disabled={!canSubmit}
              style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:canSubmit?`linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`:"#ddd", color:canSubmit?theme.navyDark:"#999", fontSize:16, fontWeight:700, cursor:canSubmit?"pointer":"default", boxShadow:canSubmit?"0 4px 14px rgba(201,169,110,0.4)":"none", letterSpacing:1 }}>
              {submitting ? "送信中..." : "予約を確定する"}
            </button>
          </div>
        );
      })()}

      {step === 3 && bookedRes && (
        <div style={{ padding:"40px 16px", maxWidth:440, margin:"0 auto", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:theme.green+"18", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><CheckIcon /></div>
          <h2 style={{ color:theme.navy, fontSize:20, fontWeight:700, margin:"0 0 8px" }}>ご予約ありがとうございます</h2>
          <p style={{ color:theme.gray, fontSize:13, margin:"0 0 24px" }}>以下の内容で予約を承りました</p>
          <div style={{ background:"#fff", borderRadius:14, padding:20, textAlign:"left", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:12, color:theme.gray, marginBottom:4 }}>日時</div>
            <div style={{ fontSize:15, color:theme.navy, fontWeight:600, marginBottom:12 }}>{bookedRes.date} {bookedRes.time}</div>
            <div style={{ fontSize:12, color:theme.gray, marginBottom:4 }}>メニュー</div>
            <div style={{ fontSize:15, color:theme.navy, fontWeight:600, marginBottom:12 }}>{bookedRes.menuName}</div>
            <div style={{ fontSize:12, color:theme.gray, marginBottom:4 }}>お名前</div>
            <div style={{ fontSize:15, color:theme.navy, fontWeight:600, marginBottom:12 }}>{bookedRes.name}</div>
            <div style={{ fontSize:12, color:theme.gray, marginBottom:4 }}>予約番号</div>
            <div style={{ fontSize:13, color:theme.accent, fontWeight:600, fontFamily:"monospace" }}>{bookedRes.id}</div>
          </div>
          <button onClick={resetAll} style={{ marginTop:24, padding:"12px 32px", borderRadius:10, border:`1px solid ${theme.navy}`, background:"transparent", color:theme.navy, fontSize:14, fontWeight:600, cursor:"pointer" }}>トップに戻る</button>
        </div>
      )}
    </div>
  );
}
