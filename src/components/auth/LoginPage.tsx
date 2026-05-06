import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Loader2, Chrome, PieChart } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

import { ToastType } from '../ui/Toast';

interface LoginPageProps {
  onAuthSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export const LoginPage = ({ onAuthSuccess, showToast }: LoginPageProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('E-mail de recuperação enviado!', 'success');
      setIsForgotPassword(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative selection:bg-sky-500/30" style={{ backgroundImage: 'url("https://i.imgur.com/0Tdqz5f.png")' }}>
        {/* Overlay gradiente para profundidade */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-transparent to-slate-950/80 backdrop-blur-[4px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl p-10 rounded-[2.5rem] space-y-8 relative z-10 border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight">Recuperar Senha</h2>
            <p className="text-slate-400 text-sm font-medium">Digite seu e-mail para receber o link.</p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail de Trabalho</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={18} />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 pl-14 pr-6 py-4 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="seu@email.com" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full bg-sky-500 py-4 rounded-2xl font-black text-white hover:bg-sky-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-500/20 active:scale-[0.98]">
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span>Enviar Link</span>
                  <LogIn size={18} className="opacity-50" />
                </>
              )}
            </button>
            <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Voltar para o início</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative selection:bg-sky-500/30" style={{ backgroundImage: 'url("https://i.imgur.com/0Tdqz5f.png")' }}>
      {/* Camada de Integração Visual */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20 backdrop-blur-[3px]"></div>
      <div className="absolute inset-0 bg-slate-950/20"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md bg-white/[0.02] backdrop-blur-2xl p-10 rounded-[3rem] space-y-10 border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] relative z-10"
      >
        <div className="text-center flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-4 bg-sky-500/20 rounded-full blur-2xl group-hover:bg-sky-500/30 transition-all duration-500"></div>
            <div className="relative">
              <img src="https://i.imgur.com/JPJTsAQ.png" alt="Tracker Logo" className="w-20 h-20 drop-shadow-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter italic">TRACKER</h2>
            <div className="h-1 w-12 bg-sky-500 mx-auto rounded-full"></div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-2">
              {isLogin ? 'Autenticação' : 'Registro de Conta'}
            </p>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={18} />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 pl-14 pr-6 py-4 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="seu@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Senha</label>
                {isLogin && (
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[9px] font-black text-sky-500 uppercase hover:text-sky-400 tracking-wider">
                    Recuperar
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={18} />
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 pl-14 pr-6 py-4 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="••••••••" />
              </div>
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-sky-500 py-5 rounded-2xl font-black text-white hover:bg-sky-400 transition-all shadow-2xl shadow-sky-500/30 flex items-center justify-center gap-3 active:scale-[0.98]">
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <span className="uppercase tracking-[0.2em] text-sm">{isLogin ? 'Entrar' : 'Registrar'}</span>
                <LogIn size={20} className="opacity-50" />
              </>
            )}
          </button>
        </form>

        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-transparent px-4 text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] backdrop-blur-md">Conexão Rápida</span>
            </div>
          </div>

          <button onClick={handleGoogleSignIn} className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-slate-200 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]">
            <Chrome size={20} className="group-hover:text-sky-400 transition-colors" />
            <span className="uppercase tracking-[0.1em] text-xs">Acessar com Google</span>
          </button>

          <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
            {isLogin ? 'Não possui acesso?' : 'Já tem um Tracker?'}
            <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-sky-500 hover:text-sky-400 transition-colors">
              {isLogin ? 'Cadastrar Equipe' : 'Fazer Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
