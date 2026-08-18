import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpRight, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/ham-logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Berhasil masuk");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login gagal, periksa email & password");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-shell min-h-screen flex overflow-hidden">
      <section className="hidden lg:flex login-visual flex-1 relative overflow-hidden items-center p-12 xl:p-20">
        <div className="login-grid absolute inset-0" />
        <div className="login-beam absolute inset-y-0 left-1/2" />
        <motion.div className="login-orb login-orb-one" animate={{ x: [0, 28, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="login-orb login-orb-two" animate={{ x: [0, -22, 0], y: [0, 24, 0], scale: [1, 0.92, 1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="login-stage relative z-10 w-full max-w-2xl"
        >
          <motion.div className="login-brand-lockup" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="login-logo-orbit"><img src={logo} alt="HAM Store" /></div>
            <div><span className="login-brand-name">HAM STORE</span><span className="login-brand-meta">OPERATION CONSOLE / 01</span></div>
          </motion.div>
          <div className="login-copy">
            <div className="login-kicker"><Sparkles className="w-3.5 h-3.5" /> Workspace toko yang terasa hidup</div>
            <h1 className="text-5xl xl:text-7xl leading-[0.92] tracking-tight mt-7 mb-5">Bikin toko<br /><span>bergerak lebih cepat.</span></h1>
            <p className="text-slate-300/90 text-base xl:text-lg leading-relaxed max-w-lg">Kasir, service, inventaris, dan uang toko berada di satu alur yang mudah dipantau.</p>
          </div>
          <div className="login-preview-grid mt-10">
            <motion.div className="login-preview-card login-preview-main" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} whileHover={{ y: -5 }}>
              <span>OMSET HARI INI</span><strong>Rp 86.616.500</strong><div className="login-sparkline"><i /><i /><i /><i /><i /><i /></div>
            </motion.div>
            <motion.div className="login-preview-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} whileHover={{ y: -5 }}><span>STOK AMAN</span><strong>87 <small>SKU</small></strong><em>+12.8%</em></motion.div>
            <motion.div className="login-preview-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} whileHover={{ y: -5 }}><span>SHIFT BERJALAN</span><strong>09:30</strong><em className="text-cyan-300">LIVE / WIB</em></motion.div>
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-cyan-300" /> Data akses aman untuk operasional harian</div>
        </motion.div>
        <div className="absolute bottom-8 right-10 text-xs text-white/30 font-mono-num">HAM / 01</div>
      </section>

      <section className="flex-1 login-form-side flex items-center justify-center p-6 sm:p-10">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] login-card"
          data-testid="login-form"
          autoComplete="off"
        >
          <div className="flex items-center justify-between mb-9">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm lg:hidden"><img src={logo} alt="HAM Store" className="w-full h-full object-contain" /></div>
            <span className="login-status"><span /> Sistem aktif</span>
          </div>
          <input type="text" name="fakeusernameremembered" style={{ display: "none" }} />
          <input type="password" name="fakepasswordremembered" style={{ display: "none" }} />
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.22em] text-sky-600 font-semibold mb-3">Selamat datang kembali</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 mb-2">Masuk ke workspace</h2>
            <p className="text-sm text-slate-500 leading-relaxed">Kelola toko lebih cepat, jelas, dan teratur dari satu dashboard.</p>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-slate-700 text-xs font-semibold uppercase tracking-wide">Email</Label>
              <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 login-input" placeholder="" autoComplete="off" data-testid="login-email" required />
            </div>
            <div>
              <div className="flex items-center justify-between"><Label className="text-slate-700 text-xs font-semibold uppercase tracking-wide">Password</Label><span className="text-[11px] text-slate-400">Akses terenkripsi</span></div>
              <div className="relative mt-2">
                <Input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="login-input pr-11" autoComplete="new-password" data-testid="login-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-slate-950 hover:bg-sky-700 shadow-lg shadow-slate-950/10" data-testid="login-submit">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Masuk ke dashboard</span><ArrowUpRight className="w-4 h-4" /></>}
              </Button>
            </motion.div>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-8">Dengan masuk, kamu siap membuat operasional hari ini lebih ringan.</p>
        </motion.form>
      </section>
    </div>
  );
}
