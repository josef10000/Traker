import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Envelope, Lock, SignIn, CircleNotch, Eye, EyeClosed, ArrowRight } from '@phosphor-icons/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { validateInvite, acceptInvite } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';
import { ToastType } from '../ui/Toast';
import { PasswordStrengthBar } from '../ui/PasswordStrengthBar';

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
      
      if (token === 'demo' || token === 'demo-invite' || token.startsWith('inv-demo-')) {
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
            setIsLogin(false);
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
        if (inviteData && email.trim().toLowerCase() !== inviteData.email.toLowerCase()) {
          throw new Error(`Este link de convite pertence a ${inviteData.email}. Por favor, registre-se com este e-mail.`);
        }

        const authResult = await createUserWithEmailAndPassword(auth, email, password);
        
        if (inviteToken) {
          if (inviteToken.startsWith('sb-tok')) {
            sandboxService.acceptInvite(authResult.user.uid, inviteToken);
          } else if (inviteToken === 'demo' || inviteToken === 'demo-invite' || inviteToken.startsWith('inv-demo-')) {
            // Token de demonstração/teste - apenas simula aceite
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Luzes de fundo ambientais */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* COLUNA ESQUERDA — HERO & DESTAQUES */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative z-10 space-y-12 border-b lg:border-b-0 lg:border-r border-white/5 bg-slate-950/60 backdrop-blur-md">
        {/* Marca & Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Traker Logo" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black uppercase tracking-wider text-white">Traker Pro</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Enterprise
            </span>
          </div>
        </div>

        {/* Mensagem Principal de Alto Impacto */}
        <div className="space-y-6 max-w-xl">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight"
          >
            Gerencie sua equipe de cobrança com inteligência
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium"
          >
            A plataforma enterprise definitiva para recovery. Precisão, segurança e resultados em tempo real.
          </motion.p>

          {/* Destaques de Produto com Bolinhas (sem ícones grandes) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 pt-4 border-t border-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-2 shadow-sm shadow-sky-400/50" />
              <div>
                <p className="text-sm font-bold text-white">Analytics Avançado</p>
                <p className="text-xs text-slate-400 mt-0.5">Insights profundos da sua carteira e faturamento</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2 shadow-sm shadow-emerald-400/50" />
              <div>
                <p className="text-sm font-bold text-white">Operação Real-time</p>
                <p className="text-xs text-slate-400 mt-0.5">Atualizações instantâneas de status e produção</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 mt-2 shadow-sm shadow-purple-400/50" />
              <div>
                <p className="text-sm font-bold text-white">Segurança Enterprise</p>
                <p className="text-xs text-slate-400 mt-0.5">Criptografia end-to-end e controle de acesso LGPD</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Rodapé da Coluna Esquerda */}
        <div className="text-xs text-slate-500 font-semibold pt-4">
          Traker Platform • Todos os direitos reservados
        </div>
      </div>

      {/* COLUNA DIREITA — FORMULÁRIO DE LOGIN */}
      <div className="lg:w-1/2 p-6 sm:p-12 flex items-center justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/60 border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8"
        >
          {/* Cabeçalho do Formulário com Círculo Pulsante */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {isForgotPassword ? 'Recuperar Senha' : (isLogin ? 'Bem-vindo de volta' : 'Criar Sua Conta')}
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              {isForgotPassword 
                ? 'Digite seu e-mail para receber as instruções de recuperação' 
                : (isLogin ? 'Entre com suas credenciais para acessar a plataforma' : 'Preencha seus dados para concluir seu cadastro')}
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">E-mail Corporativo</label>
                <div className="relative flex items-center">
                  <Envelope className="absolute left-4 text-slate-500" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    required
                    className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-sky-500 py-4 rounded-2xl font-black text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
                {loading ? <CircleNotch className="animate-spin" size={20} /> : 'Enviar E-mail de Recuperação'}
              </button>

              <button 
                type="button" 
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-white transition-colors pt-2 block cursor-pointer"
              >
                Voltar ao Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">E-mail Corporativo</label>
                <div className="relative flex items-center">
                  <Envelope className="absolute left-4 text-slate-500" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!inviteData}
                    placeholder="nome@empresa.com.br"
                    required
                    className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Senha</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] text-slate-400 hover:text-sky-400 font-bold transition-colors cursor-pointer"
                    >
                      Esqueceu sua senha?
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
                    minLength={isLogin ? undefined : 12}
                    title={isLogin ? undefined : "A senha para novos cadastros deve ter pelo menos 12 caracteres"}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {/* Barra de força de senha — visível apenas no modo de cadastro */}
                {!isLogin && <PasswordStrengthBar password={password} />}
              </div>

              <button disabled={loading} type="submit" className="w-full bg-sky-500 py-4.5 rounded-2xl font-black text-white hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
                {loading ? <CircleNotch className="animate-spin" size={22} /> : (
                  <>
                    <span className="uppercase tracking-wider text-xs">{isLogin ? 'Entrar na Plataforma' : 'Registrar Conta'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {!isForgotPassword && (
            <div className="pt-4 border-t border-white/5 text-center space-y-3">
              <p className="text-[11px] text-slate-500 font-medium">
                Precisa de acesso? Entre em contato com seu gestor
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {isLogin ? 'Não possui conta?' : 'Já tem uma conta?'}
                <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-sky-400 hover:underline transition-colors cursor-pointer">
                  {isLogin ? 'Cadastrar-se' : 'Fazer Login'}
                </button>
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* BADGE FLUTUANTE DE STATUS NO CANTO INFERIOR DIREITO */}
      <a
        href="/status"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-slate-900 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer shadow-2xl backdrop-blur-md group"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span>Status da Plataforma: 100% Operacional</span>
        <span className="text-slate-500 group-hover:text-emerald-300 transition-colors">↗</span>
      </a>
    </div>
  );
};
