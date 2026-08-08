import { Loader2 } from "lucide-react";

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

export const Loading = () => (
  <div className="flex items-center justify-center py-24 text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
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
