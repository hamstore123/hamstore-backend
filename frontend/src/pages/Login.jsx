import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/ham-logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div
          className="absolute inset-0 opacity-40 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1687197180710-b2b9484a3c5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200')" }}
        />
        <div className="relative z-10 text-white max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-6 p-2">
            <img src={logo} alt="HAM Store" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-serif-display text-5xl leading-none mb-4">HAM Store<br />Management</h1>
          <p className="text-slate-300">Sistem manajemen toko HP terpadu — kasir, service, inventaris, keuangan, dan kinerja karyawan dalam satu tempat.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form" autoComplete="off">
          {/* hidden fields to discourage browser autofill */}
          <input type="text" name="fakeusernameremembered" style={{ display: "none" }} />
          <input type="password" name="fakepasswordremembered" style={{ display: "none" }} />
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Masuk</h2>
          <p className="text-sm text-slate-500 mb-6">Silakan masuk untuk melanjutkan</p>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-600">Email</Label>
              <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 transition" placeholder="Email" autoComplete="off" data-testid="login-email" required />
            </div>
            <div>
              <Label className="text-slate-600">Password</Label>
              <Input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 transition" autoComplete="new-password" data-testid="login-password" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700 transition-colors duration-150" data-testid="login-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
