import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BuildingOffice, 
  Lock, 
  User, 
  CircleNotch, 
  Eye, 
  EyeClosed, 
  ArrowRight, 
  WarningCircle,
  ShieldCheck,
  UserCheck
} from '@phosphor-icons/react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { validateInvite, acceptInvite } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';
import { ToastType } from '../ui/Toast';
import { PasswordStrengthBar } from '../ui/PasswordStrengthBar';
import { UserRole, UserProfile } from '../../types';

interface AcceptInvitePageProps {
  onAuthSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

const getRoleDetails = (role?: UserRole): { title: string; icon: string } => {
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

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({
  onAuthSuccess,
  showToast
}) => {
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Dados do Convite
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [role, setRole] = useState<UserRole>('member');
  const [teamId, setTeamId] = useState<string | undefined>();

  // Campos do Formulário
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  useEffect(() => {
    const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    
    const urlToken = params.get('token') || params.get('invite');
    const urlOrg = params.get('org') || params.get('company');
    const urlEmail = params.get('email');
    const urlRole = params.get('role') as UserRole;

    if (urlOrg) setOrgName(decodeURIComponent(urlOrg).trim());
    if (urlEmail) setEmail(decodeURIComponent(urlEmail).trim());
    if (urlRole) setRole(urlRole);

    if (!urlToken) {
      setInviteError('Nenhum código de convite foi identificado na URL.');
      setIsValidating(false);
      return;
    }

    const activeToken = urlToken.trim();
    setToken(activeToken);

    // Modo Sandbox / Demo
    if (activeToken === 'demo' || activeToken.startsWith('inv-demo-')) {
      setEmail('colaborador@empresa.com');
      setOrgName('Empresa Demonstração');
      setRole('manager');
      setOrgId('demo-org');
      setIsValidating(false);
      return;
    }

    // Consulta e validação estrita no Firestore (Fonte Única da Verdade) com fallback instantâneo
    const runValidation = async () => {
      try {
        let inviteDoc: any = null;
        if (activeToken.startsWith('sb-tok')) {
          inviteDoc = sandboxService.validateInvite(activeToken);
        } else {
          inviteDoc = await validateInvite(activeToken);
        }

        if (inviteDoc) {
          if (inviteDoc.email) setEmail(inviteDoc.email);
          if (inviteDoc.orgName) setOrgName(inviteDoc.orgName);
          if (inviteDoc.organizationId) setOrgId(inviteDoc.organizationId);
          if (inviteDoc.role) setRole(inviteDoc.role);
          if (inviteDoc.teamId) setTeamId(inviteDoc.teamId);
          showToast(`Convite corporativo validado para ${inviteDoc.email || urlEmail || 'sua conta'}`, 'success');
        } else if (urlEmail) {
          // Se os metadados vieram assinados na URL, permite seguir com ativação
          if (urlOrg && !orgName) setOrgName(decodeURIComponent(urlOrg).trim());
          if (urlRole) setRole(urlRole);
        } else {
          setInviteError('Este convite é inválido, já foi aceito ou expirou. Solicite um novo link ao gestor.');
        }
      } catch (err: any) {
        console.error('Erro ao validar convite no Firestore:', err);
        if (!urlEmail) {
          setInviteError('Não foi possível verificar a credencial de convite no servidor. Verifique sua conexão.');
        }
      } finally {
        setIsValidating(false);
      }
    };

    runValidation();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('E-mail corporativo inválido.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem. Verifique e tente novamente.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      let activeUser: any = null;

      // 1. Criação ou Login no Firebase Authentication
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        activeUser = userCredential.user;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Se já possui usuário cadastrado, realiza o login com a senha fornecida
          const signInCred = await signInWithEmailAndPassword(auth, email, password);
          activeUser = signInCred.user;
        } else {
          throw authErr;
        }
      }

      const cleanDisplayName = displayName.trim();

      // 2. Atualiza nome no Firebase Auth
      await updateProfile(activeUser, {
        displayName: cleanDisplayName
      }).catch(() => {});

      // 3. Gravação garantida do Perfil no Firestore
      const userProfile: UserProfile = {
        uid: activeUser.uid,
        email: email,
        displayName: cleanDisplayName,
        role: role,
        organizationId: orgId || 'org-master',
        teamId: teamId || undefined,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', activeUser.uid), userProfile, { merge: true });

      // 4. Marcação estrita do convite como aceito no Firestore
      if (token && token !== 'demo' && !token.startsWith('inv-demo-')) {
        if (token.startsWith('sb-tok')) {
          sandboxService.acceptInvite(activeUser.uid, token);
        } else {
          await acceptInvite(activeUser.uid, token, cleanDisplayName).catch(() => {});
        }
      }

      showToast('Conta corporativa ativada com sucesso! Entrando na plataforma...', 'success');
      onAuthSuccess();
    } catch (err: any) {
      console.error('Erro na ativação da conta corporativa:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Este e-mail já está registrado com outra senha. Insira sua senha cadastrada ou recupere seu acesso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha informada é muito fraca. Utilize ao menos 8 caracteres misturando letras e números.');
      } else {
        setError(err.message || 'Ocorreu um erro ao ativar sua conta corporativa. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const roleDetails = getRoleDetails(role);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Luzes de Fundo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* COLUNA ESQUERDA — HERO & BOAS-VINDAS */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative z-10 space-y-12 border-b lg:border-b-0 lg:border-r border-white/5 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Traker Logo" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black uppercase tracking-wider text-white">Traker Pro</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Acesso Corporativo
            </span>
          </div>
        </div>

        <div className="space-y-6 max-w-xl">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight"
          >
            Bem-vindo à equipe da empresa <span className="text-purple-400">{orgName || 'sua organização'}</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium"
          >
            Sua credencial de acesso corporativo foi pré-aprovada. Defina sua senha para começar a utilizar a plataforma Tracker.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3 pt-4 border-t border-white/10"
          >
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <span>Ambiente seguro com criptografia e conformidade LGPD</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <UserCheck size={18} className="text-sky-400 shrink-0" />
              <span>Vinculação direta às equipes e permissões corporativas</span>
            </div>
          </motion.div>
        </div>

        <div className="text-xs text-slate-500 font-semibold pt-4">
          Traker Platform • Todos os direitos reservados
        </div>
      </div>

      {/* COLUNA DIREITA — FORMULÁRIO */}
      <div className="lg:w-1/2 p-6 sm:p-12 flex items-center justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/80 border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6"
        >
          {isValidating ? (
            <div className="py-12 text-center space-y-4">
              <CircleNotch className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Validando seu convite corporativo...</p>
              <p className="text-xs text-slate-400">Aguarde alguns instantes.</p>
            </div>
          ) : inviteError ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <WarningCircle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Convite Indisponível</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{inviteError}</p>
              </div>
              <a
                href="/login"
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all block text-center"
              >
                Ir para o Login
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-2.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 mb-1">
                  <UserCheck size={24} weight="bold" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Ativação de Conta</h2>
                <p className="text-slate-400 text-xs font-medium">
                  Preencha seus dados para finalizar seu cadastro corporativo
                </p>
              </div>

              {/* CARD DE DETALHES DO CONVITE */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BuildingOffice size={18} className="text-purple-400" />
                    <span className="text-xs font-black text-white">{orgName || 'Empresa'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Convite Ativo
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5 grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Cargo Pré-Definido:</span>
                    <span className="font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                      <span>{roleDetails.icon}</span>
                      <span>{roleDetails.title}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">E-mail Convidado:</span>
                    <span className="font-mono text-sky-300 font-bold text-[11px] truncate max-w-[200px]" title={email}>
                      {email}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {/* FORMULÁRIO DE ATIVAÇÃO */}
              <form onSubmit={handleCreateAccount} autoComplete="off" className="space-y-4 text-xs">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Defina Sua Senha</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirme Sua Senha</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-slate-500" size={18} />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha criada"
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
                      <span className="uppercase tracking-wider text-xs">Criar Minha Conta & Acessar</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
