import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Envelope, Lock, SignIn, CircleNotch, Eye, EyeClosed } from '@phosphor-icons/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { validateInvite, acceptInvite } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';
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
  const [showPassword, setShowPassword] = useState(false);

  // Estados do Onboarding por Convite
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInviteValidating, setIsInviteValidating] = useState(false);

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      
      // Mock visual de demonstração estática
      if (token === 'demo' || token === 'demo-invite') {
        setInviteData({
          email: 'colaborador.exemplo@empresa.com',
          role: 'member',
          organizationId: 'demo-org'
        });
        setEmail('colaborador.exemplo@empresa.com');
        setIsLogin(false);
        return;
      }

      setIsInviteValidating(true);
      
      const validate = async () => {
        try {
          let data: any = null;
          if (token.startsWith('sb-tok')) {
            data = sandboxService.validateInvite(token);
          } else {
            data = await validateInvite(token);
          }

          if (data) {
            setInviteData(data);
            setEmail(data.email);
            setIsLogin(false); // Força tela de cadastro
            showToastRef.current(`Convite válido recebido para ${data.email}!`, 'success');
          } else {
            showToastRef.current('O link de convite é inválido ou expirou.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToastRef.current('Erro ao validar convite.', 'error');
        } finally {
          setIsInviteValidating(false);
        }
      };
      
      validate();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Se for convite, valida se o e-mail inserido é o e-mail convidado
        if (inviteData && email.trim().toLowerCase() !== inviteData.email.toLowerCase()) {
          throw new Error(`Este link de convite pertence a ${inviteData.email}. Por favor, registre-se com este e-mail.`);
        }

        const authResult = await createUserWithEmailAndPassword(auth, email, password);
        
        // Se houver token de convite ativo, aceita e vincula no Firestore
        if (inviteToken) {
          if (inviteToken.startsWith('sb-tok')) {
            sandboxService.acceptInvite(authResult.user.uid, inviteToken);
          } else {
            await acceptInvite(authResult.user.uid, inviteToken);
          }
          showToast('Conta criada e vinculada à organização!', 'success');
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('E-mail de redefinição de senha enviado!', 'success');
      setIsForgotPassword(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Luzes de fundo sutis */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card bg-slate-900/45 border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8 relative z-10"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex mb-2">
            <img src="/logo.png" alt="Tracker Logo" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider uppercase">
            {isForgotPassword ? 'Recuperar Senha' : (isLogin ? 'Painel de Acesso' : 'Criar Sua Conta')}
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            {isForgotPassword 
              ? 'Digite seu e-mail para receber as instruções' 
              : (isLogin ? 'Entre com suas credenciais autorizadas' : 'Preencha seus dados para registrar no sistema')}
          </p>
        </div>

        {/* Alerta de Link de Convite Válido */}
        {inviteData && (
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs space-y-1">
            <strong className="text-white block font-bold">📩 Convite Identificado!</strong>
            <p>E-mail: <span className="font-mono text-sky-300 font-bold">{inviteData.email}</span></p>
            <p className="text-[10px] text-sky-300/80">Crie sua senha abaixo para concluir seu registro na empresa.</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">E-mail Cadastrado</label>
              <div className="relative flex items-center">
                <Envelope className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium"
                />
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-sky-500 py-4 rounded-2xl font-black text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 active:scale-[0.98]">
              {loading ? <CircleNotch className="animate-spin" size={20} /> : 'Enviar E-mail de Recuperação'}
            </button>

            <button 
              type="button" 
              onClick={() => setIsForgotPassword(false)}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-white transition-colors pt-2 block"
            >
              Voltar ao Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Endereço de E-mail</label>
              <div className="relative flex items-center">
                <Envelope className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!inviteData}
                  placeholder="seu.email@empresa.com"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sua Senha</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] text-sky-400 hover:underline font-bold"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-sky-500 py-5 rounded-2xl font-black text-white hover:bg-sky-400 transition-all shadow-2xl shadow-sky-500/30 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer">
              {loading ? <CircleNotch className="animate-spin" size={24} /> : (
                <>
                  <span className="uppercase tracking-[0.2em] text-sm">{isLogin ? 'Entrar' : 'Registrar'}</span>
                  <SignIn size={20} className="opacity-50" />
                </>
              )}
            </button>
          </form>
        )}

        {!isForgotPassword && (
          <div className="pt-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {isLogin ? 'Não possui acesso?' : 'Já tem uma conta?'}
              <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-sky-500 hover:text-sky-400 transition-colors cursor-pointer">
                {isLogin ? 'Cadastrar-se' : 'Fazer Login'}
              </button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
