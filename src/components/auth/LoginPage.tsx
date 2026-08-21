import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Envelope, 
  Lock, 
  CircleNotch, 
  Eye, 
  EyeClosed, 
  ArrowRight, 
  BuildingOffice, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle,
  WarningCircle,
  User
} from '@phosphor-icons/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { validateInvite, acceptInvite } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';
import { ToastType } from '../ui/Toast';
import { PasswordStrengthBar } from '../ui/PasswordStrengthBar';
import { UserRole, UserProfile } from '../../types';

interface LoginPageProps {
  onAuthSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

const getRoleLabel = (role?: UserRole): { title: string; icon: string } => {
  switch (role) {
    case 'super_admin':
      return { title: 'Administrador Master', icon: '👑' };
    case 'manager':
      return { title: 'Gerente da Empresa', icon: '🏢' };
    case 'coordinator':
      return { title: 'Coordenador de Operações', icon: '🎯' };
    case 'supervisor':
      return { title: 'Supervisor de Equipe', icon: '👥' };
    case 'monitor':
      return { title: 'Monitor / QA', icon: '🛡️' };
    case 'backoffice':
      return { title: 'Backoffice', icon: '📋' };
    case 'member':
    default:
      return { title: 'Operador de Cobrança', icon: '🎧' };
  }
};

export const LoginPage = ({ onAuthSuccess, showToast }: LoginPageProps) => {
  // Inicialização inteligente: se a URL for /register ou tiver invite, não é tela de login
  const [isLogin, setIsLogin] = useState(() => {
    const fullUrl = window.location.href;
    return !fullUrl.includes('/register') && !fullUrl.includes('invite=') && !fullUrl.includes('token=');
  });

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados do Onboarding por Convite
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteValidating, setIsInviteValidating] = useState(false);

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    // Captura parâmetros tanto de search normal quanto de hash
    const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const token = params.get('invite') || params.get('token');
    const urlEmail = params.get('email');
    const urlOrg = params.get('org');
    const urlRole = params.get('role');
    const urlOrgId = params.get('orgId');

    if (token || urlEmail || urlOrg) {
      const activeToken = token || `inv-${Date.now()}`;
      setInviteToken(activeToken);
      setIsLogin(false);
      
      // Se a URL contém metadados, inicializa imediatamente
      const prefilled = {
        email: (urlEmail || '').trim().toLowerCase(),
        orgName: urlOrg ? decodeURIComponent(urlOrg) : 'Empresa Convidante',
        role: (urlRole || 'member') as UserRole,
        organizationId: urlOrgId || '',
        token: activeToken
      };
      
      setInviteData(prefilled);
      if (prefilled.email) {
        setEmail(prefilled.email);
      }

      // Se for demo
      if (token === 'demo' || token === 'demo-invite' || token?.startsWith('inv-demo-')) {
        const demoData = {
          email: urlEmail || 'colaborador.exemplo@empresa.com',
          role: (urlRole || 'manager') as UserRole,
          orgName: urlOrg ? decodeURIComponent(urlOrg) : 'Empresa Demonstração',
          organizationId: 'demo-org',
          token: activeToken
        };
        setInviteData(demoData);
        setEmail(demoData.email);
        return;
      }

      // Validação em background no Firestore (se houver conexão e token)
      if (token && !token.startsWith('sb-tok') && !urlEmail) {
        setIsInviteValidating(true);
        validateInvite(token).then((data) => {
          if (data) {
            setInviteData(data);
            setEmail(data.email);
            showToastRef.current(`Convite identificado para ${data.email}!`, 'success');
          }
        }).catch((err) => {
          console.warn('Fallback para dados do convite local:', err);
        }).finally(() => {
          setIsInviteValidating(false);
        });
      }
    }
  }, []);

  // Ativação e criação de conta via convite
  const handleActivateInviteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetEmail = (inviteData?.email || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Por favor, informe um e-mail corporativo válido.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const authResult = await createUserWithEmailAndPassword(auth, targetEmail, password);
      const uid = authResult.user.uid;
      const savedDisplayName = displayName.trim() || targetEmail.split('@')[0];
      
      await updateProfile(authResult.user, {
        displayName: savedDisplayName
      }).catch(() => {});

      const now = new Date().toISOString();
      const userProfile: UserProfile = {
        uid,
        email: targetEmail,
        displayName: savedDisplayName,
        role: inviteData?.role || 'member',
        organizationId: inviteData?.organizationId || 'org-master',
        teamId: inviteData?.teamId || undefined,
        acceptedTermsAt: now,
        createdAt: now
      };

      await setDoc(doc(db, 'users', uid), userProfile, { merge: true });
      try {
        localStorage.setItem('tracker_cached_profile', JSON.stringify(userProfile));
      } catch {}

      if (inviteToken) {
        if (inviteToken.startsWith('sb-tok')) {
          sandboxService.acceptInvite(uid, inviteToken);
        } else if (inviteToken !== 'demo' && !inviteToken.startsWith('inv-demo-')) {
          await acceptInvite(uid, inviteToken, savedDisplayName).catch(() => {});
        }
      }

      showToast('Conta ativada com sucesso! Bem-vindo à empresa.', 'success');
      onAuthSuccess();
    } catch (err: any) {
      console.error('Erro ao ativar conta por convite:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta cadastrada. Faça login com sua senha atual.');
      } else {
        setError(err.message || 'Erro ao criar conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Autenticação comum de Login / Registro
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Conta criada com sucesso!', 'success');
      }
      onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Erro ao realizar login.');
      }
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
      setError(err.message || 'Erro ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = getRoleLabel(inviteData?.role);

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
            {inviteData 
              ? `Integre a equipe da empresa ${inviteData.orgName || 'contratante'}`
              : 'Gerencie sua equipe de cobrança com inteligência'}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium"
          >
            {inviteData
              ? 'Sua credencial de acesso corporativo foi liberada. Configure sua senha para ingressar imediatamente.'
              : 'A plataforma enterprise definitiva para recovery. Precisão, segurança e resultados em tempo real.'}
          </motion.p>

          {/* Destaques de Produto com Bolinhas */}
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

      {/* COLUNA DIREITA — FORMULÁRIO */}
      <div className="lg:w-1/2 p-6 sm:p-12 flex items-center justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/70 border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6"
        >
          {/* ESTADO 1: CARREGANDO VALIDAÇÃO DO CONVITE */}
          {isInviteValidating ? (
            <div className="py-12 text-center space-y-4">
              <CircleNotch className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Validando credencial corporativa de convite...</p>
              <p className="text-xs text-slate-400">Aguarde alguns instantes.</p>
            </div>
          ) : inviteError ? (
            /* ESTADO 2: ERRO NO LINK DE CONVITE */
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <WarningCircle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Convite Indisponível</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{inviteError}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteToken(null);
                  setInviteError(null);
                  setIsLogin(true);
                  window.history.replaceState({}, document.title, '/login');
                }}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Ir para Login Normal
              </button>
            </div>
          ) : inviteData ? (
            /* ESTADO 3: ATIVAÇÃO DEDICADA DE CONVITE CORPORATIVO */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-1">
                  <UserCheck size={24} weight="bold" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Ativação de Conta</h2>
                <p className="text-slate-400 text-xs font-medium">
                  Complete seu cadastro para acessar o ambiente corporativo
                </p>
              </div>

              {/* CARD DE DETALHES DO CONVITE */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BuildingOffice size={18} className="text-purple-400" />
                    <span className="text-xs font-black text-white">{inviteData.orgName || 'Empresa'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Convite Ativo
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5 grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Cargo Atribuído:</span>
                    <span className="font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                      <span>{roleInfo.icon}</span>
                      <span>{roleInfo.title}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">E-mail Convidado:</span>
                    <span className="font-mono text-sky-300 font-bold text-[11px] truncate max-w-[200px]" title={inviteData.email}>
                      {inviteData.email}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {/* FORMULÁRIO DE DEFINIÇÃO DE SENHA */}
              <form onSubmit={handleActivateInviteAccount} autoComplete="off" className="space-y-4 text-xs">
                {!inviteData.email && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seu E-mail Corporativo</label>
                    <div className="relative flex items-center">
                      <Envelope className="absolute left-4 text-slate-500" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@empresa.com.br"
                        required
                        className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seu Nome Completo</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-4 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Criar Nova Senha</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-slate-500" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      required
                      minLength={8}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirmar Senha</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-slate-500" size={18} />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua nova senha"
                      required
                      minLength={8}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  disabled={loading} 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-black text-white transition-all shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer mt-2"
                >
                  {loading ? (
                    <CircleNotch className="animate-spin" size={20} />
                  ) : (
                    <>
                      <span className="uppercase tracking-wider text-xs">Ativar Minha Conta & Acessar</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ESTADO 4: LOGIN / REGISTRO COMUM */
            <>
              {/* Cabeçalho do Formulário */}
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
                        placeholder="nome@empresa.com.br"
                        required
                        className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium"
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
                        minLength={isLogin ? undefined : 8}
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
            </>
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
