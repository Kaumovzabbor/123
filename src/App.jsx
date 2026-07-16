import { useState, useEffect, useRef, useCallback } from "react";

// ---- Inline SVG icons (no external icon library dependency) ----
function Icon({ children, size = 16, strokeWidth = 2, color, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
const Plus = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const Search = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
const Trash2 = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></Icon>;
const Check = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const X = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const Pencil = (p) => <Icon {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>;
const MoreVertical = (p) => <Icon {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></Icon>;
const BookOpen = (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>;



// ---------- Storage helpers (uses real browser localStorage) ----------
const STORAGE_KEY = "teacher-payment-tracker-data";

function defaultState() {
  const defaultSheetId = "sheet-1";
  return {
    sheets: [
      { id: defaultSheetId, name: "Boshlang'ich", columns: [], teachers: [] },
    ],
    activeSheetId: defaultSheetId,
  };
}

function loadInitialState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Ma'lumotlarni o'qishda xatolik:", e);
  }
  return defaultState();
}

// ---------- Utility ----------
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Deterministic pastel-ish stamp color per column, derived from name — gives
// each payment period a recognizable identity without the user configuring it.
const STAMP_HUES = [154, 24, 200, 340, 44, 268];
function hueForColumn(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return STAMP_HUES[h % STAMP_HUES.length];
}

export default function App() {
  const [data, setData] = useState(loadInitialState);
  const [search, setSearch] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [editingTabId, setEditingTabId] = useState(null);
  const [tabDraft, setTabDraft] = useState("");
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [teacherDraft, setTeacherDraft] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState("");
  const [columnMenuId, setColumnMenuId] = useState(null);
  const [renamingColumnId, setRenamingColumnId] = useState(null);
  const [columnRenameDraft, setColumnRenameDraft] = useState("");
  const [confirmDeleteTeacher, setConfirmDeleteTeacher] = useState(null);
  const [confirmDeleteTab, setConfirmDeleteTab] = useState(null);
  const [toast, setToast] = useState(null);
  const [justAddedTeacherId, setJustAddedTeacherId] = useState(null);
  const [confirmPayment, setConfirmPayment] = useState(null); // { teacherId, colId, colName, teacherName, next }

  const persistTimer = useRef(null);

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Saqlashda xatolik:", e);
      }
    }, 150);
    return () => clearTimeout(persistTimer.current);
  }, [data]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1700);
  }, []);

  const activeSheet =
    data.sheets.find((s) => s.id === data.activeSheetId) || data.sheets[0];

  // ---------- Tab actions ----------
  const addSheet = () => {
    const name = `Varaq ${data.sheets.length + 1}`;
    const newSheet = { id: uid("sheet"), name, columns: [], teachers: [] };
    setData((d) => ({
      sheets: [...d.sheets, newSheet],
      activeSheetId: newSheet.id,
    }));
    showToast(`"${name}" qo'shildi`);
  };

  const switchSheet = (id) => {
    setData((d) => ({ ...d, activeSheetId: id }));
    setSearch("");
  };

  const startRenameTab = (sheet) => {
    setEditingTabId(sheet.id);
    setTabDraft(sheet.name);
  };

  const commitRenameTab = () => {
    const trimmed = tabDraft.trim();
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === editingTabId && trimmed ? { ...s, name: trimmed } : s
      ),
    }));
    setEditingTabId(null);
    setTabDraft("");
  };

  const deleteSheet = (id) => {
    setData((d) => {
      const remaining = d.sheets.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = { id: uid("sheet"), name: "Boshlang'ich", columns: [], teachers: [] };
        return { sheets: [fresh], activeSheetId: fresh.id };
      }
      const newActive = d.activeSheetId === id ? remaining[0].id : d.activeSheetId;
      return { sheets: remaining, activeSheetId: newActive };
    });
    setConfirmDeleteTab(null);
    showToast("Varaq o'chirildi");
  };

  // ---------- Teacher actions ----------
  const addTeacher = () => {
    const name = newTeacherName.trim();
    if (!name) return;
    const newId = uid("t");
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? { ...s, teachers: [...s.teachers, { id: newId, name, payments: {} }] }
          : s
      ),
    }));
    setNewTeacherName("");
    setJustAddedTeacherId(newId);
    setTimeout(() => setJustAddedTeacherId(null), 1200);
  };

  const startRenameTeacher = (teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherDraft(teacher.name);
  };

  const commitRenameTeacher = () => {
    const trimmed = teacherDraft.trim();
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? {
              ...s,
              teachers: s.teachers.map((t) =>
                t.id === editingTeacherId && trimmed ? { ...t, name: trimmed } : t
              ),
            }
          : s
      ),
    }));
    setEditingTeacherId(null);
    setTeacherDraft("");
  };

  const deleteTeacher = (teacherId) => {
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? { ...s, teachers: s.teachers.filter((t) => t.id !== teacherId) }
          : s
      ),
    }));
    setConfirmDeleteTeacher(null);
    showToast("O'qituvchi o'chirildi");
  };

  const setPaid = (teacherId, columnId, paid) => {
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? {
              ...s,
              teachers: s.teachers.map((t) =>
                t.id === teacherId
                  ? { ...t, payments: { ...t.payments, [columnId]: paid } }
                  : t
              ),
            }
          : s
      ),
    }));
  };

  const requestTogglePayment = (teacher, col) => {
    const current = !!teacher.payments[col.id];
    setConfirmPayment({
      teacherId: teacher.id,
      colId: col.id,
      colName: col.name,
      teacherName: teacher.name,
      nextValue: !current,
    });
  };

  // ---------- Column actions ----------
  const addColumn = () => {
    const name = columnDraft.trim();
    if (!name) return;
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? { ...s, columns: [...s.columns, { id: uid("c"), name }] }
          : s
      ),
    }));
    setColumnDraft("");
    setShowAddColumn(false);
  };

  const startRenameColumn = (col) => {
    setRenamingColumnId(col.id);
    setColumnRenameDraft(col.name);
    setColumnMenuId(null);
  };

  const commitRenameColumn = () => {
    const trimmed = columnRenameDraft.trim();
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? {
              ...s,
              columns: s.columns.map((c) =>
                c.id === renamingColumnId && trimmed ? { ...c, name: trimmed } : c
              ),
            }
          : s
      ),
    }));
    setRenamingColumnId(null);
    setColumnRenameDraft("");
  };

  const deleteColumn = (colId) => {
    setData((d) => ({
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === d.activeSheetId
          ? { ...s, columns: s.columns.filter((c) => c.id !== colId) }
          : s
      ),
    }));
    setColumnMenuId(null);
    showToast("Ustun o'chirildi");
  };

  // ---------- Derived ----------
  const filteredTeachers = (activeSheet?.teachers || []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalFor = (teacher) => {
    if (!activeSheet) return 0;
    return activeSheet.columns.reduce((count, col) => count + (teacher.payments[col.id] ? 1 : 0), 0);
  };

  const grandTotal = filteredTeachers.reduce((sum, t) => sum + totalFor(t), 0);
  const totalColumns = activeSheet ? activeSheet.columns.length : 0;

  return (
    <div className="min-h-screen bg-[#F1EBDC] flex flex-col text-[#2A2620]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .tabular { font-variant-numeric: tabular-nums; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .rise-in { animation: riseIn 0.28s ease-out; }
        @keyframes stampIn { 0% { opacity:0; transform: scale(1.5) rotate(-8deg);} 60% { opacity:1; transform: scale(0.9) rotate(-8deg);} 100% { opacity:1; transform: scale(1) rotate(-8deg);} }
        .stamp-in { animation: stampIn 0.35s cubic-bezier(.2,1.4,.4,1); }
        .paper-lines {
          background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 34px, #E4DAC2 34px, #E4DAC2 35px);
        }
        .ledger-hole { box-shadow: inset 0 0 0 1px #E4DAC2; }
      `}</style>

      {/* Header — deep emerald, ledger-cover feel */}
      <header className="sticky top-0 z-30 bg-[#1C3B34] text-[#F1EBDC] px-4 pt-5 pb-4 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#C1673B] flex items-center justify-center shrink-0">
              <BookOpen size={16} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="font-display text-[17px] leading-tight tracking-tight">
                To'lovlar daftari
              </h1>
              <p className="text-[12px] text-[#D9C9A8] font-medium tracking-wide mt-0.5">
                {activeSheet ? activeSheet.name : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-2.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9E92]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism bo'yicha qidirish..."
            className="w-full bg-[#264940] text-[#F1EBDC] placeholder:text-[#7A9E92] rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#C1673B] transition border border-[#345A50]"
          />
        </div>

        <div className="flex gap-2">
          <input
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTeacher()}
            placeholder="Yangi o'qituvchi ismi..."
            className="flex-1 bg-[#F1EBDC] text-[#2A2620] placeholder:text-[#9C9382] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#C1673B] transition"
          />
          <button
            onClick={addTeacher}
            className="bg-[#C1673B] hover:bg-[#AD5A32] active:scale-95 transition rounded-lg px-4 flex items-center justify-center shrink-0"
            aria-label="O'qituvchi qo'shish"
          >
            <Plus size={19} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Tabs — like ledger dividers */}
      <div className="sticky top-[142px] z-20 bg-[#E9E1CC] border-b border-[#D8CBA9] px-2 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {data.sheets.map((sheet) => {
          const isActive = sheet.id === data.activeSheetId;
          const isEditing = editingTabId === sheet.id;
          return (
            <div
              key={sheet.id}
              className={`relative shrink-0 flex items-center gap-0.5 rounded-md transition-all ${
                isActive
                  ? "bg-[#C1673B] text-white shadow-md ring-2 ring-[#8F4726]"
                  : "bg-white text-[#5B5442] border border-[#D8CBA9]"
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={tabDraft}
                  onChange={(e) => setTabDraft(e.target.value)}
                  onBlur={commitRenameTab}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRenameTab();
                    if (e.key === "Escape") { setEditingTabId(null); setTabDraft(""); }
                  }}
                  className={`bg-transparent text-[13px] font-medium py-2 px-3 outline-none w-28 ${
                    isActive ? "text-white placeholder:text-white/60" : "text-[#2A2620]"
                  }`}
                />
              ) : (
                <button
                  onClick={() => switchSheet(sheet.id)}
                  onDoubleClick={() => startRenameTab(sheet)}
                  className={`font-display text-[13px] font-medium py-2 pl-3 pr-1 whitespace-nowrap ${
                    isActive ? "text-white" : "text-[#2A2620]"
                  }`}
                >
                  {sheet.name}
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => startRenameTab(sheet)}
                  className={`p-1.5 rounded ${isActive ? "hover:bg-white/10" : "hover:bg-[#E9E1CC]"}`}
                  aria-label="Nomini o'zgartirish"
                >
                  <Pencil size={11} />
                </button>
              )}
              {data.sheets.length > 1 && !isEditing && (
                <button
                  onClick={() => setConfirmDeleteTab(sheet.id)}
                  className={`p-1.5 mr-1 rounded ${isActive ? "hover:bg-white/10" : "hover:bg-[#E9E1CC]"}`}
                  aria-label="Varaqni o'chirish"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={addSheet}
          className="shrink-0 bg-[#F1EBDC] border border-dashed border-[#C1673B] text-[#C1673B] rounded-md p-2.5 hover:bg-[#FBF3E9] transition"
          aria-label="Yangi varaq qo'shish"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Table */}
      <main className="flex-1 px-2.5 pb-28 pt-3">
        {activeSheet && activeSheet.teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 rise-in">
            <div className="w-14 h-14 rounded-full bg-[#E9E1CC] flex items-center justify-center mb-3 ledger-hole">
              <Plus size={22} className="text-[#C1673B]" />
            </div>
            <p className="font-display text-[15px] text-[#3F3A2E] font-medium">
              Hali o'qituvchi yo'q
            </p>
            <p className="text-xs text-[#8C8368] mt-1 max-w-[220px]">
              Yuqoridagi maydonga ism kiriting va ro'yxatga qo'shing
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#D8CBA9] bg-[#FBF8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="border-collapse text-sm min-w-full">
              <thead>
                <tr className="bg-[#E9E1CC] text-[#5B5442]">
                  <th className="sticky left-0 z-10 bg-[#E9E1CC] text-left px-3 py-2.5 font-semibold min-w-[128px] border-r border-[#D8CBA9] font-display text-[13px]">
                    Ism
                  </th>
                  {activeSheet.columns.map((col) => {
                    const hue = hueForColumn(col.id);
                    return (
                      <th
                        key={col.id}
                        className="px-2 py-2.5 font-semibold min-w-[90px] text-center relative border-r border-[#D8CBA9]"
                      >
                        {renamingColumnId === col.id ? (
                          <input
                            autoFocus
                            value={columnRenameDraft}
                            onChange={(e) => setColumnRenameDraft(e.target.value)}
                            onBlur={commitRenameColumn}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRenameColumn();
                              if (e.key === "Escape") setRenamingColumnId(null);
                            }}
                            className="w-full text-center bg-white rounded px-1 py-1 outline-none ring-1 ring-[#C1673B]"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: `hsl(${hue}, 45%, 45%)` }}
                            />
                            <span className="truncate max-w-[68px] text-[12.5px]">{col.name}</span>
                            <button
                              onClick={() => setColumnMenuId(columnMenuId === col.id ? null : col.id)}
                              className="p-0.5 rounded hover:bg-[#D8CBA9]"
                            >
                              <MoreVertical size={12} />
                            </button>
                          </div>
                        )}
                        {columnMenuId === col.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-[#D8CBA9] rounded-lg shadow-lg z-30 text-xs overflow-hidden w-32">
                            <button
                              onClick={() => startRenameColumn(col)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F3EFE3] flex items-center gap-2"
                            >
                              <Pencil size={12} /> Nomini o'zgartirish
                            </button>
                            <button
                              onClick={() => deleteColumn(col.id)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F7E7DF] text-[#B24A26] flex items-center gap-2"
                            >
                              <Trash2 size={12} /> O'chirish
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2.5 font-semibold min-w-[80px] text-center border-r border-[#D8CBA9] text-[#1C3B34] font-display text-[13px]">
                    Jami
                  </th>
                  <th className="px-2 py-2.5 min-w-[46px]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={activeSheet.columns.length + 3} className="text-center text-[#9C9382] text-xs py-6">
                      Hech narsa topilmadi
                    </td>
                  </tr>
                )}
                {filteredTeachers.map((teacher, idx) => {
                  const rowBg = idx % 2 === 0 ? "#FBF8F0" : "#F5F0E4";
                  return (
                  <tr
                    key={teacher.id}
                    className={`${idx % 2 === 0 ? "bg-[#FBF8F0]" : "bg-[#F5F0E4]"} ${
                      justAddedTeacherId === teacher.id ? "rise-in" : ""
                    }`}
                  >
                    <td
                      className="sticky left-0 z-10 px-3 py-2 border-r border-[#D8CBA9] font-medium"
                      style={{ backgroundColor: rowBg }}
                    >
                      {editingTeacherId === teacher.id ? (
                        <input
                          autoFocus
                          value={teacherDraft}
                          onChange={(e) => setTeacherDraft(e.target.value)}
                          onBlur={commitRenameTeacher}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRenameTeacher();
                            if (e.key === "Escape") setEditingTeacherId(null);
                          }}
                          className="w-full bg-[#FBF0E1] rounded px-2 py-1 outline-none ring-1 ring-[#C1673B] text-[#2A2620]"
                        />
                      ) : (
                        <button
                          onClick={() => startRenameTeacher(teacher)}
                          className="text-left w-full truncate max-w-[108px] text-[13.5px] text-[#2A2620]"
                        >
                          {teacher.name}
                        </button>
                      )}
                    </td>
                    {activeSheet.columns.map((col) => {
                      const isPaid = !!teacher.payments[col.id];
                      return (
                        <td
                          key={col.id}
                          className="px-1.5 py-1.5 border-r border-[#D8CBA9] text-center transition-colors"
                          style={{ backgroundColor: isPaid ? "#E4F3E8" : "#FBEAE6" }}
                        >
                          <button
                            onClick={() => requestTogglePayment(teacher, col)}
                            className="w-full min-w-[60px] h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
                            style={{
                              backgroundColor: isPaid ? "#3F8F5C" : "#FFFFFF",
                              border: `2px solid ${isPaid ? "#3F8F5C" : "#D9705A"}`,
                              boxShadow: isPaid ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                            }}
                            aria-label={isPaid ? "To'landi, bekor qilish uchun bosing" : "To'landi deb belgilash"}
                          >
                            {isPaid ? (
                              <Check size={18} strokeWidth={3.5} color="#FFFFFF" />
                            ) : (
                              <Plus size={16} strokeWidth={3} color="#D9705A" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-[#1C3B34] border-r border-[#D8CBA9] whitespace-nowrap tabular text-[13.5px] font-display">
                      {totalFor(teacher)}/{totalColumns}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button
                        onClick={() => setConfirmDeleteTeacher(teacher.id)}
                        className="p-1.5 rounded-full text-[#B24A26] hover:bg-[#F7E7DF]"
                        aria-label="O'chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              {totalColumns > 0 && filteredTeachers.length > 0 && (
                <tfoot>
                  <tr className="bg-[#E9E1CC] font-semibold text-[#1C3B34]">
                    <td className="sticky left-0 bg-[#E9E1CC] px-3 py-2.5 border-r border-[#D8CBA9] font-display text-[13px]">
                      Umumiy
                    </td>
                    {activeSheet.columns.map((col) => {
                      const paidCount = filteredTeachers.reduce(
                        (sum, t) => sum + (t.payments[col.id] ? 1 : 0),
                        0
                      );
                      return (
                        <td key={col.id} className="px-2 py-2.5 text-center border-r border-[#D8CBA9] text-xs tabular">
                          {paidCount}/{filteredTeachers.length}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-center border-r border-[#D8CBA9] tabular text-[13.5px]">
                      {grandTotal}/{filteredTeachers.length * totalColumns}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Add column */}
        <div className="mt-3">
          {showAddColumn ? (
            <div className="flex gap-2 bg-[#FBF8F0] border border-[#D8CBA9] rounded-xl p-2 rise-in">
              <input
                autoFocus
                value={columnDraft}
                onChange={(e) => setColumnDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  if (e.key === "Escape") setShowAddColumn(false);
                }}
                placeholder="Ustun nomi (masalan: Yanvar)"
                className="flex-1 text-sm outline-none px-2 py-1.5 bg-transparent"
              />
              <button onClick={addColumn} className="bg-[#1C3B34] text-[#F1EBDC] rounded-lg px-3 text-sm font-medium">
                Qo'shish
              </button>
              <button
                onClick={() => { setShowAddColumn(false); setColumnDraft(""); }}
                className="text-[#9C9382] px-2"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="w-full border border-dashed border-[#C1673B] text-[#C1673B] rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#FBF3E9] transition"
            >
              <Plus size={15} /> Ustun qo'shish
            </button>
          )}
        </div>
      </main>

      {confirmPayment && (
        <ConfirmModal
          title={confirmPayment.nextValue ? "To'lovni belgilash" : "Belgini olib tashlash"}
          message={
            confirmPayment.nextValue
              ? `${confirmPayment.teacherName} — "${confirmPayment.colName}" uchun to'lov qildimi?`
              : `${confirmPayment.teacherName} — "${confirmPayment.colName}" belgisini yo'qotasizmi?`
          }
          cancelLabel={confirmPayment.nextValue ? "Yo'q" : "Bekor qilish"}
          confirmLabel={confirmPayment.nextValue ? "Ha, to'landi" : "Ha, olib tashlash"}
          confirmClass={confirmPayment.nextValue ? "bg-[#3F8F5C]" : "bg-[#B24A26]"}
          onCancel={() => setConfirmPayment(null)}
          onConfirm={() => {
            setPaid(confirmPayment.teacherId, confirmPayment.colId, confirmPayment.nextValue);
            setConfirmPayment(null);
          }}
        />
      )}

      {confirmDeleteTeacher && (
        <ConfirmModal
          title="O'qituvchini o'chirish"
          message="Bu o'qituvchi va uning barcha to'lovlari butunlay o'chiriladi. Davom etasizmi?"
          onCancel={() => setConfirmDeleteTeacher(null)}
          onConfirm={() => deleteTeacher(confirmDeleteTeacher)}
        />
      )}

      {confirmDeleteTab && (
        <ConfirmModal
          title="Varaqni o'chirish"
          message="Bu varaqdagi barcha o'qituvchilar va ustunlar butunlay o'chiriladi. Davom etasizmi?"
          onCancel={() => setConfirmDeleteTab(null)}
          onConfirm={() => deleteSheet(confirmDeleteTab)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C3B34] text-[#F1EBDC] text-xs px-4 py-2 rounded-full shadow-lg z-50 rise-in">
          {toast}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm, cancelLabel = "Bekor qilish", confirmLabel = "O'chirish", confirmClass = "bg-[#B24A26]" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 px-4 pb-4 sm:pb-0">
      <div className="bg-[#FBF8F0] rounded-2xl w-full max-w-sm p-5 shadow-xl border border-[#D8CBA9] rise-in">
        <h3 className="font-display text-[16px] text-[#2A2620] mb-1.5 font-semibold">{title}</h3>
        <p className="text-sm text-[#6B6350] mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#D8CBA9] text-[#5B5442] text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
