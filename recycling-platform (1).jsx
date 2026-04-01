import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════
//  CONSTANTS & MOCK DATA
// ═══════════════════════════════════════════════
const MATERIALS = [
  { id: "plastic",  label: "بلاستك",   emoji: "🧴", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  { id: "carton",   label: "كارتون",   emoji: "📦", color: "#92400E", bg: "#FFFBEB", border: "#FCD34D" },
  { id: "oil",      label: "زيوت",     emoji: "🛢️", color: "#C2410C", bg: "#FFF7ED", border: "#FDBA74" },
  { id: "aluminum", label: "ألمنيوم",  emoji: "⚙️", color: "#4B5563", bg: "#F9FAFB", border: "#D1D5DB" },
];

const getMat = (id) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];

const STATUS_MAP = {
  pending:   { label: "بانتظار المصنع",    color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
  scheduled: { label: "مجدول للاستلام",    color: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" },
  delivered: { label: "بانتظار تأكيدك",   color: "#7C3AED", bg: "#F5F3FF", dot: "#8B5CF6" },
  confirmed: { label: "تم التأكيد ✓",     color: "#065F46", bg: "#ECFDF5", dot: "#10B981" },
  reported:  { label: "تم الإبلاغ ⚠️",    color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
};

const INIT_USERS = {
  restaurants: [
    { id: "r1", name: "مطعم الشرق",   email: "r@r.com",  password: "123", phone: "07701111111" },
    { id: "r2", name: "مطعم النخيل",  email: "r2@r.com", password: "123", phone: "07702222222" },
  ],
  factories: [
    { id: "f1", name: "مصنع الخليج للتدوير", email: "f@f.com", password: "123", phone: "07703333333" },
  ],
};

const INIT_SHIPMENTS = [
  {
    id: "s1", restaurantId: "r1", restaurantName: "مطعم الشرق",
    materialType: "plastic", weight: 80, unit: "kg",
    status: "confirmed", pickupTime: "2026-03-30T10:00",
    actualWeight: 80, restaurantConfirmed: "confirmed",
    photo: null, createdAt: "2026-03-28T08:00",
  },
  {
    id: "s2", restaurantId: "r2", restaurantName: "مطعم النخيل",
    materialType: "aluminum", weight: 45, unit: "kg",
    status: "delivered", pickupTime: "2026-04-01T14:00",
    actualWeight: 40, restaurantConfirmed: null,
    photo: null, createdAt: "2026-03-30T09:00",
  },
  {
    id: "s3", restaurantId: "r1", restaurantName: "مطعم الشرق",
    materialType: "oil", weight: 30, unit: "L",
    status: "scheduled", pickupTime: "2026-04-02T11:00",
    actualWeight: null, restaurantConfirmed: null,
    photo: null, createdAt: "2026-04-01T07:00",
  },
  {
    id: "s4", restaurantId: "r2", restaurantName: "مطعم النخيل",
    materialType: "carton", weight: 60, unit: "kg",
    status: "pending", pickupTime: null,
    actualWeight: null, restaurantConfirmed: null,
    photo: null, createdAt: "2026-04-01T06:30",
  },
  {
    id: "s5", restaurantId: "r1", restaurantName: "مطعم الشرق",
    materialType: "aluminum", weight: 20, unit: "kg",
    status: "reported", pickupTime: "2026-03-29T10:00",
    actualWeight: 14, restaurantConfirmed: "reported",
    photo: null, createdAt: "2026-03-27T08:00",
  },
];

let _id = 100;
const uid = () => `ship_${++_id}`;

// ═══════════════════════════════════════════════
//  TINY UI ATOMS
// ═══════════════════════════════════════════════
function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const base = {
    border: "none", borderRadius: 14, padding: "14px 20px",
    fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all .15s", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 8, ...style,
  };
  const variants = {
    primary: { background: disabled ? "#D1D5DB" : "#059669", color: "white", boxShadow: disabled ? "none" : "0 4px 14px rgba(5,150,105,.35)" },
    blue:    { background: disabled ? "#D1D5DB" : "#2563EB", color: "white", boxShadow: disabled ? "none" : "0 4px 14px rgba(37,99,235,.35)" },
    danger:  { background: "#DC2626", color: "white", boxShadow: "0 4px 14px rgba(220,38,38,.35)" },
    ghost:   { background: "#F3F4F6", color: "#374151", boxShadow: "none" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontWeight: 700, color: "#374151", marginBottom: 8, fontSize: 14 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", border: "2px solid #E5E7EB", borderRadius: 12,
        padding: "13px 16px", fontSize: 15, boxSizing: "border-box",
        outline: "none", fontFamily: "inherit", color: "#1F2937",
        background: "#FAFAFA", transition: "border-color .2s",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#059669")}
      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
    />
  );
}

function Badge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20,
      padding: "4px 12px", fontSize: 12, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

function Modal({ onClose, children, title }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end",
        justifyContent: "center", zIndex: 200, padding: "0 0 0 0",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        dir="rtl"
        style={{
          background: "white", borderRadius: "28px 28px 0 0",
          padding: "28px 24px 36px", width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -20px 60px rgba(0,0,0,.2)",
          animation: "slideUp .25s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", fontSize: 18, color: "#6B7280" }}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CenteredModal({ onClose, children, title }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 200, padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div dir="rtl" style={{
        background: "white", borderRadius: 24, padding: 32,
        width: "100%", maxWidth: 420, boxShadow: "0 30px 80px rgba(0,0,0,.2)",
        animation: "fadeIn .2s ease",
      }}>
        <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800, color: "#111827" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ color: "#6B7280", fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 700, color: accent || "#111827", fontSize: 15 }}>{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: bg || "white", borderRadius: 16, padding: "18px 14px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: color || "#111827" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("landing");
  const [authRole, setAuthRole] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState(INIT_USERS);
  const [shipments, setShipments] = useState(INIT_SHIPMENTS);

  // Auth form
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [authErr, setAuthErr] = useState("");

  // Restaurant: collection flow
  const [showCollect, setShowCollect] = useState(false);
  const [cStep, setCStep] = useState(1);
  const [cMat, setCMat] = useState(null);
  const [cWeight, setCWeight] = useState("");
  const [cUnit, setCUnit] = useState("kg");
  const [cPhoto, setCPhoto] = useState(null);
  const fileRef = useRef();

  // Factory modals
  const [pickupModal, setPickupModal] = useState(null);
  const [pickupTime, setPickupTime] = useState("");
  const [weightModal, setWeightModal] = useState(null);
  const [driverWeight, setDriverWeight] = useState("");

  // ── AUTH ─────────────────────────────────────
  const doLogin = () => {
    setAuthErr("");
    if (form.email === "admin@admin.com" && form.password === "admin") {
      setCurrentUser({ id: "admin", type: "admin", name: "الإدارة" });
      setPage("admin"); return;
    }
    const pool = authRole === "restaurant" ? users.restaurants : users.factories;
    const u = pool.find((x) => x.email === form.email && x.password === form.password);
    if (!u) { setAuthErr("البريد الإلكتروني أو كلمة المرور غير صحيحة"); return; }
    setCurrentUser({ ...u, type: authRole });
    setPage(authRole === "restaurant" ? "restaurant" : "factory");
  };

  const doRegister = () => {
    if (!form.name || !form.email || !form.password) { setAuthErr("يرجى تعبئة جميع الحقول"); return; }
    const newU = { id: uid(), ...form };
    const key = authRole === "restaurant" ? "restaurants" : "factories";
    setUsers((p) => ({ ...p, [key]: [...p[key], newU] }));
    setCurrentUser({ ...newU, type: authRole });
    setPage(authRole === "restaurant" ? "restaurant" : "factory");
  };

  const logout = () => { setCurrentUser(null); setPage("landing"); setForm({ name: "", email: "", password: "", phone: "" }); };

  // ── RESTAURANT ACTIONS ────────────────────────
  const openCollect = () => { setShowCollect(true); setCStep(1); setCMat(null); setCWeight(""); setCUnit("kg"); setCPhoto(null); };

  const submitCollection = () => {
    if (!cMat || !cWeight) return;
    const s = {
      id: uid(), restaurantId: currentUser.id, restaurantName: currentUser.name,
      materialType: cMat, weight: parseFloat(cWeight), unit: cUnit,
      status: "pending", pickupTime: null, actualWeight: null,
      restaurantConfirmed: null, photo: cPhoto, createdAt: new Date().toISOString(),
    };
    setShipments((p) => [s, ...p]);
    setShowCollect(false);
  };

  const respondToWeight = (id, response) => {
    setShipments((p) => p.map((s) =>
      s.id === id ? { ...s, restaurantConfirmed: response, status: response === "confirmed" ? "confirmed" : "reported" } : s
    ));
  };

  // ── FACTORY ACTIONS ───────────────────────────
  const confirmPickup = () => {
    if (!pickupTime) return;
    setShipments((p) => p.map((s) =>
      s.id === pickupModal.id ? { ...s, status: "scheduled", pickupTime } : s
    ));
    setPickupModal(null); setPickupTime("");
  };

  const confirmWeight = () => {
    if (!driverWeight) return;
    setShipments((p) => p.map((s) =>
      s.id === weightModal.id ? { ...s, status: "delivered", actualWeight: parseFloat(driverWeight) } : s
    ));
    setWeightModal(null); setDriverWeight("");
  };

  // ── DERIVED ───────────────────────────────────
  const myShipments = currentUser?.type === "restaurant"
    ? shipments.filter((s) => s.restaurantId === currentUser.id)
    : [];

  const pendingConfirm = myShipments.filter((s) => s.status === "delivered" && !s.restaurantConfirmed);
  const pendingFactory  = shipments.filter((s) => s.status === "pending");
  const scheduledFactory= shipments.filter((s) => s.status === "scheduled");
  const reportsFactory  = shipments.filter((s) => s.status === "reported");

  const totalKg = shipments.filter((s) => s.actualWeight).reduce((sum, s) => sum + s.actualWeight, 0);

  // ════════════════════════════════════════════
  //  LANDING PAGE
  // ════════════════════════════════════════════
  if (page === "landing") return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "linear-gradient(160deg,#022c22 0%,#064e3b 50%,#065f46 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif", padding: 24 }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .role-card:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 16px 40px rgba(0,0,0,.25) !important; }
        .role-card { transition: all .2s ease !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 460, animation: "slideUp .5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: 72, animation: "float 3s ease-in-out infinite", display: "inline-block" }}>♻️</div>
          <h1 style={{ color: "white", fontSize: 34, fontWeight: 900, margin: "12px 0 6px", letterSpacing: "-1px" }}>
            منصة التجميع
          </h1>
          <p style={{ color: "#6EE7B7", fontSize: 15, margin: 0, opacity: .85 }}>
            نظام ذكي لإدارة المواد القابلة لإعادة التدوير
          </p>
        </div>

        {/* Role Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { role: "restaurant", emoji: "🍽️", title: "دخول المطعم", sub: "طلب تجميع المواد وتتبع الشحنات", border: "#10B981" },
            { role: "factory",   emoji: "🏭", title: "دخول المصنع",  sub: "استلام الشحنات وتأكيد الأوزان",  border: "#3B82F6" },
          ].map(({ role, emoji, title, sub, border }) => (
            <button
              key={role}
              className="role-card"
              onClick={() => { setAuthRole(role); setAuthMode("login"); setAuthErr(""); setForm({ name:"",email:"",password:"",phone:"" }); setPage("auth"); }}
              style={{
                background: "rgba(255,255,255,.07)", border: `1.5px solid ${border}40`,
                borderRadius: 20, padding: "20px 24px", display: "flex",
                alignItems: "center", gap: 16, cursor: "pointer", textAlign: "right",
                boxShadow: "0 4px 20px rgba(0,0,0,.2)",
              }}
            >
              <div style={{ width: 56, height: 56, background: `${border}20`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, border: `1.5px solid ${border}40` }}>{emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "white" }}>{title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.55)" }}>{sub}</p>
              </div>
              <span style={{ color: border, fontSize: 22, opacity: .7 }}>←</span>
            </button>
          ))}

          <button
            onClick={() => {
              setAuthRole("admin");
              setForm({ name: "", email: "admin@admin.com", password: "admin", phone: "" });
              setPage("auth"); setAuthMode("login");
            }}
            style={{ background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "14px 20px", color: "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
          >
            🔐 دخول الإدارة
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  //  AUTH PAGE
  // ════════════════════════════════════════════
  if (page === "auth") {
    const isAdmin = authRole === "admin";
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 28, padding: 36, width: "100%", maxWidth: 430, boxShadow: "0 24px 70px rgba(0,0,0,.1)", animation: "fadeIn .3s ease" }}>
          {/* Back */}
          <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            ← رجوع
          </button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 52 }}>{isAdmin ? "🔐" : authRole === "restaurant" ? "🍽️" : "🏭"}</div>
            <h2 style={{ margin: "12px 0 4px", fontSize: 24, fontWeight: 900, color: "#111827" }}>
              {isAdmin ? "دخول الإدارة" : authMode === "login" ? (authRole === "restaurant" ? "تسجيل دخول المطعم" : "تسجيل دخول المصنع") : (authRole === "restaurant" ? "إنشاء حساب مطعم" : "إنشاء حساب مصنع")}
            </h2>
          </div>

          {/* Toggle */}
          {!isAdmin && (
            <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 14, padding: 4, marginBottom: 28 }}>
              {["login","register"].map((m) => (
                <button key={m} onClick={() => { setAuthMode(m); setAuthErr(""); }}
                  style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", transition: "all .2s",
                    background: authMode === m ? "white" : "transparent",
                    color: authMode === m ? "#065F46" : "#9CA3AF",
                    boxShadow: authMode === m ? "0 2px 8px rgba(0,0,0,.1)" : "none",
                  }}>
                  {m === "login" ? "تسجيل دخول" : "إنشاء حساب"}
                </button>
              ))}
            </div>
          )}

          {/* Fields */}
          {authMode === "register" && !isAdmin && (
            <Field label={authRole === "restaurant" ? "اسم المطعم" : "اسم المصنع"}>
              <TextInput value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder={authRole === "restaurant" ? "مطعم الشرق" : "مصنع الخليج"} />
            </Field>
          )}
          <Field label="البريد الإلكتروني">
            <TextInput value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} placeholder="example@email.com" type="email" />
          </Field>
          <Field label="كلمة المرور">
            <TextInput value={form.password} onChange={(v) => setForm((p) => ({ ...p, password: v }))} placeholder="••••••••" type="password" />
          </Field>
          {authMode === "register" && !isAdmin && (
            <Field label="رقم الهاتف">
              <TextInput value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="07701234567" type="tel" />
            </Field>
          )}

          {authErr && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", color: "#B91C1C", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
              {authErr}
            </div>
          )}

          <Btn onClick={authMode === "login" || isAdmin ? doLogin : doRegister} style={{ width: "100%", marginBottom: 8, padding: "16px" }}>
            {authMode === "login" || isAdmin ? "دخول" : "إنشاء الحساب"}
          </Btn>

          {!isAdmin && (
            <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, margin: "12px 0 0" }}>
              للتجربة: بريد {authRole === "restaurant" ? "r@r.com" : "f@f.com"} — كلمة المرور: 123
            </p>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  RESTAURANT DASHBOARD
  // ════════════════════════════════════════════
  if (page === "restaurant") return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F8FAF8", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: "linear-gradient(135deg,#064e3b,#059669)", padding: "0 0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0", maxWidth: 680, margin: "0 auto" }}>
          <div>
            <p style={{ margin: 0, color: "#6EE7B7", fontSize: 12 }}>مرحباً،</p>
            <h2 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 900 }}>{currentUser.name}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "5px 12px", color: "white", fontSize: 12, fontWeight: 600 }}>🍽️ مطعم</div>
            <button onClick={logout} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "white", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>خروج</button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "flex", gap: 12, padding: "18px 20px 0", maxWidth: 680, margin: "0 auto", overflowX: "auto" }}>
          {[
            { label: "إجمالي الطلبات", val: myShipments.length, color: "#6EE7B7" },
            { label: "مؤكدة", val: myShipments.filter(s=>s.status==="confirmed").length, color: "#34D399" },
            { label: "بانتظار التأكيد", val: pendingConfirm.length, color: "#FCD34D" },
          ].map((x,i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.12)", borderRadius: 14, padding: "12px 18px", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: x.color }}>{x.val}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.65)" }}>{x.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>
        {/* Weight Confirmation Alerts */}
        {pendingConfirm.map((s) => {
          const mat = getMat(s.materialType);
          const diff = s.actualWeight !== s.weight;
          return (
            <div key={s.id} style={{ background: "white", border: "2px solid #7C3AED", borderRadius: 20, padding: 22, marginBottom: 16, boxShadow: "0 8px 30px rgba(124,58,237,.15)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, background: "#F5F3FF", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📬</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: "#1F2937", fontSize: 16 }}>تأكيد الوزن المستلم</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>المصنع أكد استلام شحنتك</p>
                </div>
              </div>

              <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <InfoRow label="نوع المادة" value={`${mat.emoji} ${mat.label}`} accent={mat.color} />
                <InfoRow label="الوزن الذي أرسلته" value={`${s.weight} ${s.unit}`} />
                <InfoRow label="الوزن المؤكد من المصنع" value={`${s.actualWeight} ${s.unit}`} accent={diff ? "#DC2626" : "#059669"} />
              </div>

              {diff && (
                <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "8px 14px", marginBottom: 14, color: "#B91C1C", fontSize: 13, fontWeight: 600 }}>
                  ⚠️ يوجد فرق في الوزن: {Math.abs(s.weight - s.actualWeight)} {s.unit}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={() => respondToWeight(s.id, "confirmed")} style={{ flex: 1 }}>✅ تأكيد</Btn>
                <Btn onClick={() => respondToWeight(s.id, "reported")} variant="danger" style={{ flex: 1 }}>⚠️ إبلاغ</Btn>
              </div>
            </div>
          );
        })}

        {/* Main CTA */}
        <button
          onClick={openCollect}
          style={{
            width: "100%", background: "linear-gradient(135deg,#059669,#047857)",
            color: "white", border: "none", borderRadius: 22, padding: "26px 24px",
            fontSize: 22, fontWeight: 900, cursor: "pointer",
            boxShadow: "0 10px 35px rgba(5,150,105,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 14, marginBottom: 26, fontFamily: "inherit", transition: "transform .15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: 36 }}>♻️</span>
          <span>طلب تجميع</span>
        </button>

        {/* Shipments */}
        <h3 style={{ color: "#374151", fontWeight: 800, marginBottom: 14, fontSize: 17 }}>
          طلباتي ({myShipments.length})
        </h3>

        {myShipments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF", background: "white", borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
            <p style={{ margin: 0, fontWeight: 600 }}>لا توجد طلبات حتى الآن</p>
          </div>
        ) : myShipments.map((s) => {
          const mat = getMat(s.materialType);
          return (
            <div key={s.id} style={{ background: "white", borderRadius: 18, padding: 20, marginBottom: 12, boxShadow: "0 2px 14px rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 46, height: 46, background: mat.bg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `1.5px solid ${mat.border}`, flexShrink: 0 }}>
                    {mat.emoji}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: "#1F2937" }}>{mat.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>{s.weight} {s.unit}</p>
                  </div>
                </div>
                <Badge status={s.status} />
              </div>
              {s.pickupTime && (
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#065F46", fontWeight: 600 }}>
                  🕐 موعد الاستلام: {new Date(s.pickupTime).toLocaleString("ar-IQ")}
                </div>
              )}
              {s.photo && <img src={s.photo} alt="shipment" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 12, marginTop: 10 }} />}
            </div>
          );
        })}
      </div>

      {/* Collection Modal */}
      {showCollect && (
        <Modal title={cStep === 1 ? "♻️ اختر نوع المادة" : "📋 تفاصيل الشحنة"} onClose={() => setShowCollect(false)}>
          {cStep === 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {MATERIALS.map((m) => (
                <button key={m.id} onClick={() => { setCMat(m.id); setCStep(2); }}
                  style={{ background: m.bg, border: `2px solid ${m.border}`, borderRadius: 18, padding: "24px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "transform .1s" }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ fontSize: 44, marginBottom: 10 }}>{m.emoji}</div>
                  <p style={{ margin: 0, fontWeight: 800, color: m.color, fontSize: 17 }}>{m.label}</p>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Selected Material */}
              {(() => { const m = getMat(cMat); return (
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: m.bg, border: `2px solid ${m.border}`, borderRadius: 14, padding: 16, marginBottom: 22 }}>
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span style={{ fontWeight: 800, color: m.color, fontSize: 17, flex: 1 }}>{m.label}</span>
                  <button onClick={() => setCStep(1)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 12, textDecoration: "underline", fontFamily: "inherit" }}>تغيير</button>
                </div>
              ); })()}

              {/* Weight */}
              <Field label="الكمية">
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="number" value={cWeight} onChange={(e) => setCWeight(e.target.value)} placeholder="0"
                    style={{ flex: 1, border: "2px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", fontSize: 22, fontWeight: 800, textAlign: "center", outline: "none", fontFamily: "inherit" }}
                    onFocus={(e) => (e.target.style.borderColor = "#059669")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                  <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                    {["kg","L"].map((u) => (
                      <button key={u} onClick={() => setCUnit(u)}
                        style={{ padding: "14px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", transition: "all .15s",
                          background: cUnit === u ? "#059669" : "transparent",
                          color: cUnit === u ? "white" : "#9CA3AF",
                        }}>
                        {u === "kg" ? "كغ" : "لتر"}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              {/* Photo */}
              <Field label="صورة الشحنة">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { const r = new FileReader(); r.onload = (ev) => setCPhoto(ev.target.result); r.readAsDataURL(f); }
                  }}
                />
                {cPhoto ? (
                  <div style={{ position: "relative" }}>
                    <img src={cPhoto} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 14 }} />
                    <button onClick={() => setCPhoto(null)}
                      style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.6)", color: "white", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current.click()}
                    style={{ width: "100%", border: "2px dashed #D1D5DB", borderRadius: 16, padding: "30px 0", background: "#F9FAFB", cursor: "pointer", color: "#9CA3AF", fontFamily: "inherit", transition: "border-color .2s" }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = "#059669")}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>اضغط لالتقاط صورة الشحنة</div>
                  </button>
                )}
              </Field>

              <Btn onClick={submitCollection} disabled={!cWeight} style={{ width: "100%", padding: "18px" }}>
                إرسال الطلب ♻️
              </Btn>
            </>
          )}
        </Modal>
      )}
    </div>
  );

  // ════════════════════════════════════════════
  //  FACTORY DASHBOARD
  // ════════════════════════════════════════════
  if (page === "factory") return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F0F7FF", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563EB)", padding: "0 0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0", maxWidth: 720, margin: "0 auto" }}>
          <div>
            <p style={{ margin: 0, color: "#BFDBFE", fontSize: 12 }}>مرحباً،</p>
            <h2 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 900 }}>{currentUser.name}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "5px 12px", color: "white", fontSize: 12, fontWeight: 600 }}>🏭 مصنع</div>
            <button onClick={logout} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "white", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>خروج</button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 12, padding: "18px 20px 0", maxWidth: 720, margin: "0 auto" }}>
          {[
            { label: "طلبات جديدة",   val: pendingFactory.length,   color: "#FCA5A5" },
            { label: "مجدولة",         val: scheduledFactory.length, color: "#93C5FD" },
            { label: "بلاغات",         val: reportsFactory.length,   color: "#FCD34D" },
          ].map((x,i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.12)", borderRadius: 14, padding: "12px 18px", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: x.color }}>{x.val}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.65)" }}>{x.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
        {/* Reports Alert */}
        {reportsFactory.length > 0 && (
          <div style={{ background: "#FEF2F2", border: "2px solid #FCA5A5", borderRadius: 18, padding: "18px 20px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontWeight: 800, color: "#B91C1C", fontSize: 16 }}>⚠️ يوجد {reportsFactory.length} بلاغ من المطاعم</p>
            <p style={{ margin: "4px 0 0", color: "#991B1B", fontSize: 13 }}>بعض الأوزان غير متطابقة — تحقق من الشحنات</p>
            {reportsFactory.map((s) => {
              const mat = getMat(s.materialType);
              return (
                <div key={s.id} style={{ background: "white", borderRadius: 12, padding: "12px 16px", marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{mat.emoji}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{s.restaurantName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>
                      أرسل {s.weight}{s.unit} — تأكدت {s.actualWeight}{s.unit} (فرق: {Math.abs(s.weight - s.actualWeight)}{s.unit})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending Shipments */}
        <h3 style={{ color: "#1F2937", fontWeight: 800, marginBottom: 14, fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
          🔔 طلبات جديدة
          {pendingFactory.length > 0 && <span style={{ background: "#EF4444", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 13 }}>{pendingFactory.length}</span>}
        </h3>

        {pendingFactory.length === 0 ? (
          <div style={{ background: "white", borderRadius: 18, padding: "32px", textAlign: "center", color: "#9CA3AF", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <p style={{ margin: 0, fontWeight: 600 }}>لا توجد طلبات جديدة</p>
          </div>
        ) : pendingFactory.map((s) => {
          const mat = getMat(s.materialType);
          return (
            <div key={s.id} style={{ background: "white", borderRadius: 20, padding: 22, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.08)", border: "1.5px solid #FEE2E2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 50, height: 50, background: mat.bg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: `1.5px solid ${mat.border}`, flexShrink: 0 }}>{mat.emoji}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#1F2937" }}>{mat.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>{s.restaurantName}</p>
                  </div>
                </div>
                <span style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>جديد</span>
              </div>

              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <InfoRow label="الكمية" value={`${s.weight} ${s.unit}`} />
                <InfoRow label="تاريخ الطلب" value={new Date(s.createdAt).toLocaleDateString("ar-IQ")} />
              </div>

              {s.photo && <img src={s.photo} alt="shipment" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 12, marginBottom: 14 }} />}

              <Btn onClick={() => { setPickupModal(s); setPickupTime(""); }} variant="blue" style={{ width: "100%" }}>
                📅 تحديد وقت الاستلام
              </Btn>
            </div>
          );
        })}

        {/* Scheduled */}
        <h3 style={{ color: "#1F2937", fontWeight: 800, marginBottom: 14, fontSize: 17 }}>📅 مجدولة للاستلام ({scheduledFactory.length})</h3>

        {scheduledFactory.length === 0 ? (
          <div style={{ background: "white", borderRadius: 18, padding: 28, textAlign: "center", color: "#9CA3AF", marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14 }}>لا توجد شحنات مجدولة</p>
          </div>
        ) : scheduledFactory.map((s) => {
          const mat = getMat(s.materialType);
          return (
            <div key={s.id} style={{ background: "white", borderRadius: 20, padding: 20, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>{mat.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{mat.label} — {s.weight} {s.unit}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>{s.restaurantName}</p>
                </div>
              </div>
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "8px 14px", marginBottom: 14, color: "#1D4ED8", fontWeight: 600, fontSize: 13 }}>
                🕐 {new Date(s.pickupTime).toLocaleString("ar-IQ")}
              </div>
              <Btn onClick={() => { setWeightModal(s); setDriverWeight(""); }} style={{ width: "100%" }}>
                ⚖️ تأكيد الاستلام وإدخال الوزن
              </Btn>
            </div>
          );
        })}
      </div>

      {/* Pickup Time Modal */}
      {pickupModal && (
        <CenteredModal title="📅 تحديد وقت الاستلام" onClose={() => setPickupModal(null)}>
          <div style={{ background: "#F3F4F6", borderRadius: 14, padding: 16, marginBottom: 22 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#1F2937" }}>{pickupModal.restaurantName}</p>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 14 }}>
              {getMat(pickupModal.materialType).emoji} {getMat(pickupModal.materialType).label} — {pickupModal.weight} {pickupModal.unit}
            </p>
          </div>
          <Field label="وقت الاستلام">
            <input type="datetime-local" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}
              style={{ width: "100%", border: "2px solid #E5E7EB", borderRadius: 12, padding: "13px 16px", fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={() => setPickupModal(null)} variant="ghost" style={{ flex: 1 }}>إلغاء</Btn>
            <Btn onClick={confirmPickup} variant="blue" disabled={!pickupTime} style={{ flex: 2 }}>إرسال للمطعم</Btn>
          </div>
        </CenteredModal>
      )}

      {/* Driver Weight Modal */}
      {weightModal && (
        <CenteredModal title="⚖️ الوزن الفعلي المستلم" onClose={() => setWeightModal(null)}>
          <div style={{ background: "#F3F4F6", borderRadius: 14, padding: 16, marginBottom: 22 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{weightModal.restaurantName}</p>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 14 }}>الوزن المُعلن: {weightModal.weight} {weightModal.unit}</p>
          </div>
          <Field label="الوزن الفعلي المستلم">
            <div style={{ display: "flex", gap: 10 }}>
              <input type="number" value={driverWeight} onChange={(e) => setDriverWeight(e.target.value)} placeholder="0"
                style={{ flex: 1, border: "2px solid #E5E7EB", borderRadius: 12, padding: "14px", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", fontFamily: "inherit" }}
                onFocus={(e) => (e.target.style.borderColor = "#059669")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "14px 16px", color: "#6B7280", fontWeight: 700, display: "flex", alignItems: "center" }}>
                {weightModal.unit}
              </div>
            </div>
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={() => setWeightModal(null)} variant="ghost" style={{ flex: 1 }}>إلغاء</Btn>
            <Btn onClick={confirmWeight} disabled={!driverWeight} style={{ flex: 2 }}>تأكيد الاستلام</Btn>
          </div>
        </CenteredModal>
      )}
    </div>
  );

  // ════════════════════════════════════════════
  //  ADMIN DASHBOARD
  // ════════════════════════════════════════════
  if (page === "admin") {
    const confirmed  = shipments.filter((s) => s.status === "confirmed").length;
    const pending    = shipments.filter((s) => s.status === "pending").length;
    const reported   = shipments.filter((s) => s.status === "reported").length;
    const allKg      = shipments.filter((s) => s.actualWeight).reduce((sum,s) => sum + s.actualWeight, 0);
    const tons       = (allKg / 1000).toFixed(3);

    const byMat = MATERIALS.map((m) => ({
      ...m,
      count: shipments.filter((s) => s.materialType === m.id).length,
      kg: shipments.filter((s) => s.materialType === m.id && s.actualWeight).reduce((sum,s) => sum + s.actualWeight, 0),
    }));

    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
        <div style={{ background: "linear-gradient(135deg,#111827,#1F2937)", padding: "20px 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 800, margin: "0 auto" }}>
            <div>
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12 }}>لوحة التحكم</p>
              <h2 style={{ margin: 0, color: "white", fontSize: 22, fontWeight: 900 }}>إدارة المنصة</h2>
            </div>
            <button onClick={logout} style={{ background: "rgba(255,255,255,.1)", border: "none", color: "white", borderRadius: 12, padding: "9px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>خروج</button>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
          {/* Top Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard icon="🍽️" label="إجمالي المطاعم"  value={users.restaurants.length} color="#059669" bg="#F0FDF4" />
            <StatCard icon="🏭" label="إجمالي المصانع"  value={users.factories.length}   color="#2563EB" bg="#EFF6FF" />
            <StatCard icon="📦" label="إجمالي الشحنات"  value={shipments.length}          color="#7C3AED" bg="#F5F3FF" />
          </div>

          {/* Tons Hero */}
          <div style={{ background: "linear-gradient(135deg,#064e3b,#059669)", borderRadius: 22, padding: "32px 28px", marginBottom: 20, textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, left: -30, fontSize: 120, opacity: .07 }}>♻️</div>
            <p style={{ margin: "0 0 6px", opacity: .75, fontSize: 15 }}>إجمالي الأطنان الموردة خلال فترة العمل</p>
            <p style={{ margin: 0, fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>{tons}</p>
            <p style={{ margin: "6px 0 0", opacity: .6, fontSize: 16 }}>طن — ({allKg.toLocaleString()} كغ)</p>
          </div>

          {/* Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard icon="⏳" label="بانتظار المصنع" value={pending}   color="#B45309" bg="#FFFBEB" />
            <StatCard icon="✅" label="تم التأكيد"     value={confirmed} color="#065F46" bg="#F0FDF4" />
            <StatCard icon="⚠️" label="بلاغات"         value={reported}  color="#B91C1C" bg="#FEF2F2" />
          </div>

          {/* By Material */}
          <h3 style={{ fontWeight: 800, color: "#1F2937", marginBottom: 14, fontSize: 17 }}>توزيع الشحنات حسب نوع المادة</h3>
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,.06)", marginBottom: 24 }}>
            {byMat.map((m, i) => (
              <div key={m.id} style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: i < 3 ? "1px solid #F3F4F6" : "none" }}>
                <div style={{ width: 44, height: 44, background: m.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `1.5px solid ${m.border}`, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: m.color }}>{m.label}</span>
                    <span style={{ fontWeight: 800, color: "#1F2937" }}>{m.count} شحنة</span>
                  </div>
                  <div style={{ background: "#F3F4F6", borderRadius: 999, height: 7 }}>
                    <div style={{ background: m.color, height: 7, borderRadius: 999, width: `${shipments.length ? (m.count / shipments.length * 100) : 0}%`, transition: "width .6s ease" }} />
                  </div>
                </div>
                <div style={{ color: "#6B7280", fontSize: 13, minWidth: 60, textAlign: "left", fontWeight: 600 }}>{m.kg} كغ</div>
              </div>
            ))}
          </div>

          {/* Recent Shipments */}
          <h3 style={{ fontWeight: 800, color: "#1F2937", marginBottom: 14, fontSize: 17 }}>آخر الشحنات</h3>
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,.06)" }}>
            {shipments.slice(0, 8).map((s, i) => {
              const mat = getMat(s.materialType);
              return (
                <div key={s.id} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < Math.min(shipments.length,8)-1 ? "1px solid #F9FAFB" : "none" }}>
                  <span style={{ fontSize: 20 }}>{mat.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{s.restaurantName}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 12, color: "#9CA3AF" }}>{mat.label} • {s.weight} {s.unit}</p>
                  </div>
                  <Badge status={s.status} />
                </div>
              );
            })}
          </div>

          {/* Registered Restaurants */}
          <h3 style={{ fontWeight: 800, color: "#1F2937", marginBottom: 14, fontSize: 17, marginTop: 24 }}>المطاعم المسجلة ({users.restaurants.length})</h3>
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,.06)" }}>
            {users.restaurants.map((r, i) => (
              <div key={r.id} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < users.restaurants.length-1 ? "1px solid #F9FAFB" : "none" }}>
                <div style={{ width: 38, height: 38, background: "#F0FDF4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽️</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{r.name}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: "#9CA3AF" }}>{r.email}</p>
                </div>
                <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>
                  {shipments.filter(s=>s.restaurantId===r.id).length} طلب
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
