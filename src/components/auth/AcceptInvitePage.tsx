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
  UserCheck,
  EnvelopeSimple
} from '@phosphor-icons/react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  deleteUser
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

  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [role, setRole] = useState<UserRole>('member');
  const [teamId, setTeamId] = useState<string | undefined>();
  const [isSandbox, setIsSandbox] = useState<boolean>(false);

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
    const urlOrgId = params.get('orgId') || params.get('org_id') || params.get('organizationId');
    const urlEmail = params.get('email');
    const urlRole = params.get('role') as UserRole;

    if (urlOrgId) setOrgId(urlOrgId.trim());
    if (urlOrg) setOrgName(decodeURIComponent(urlOrg).trim());
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail).trim());
      setInputEmail(decodeURIComponent(urlEmail).trim());
    }
    if (urlRole) setRole(urlRole);

    if (!urlToken) {
      setInviteError('Nenhum código de convite foi identificado na URL.');
      setIsValidating(false);
      return;
    }

    const activeToken = urlToken.trim();
    setToken(activeToken);

    if (auth.currentUser) {
      signOut(auth).catch(() => {});
      localStorage.removeItem('tracker_cached_profile');
    }

    if (activeToken === 'demo') {
      setIsSandbox(true);
      const activeEmail = urlEmail ? decodeURIComponent(urlEmail).trim() : 'colaborador@empresa.com';
      setEmail(activeEmail);
      setInputEmail(activeEmail);
      setOrgName('Empresa Demonstração');
      setRole('manager');
      setOrgId('demo-org');
      setIsValidating(false);
      return;
    }

    const runValidation = async () => {
      try {
        const urlOrgIdForValidate = params.get('orgId') || params.get('org_id') || params.get('organizationId');
        const inviteDoc = await validateInvite(activeToken, urlOrgIdForValidate?.trim() || undefined);

        if (inviteDoc) {
          if (inviteDoc.email) {
            setEmail(inviteDoc.email);
            setInputEmail(inviteDoc.email);
          }
          if (inviteDoc.orgName) setOrgName(inviteDoc.orgName);
          if (inviteDoc.organizationId) setOrgId(inviteDoc.organizationId);
          if (inviteDoc.role) setRole(inviteDoc.role);
          if (inviteDoc.teamId) setTeamId(inviteDoc.teamId);
          showToast(`Convite corporativo validado com sucesso!`, 'success');
        } else {
          setInviteError('Convite corporativo inválido, expirado ou revogado. Solicite um novo link à sua liderança.');
        }
      } catch (err: any) {
        console.error('[AcceptInvitePage] Erro ao validar convite:', err);
        setInviteError('Falha de conexão ao validar o convite corporativo. Verifique sua internet e tente novamente.');
      } finally {
        setIsValidating(false);
      }
    };

    runValidation();
  }, []);

  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeEmail = (email || inputEmail).trim().toLowerCase();

    if (!displayName.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!activeEmail || !activeEmail.includes('@')) {
      setError('Por favor, informe um e-mail corporativo válido.');
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

    if (!acceptedTerms) {
      setError('Você deve concordar com os Termos de Uso e Política de Privacidade (LGPD).');
      return;
    }

    if (!orgId && !isSandbox) {
      setError('INVITE_INVALID: Não foi possível identificar a empresa vinculada a este convite.');
      return;
    }

    setLoading(true);
    let activeUser: any = null;
    let authCreated = false;

    try {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, activeEmail, password);
        activeUser = userCredential.user;
        authCreated = true;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw new Error('Este e-mail já possui um cadastro ativo no sistema. Para aceitar um novo convite empresarial, a conta anterior deve ser excluída pelo administrador.');
        }
        throw authErr;
      }

      const cleanDisplayName = displayName.trim();
      const now = new Date().toISOString();

      await updateProfile(activeUser, {
        displayName: cleanDisplayName
      }).catch(() => {});

      // Força refresh do ID token antes de gravar perfil / chamar API
      const idToken = await activeUser.getIdToken(true);

      if (token && !isSandbox) {
        // Preferência: API Admin (bypassa rules do cliente / App Check / race de auth)
        let apiOk = false;
        try {
          const res = await fetch('/api/accept-invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              token,
              orgId: orgId || undefined,
              displayName: cleanDisplayName,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.success) {
            apiOk = true;
            if (data.profile?.role) setRole(data.profile.role);
            if (data.profile?.organizationId) setOrgId(data.profile.organizationId);
            if (data.profile?.orgName) setOrgName(data.profile.orgName);
          } else {
            console.warn('[AcceptInvitePage] API accept-invite falhou, tentando cliente:', data?.error || res.status);
            // Fallback cliente (pode falhar com permission-denied se rules/App Check estiverem errados)
            await acceptInvite(activeUser.uid, token, cleanDisplayName, orgId || undefined);
          }
        } catch (apiErr) {
          console.warn('[AcceptInvitePage] API accept-invite erro de rede, fallback cliente:', apiErr);
          await acceptInvite(activeUser.uid, token, cleanDisplayName, orgId || undefined);
        }
        void apiOk;
      } else if (token && isSandbox) {
        sandboxService.acceptInvite(activeUser.uid, token);
        const userProfile: Record<string, any> = {
          uid: activeUser.uid,
          email: activeEmail,
          displayName: cleanDisplayName,
          role: role,
          organizationId: orgId || 'sandbox-test',
          acceptedTermsAt: now,
          createdAt: now
        };
        if (teamId) userProfile.teamId = teamId;
        await setDoc(doc(db, 'users', activeUser.uid), userProfile, { merge: true });
      } else {
        const userProfile: Record<string, any> = {
          uid: activeUser.uid,
          email: activeEmail,
          displayName: cleanDisplayName,
          role: role,
          organizationId: orgId || 'sandbox-test',
          acceptedTermsAt: now,
          createdAt: now
        };
        if (teamId) userProfile.teamId = teamId;
        await setDoc(doc(db, 'users', activeUser.uid), userProfile, { merge: true });
      }

      try {
        const cached = {
          uid: activeUser.uid,
          email: activeEmail,
          displayName: cleanDisplayName,
          role,
          organizationId: orgId || 'sandbox-test',
          acceptedTermsAt: now,
          createdAt: now,
          ...(teamId ? { teamId } : {})
        };
        localStorage.setItem('tracker_cached_profile', JSON.stringify(cached));
      } catch {}

      showToast('Conta corporativa ativada com sucesso! Entrando na plataforma...', 'success');
      onAuthSuccess();
    } catch (err: any) {
      console.error('Erro na ativação da conta corporativa:', err);

      // Evita usuário órfão no Auth: se criamos a conta mas o perfil/convite falhou, remove do Auth
      if (authCreated && activeUser) {
        try {
          await deleteUser(activeUser);
          console.warn('[AcceptInvitePage] Conta Auth removida após falha no aceite do convite (evita e-mail preso).');
        } catch (delErr) {
          console.error('[AcceptInvitePage] Não foi possível remover conta Auth órfã:', delErr);
        }
        try {
          await signOut(auth);
        } catch {}
      }

      if (err.code === 'auth/weak-password') {
        setError('A senha informada é muito fraca. Utilize ao menos 8 caracteres misturando letras e números.');
      } else if (typeof err.message === 'string' && err.message.startsWith('INVITE_EMAIL_MISMATCH:')) {
        setError(err.message.replace('INVITE_EMAIL_MISMATCH: ', ''));
      } else if (typeof err.message === 'string' && err.message.startsWith('INVITE_INVALID:')) {
        setError(err.message.replace('INVITE_INVALID: ', ''));
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui um cadastro ativo no sistema. Para aceitar um novo convite empresarial, a conta anterior deve ser excluída pelo administrador.');
      } else if (err?.code === 'permission-denied' || (typeof err?.message === 'string' && err.message.includes('Missing or insufficient permissions'))) {
        setError('Falha de permissão ao gravar seu perfil. O administrador precisa publicar as regras no banco nomeado (ai-studio-...) ou aguardar o deploy da API /api/accept-invite. Tente novamente em instantes.');
      } else {
        setError(err.message || 'Erro ao ativar sua conta. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const roleDetails = getRoleDetails(role);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

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

                  {email && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">E-mail Convidado:</span>
                      <span className="font-mono text-sky-300 font-bold text-[11px] truncate max-w-[200px]" title={email}>
                        {email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateAccount} autoComplete="off" className="space-y-4 text-xs">
                {!email && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seu E-mail Corporativo</label>
                    <div className="relative flex items-center">
                      <EnvelopeSimple className="absolute left-4 text-slate-500" size={18} />
                      <input 
                        type="email" 
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="seu.email@empresa.com"
                        required
                        className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 font-medium font-mono"
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

                <label className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 leading-tight select-none">
                    Declaro que li e concordo com os <strong className="text-purple-300">Termos de Uso</strong> e <strong className="text-purple-300">Política de Privacidade (LGPD)</strong> para acesso à plataforma.
                  </span>
                </label>

                <button 
                  disabled={loading || !acceptedTerms} 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-black text-white transition-all shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
