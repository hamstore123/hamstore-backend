import { Loader2 } from "lucide-react";

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

export const MiniBars = ({ values = [], color = "bg-sky-500", label = "Tren" }) => {
  const max = Math.max(...values.map((value) => Number(value) || 0), 1);
  return (
    <div className="mini-bars" aria-label={label}>
      {values.length === 0 ? <div className="text-xs text-slate-400 py-5">Belum ada data grafik</div> : values.map((value, index) => (
        <div key={`${value}-${index}`} className="mini-bar-column">
          <div className={`mini-bar ${color}`} style={{ height: `${Math.max(8, ((Number(value) || 0) / max) * 100)}%` }} title={String(value)} />
          <span>{index + 1}</span>
        </div>
      ))}
    </div>
  );
};


export const Loading = () => (
  <div className="flex items-center justify-center py-24 text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

export const SkeletonTable = ({ rows = 6, cols = 6 }) => (
  <div className="animate-pulse">
    <div className="p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center py-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-4 bg-slate-200 rounded w-full" style={{ minWidth: 40 }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const Empty = ({ text = "Belum ada data" }) => (
  <div className="text-center py-16 text-slate-400 text-sm">{text}</div>
);

const STATUS = {
  antre: "bg-amber-100 text-amber-800 border-amber-200",
  diproses: "bg-blue-100 text-blue-800 border-blue-200",
  selesai: "bg-green-100 text-green-800 border-green-200",
  diambil: "bg-slate-100 text-slate-700 border-slate-200",
  batal: "bg-red-100 text-red-700 border-red-200",
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-green-100 text-green-800 border-green-200",
  missed: "bg-red-100 text-red-700 border-red-200",
  scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  uploaded: "bg-green-100 text-green-800 border-green-200",
  late: "bg-orange-100 text-orange-800 border-orange-200",
  konsep: "bg-slate-100 text-slate-700 border-slate-200",
  edited: "bg-blue-100 text-blue-800 border-blue-200",
  selesai_edit: "bg-violet-100 text-violet-800 border-violet-200",
  upload: "bg-green-100 text-green-800 border-green-200",
};

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
      STATUS[status] || "bg-slate-100 text-slate-700 border-slate-200"
    }`}
  >
    {String(status || "-").replace("_", " ")}
  </span>
);
