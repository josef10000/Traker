import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { WarningCircle, IconContext } from '@phosphor-icons/react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useDesignMode } from './hooks/useDesignMode';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { Onboarding } from './components/auth/Onboarding';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { getUserProfile } from './lib/teams';
import { UserProfile } from './types';
import { sandboxService } from './lib/sandboxService';
import { Toast, ToastType } from './components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicBackground } from './components/ui/DynamicBackground';

export function AppContent() {
  const [designMode, setDesignMode] = useDesignMode();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOrgActive, setIsOrgActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [simulation, setSimulation] = useState<{ active: boolean; role: 'manager' | 'supervisor' | 'member' | 'monitor' | 'backoffice' | 'coordinator' } | null>(null);
  const [simulatedUid, setSimulatedUid] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    if (simulation?.active) {
      // Define o UID inicial com base na role selecionada
      if (simulation.role === 'manager') {
        setSimulatedUid('sandbox-manager-a');
      } else if (simulation.role === 'coordinator') {
        setSimulatedUid('sandbox-coordinator-a');
      } else if (simulation.role === 'supervisor') {
        setSimulatedUid('sandbox-supervisor-a1');
      } else if (simulation.role === 'monitor') {
        setSimulatedUid('sandbox-user-monitor');
      } else if (simulation.role === 'backoffice') {
        setSimulatedUid('sandbox-user-backoffice');
      } else {
        setSimulatedUid('sandbox-op-1');
      }
      // Inicializa/Reseta dados em memória do Sandbox
      sandboxService.resetSandbox();
    } else {
      setSimulatedUid('');
    }
  }, [simulation]);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        try {
          const userProfile = await getUserProfile(u.uid);
          setProfile(userProfile);
          
          if (userProfile && userProfile.organizationId && userProfile.role !== 'super_admin') {
            const orgSnap = await getDoc(doc(db, 'organizations', userProfile.organizationId));
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              let active = orgData.status === 'active';
              if (active && orgData.planExpiresAt) {
                const expiresDate = new Date(orgData.planExpiresAt + 'T23:59:59');
                const today = new Date();
                if (today > expiresDate) {
                  active = false;
                }
              }
              setIsOrgActive(active);
            } else {
              setIsOrgActive(false);
            }
          } else {
            setIsOrgActive(true);
          }

          setUser(u);
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
          setProfile(null);
          setIsOrgActive(true);
          setUser(u);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsOrgActive(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [profile?.theme]);

  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        
        if (userProfile && userProfile.organizationId && userProfile.role !== 'super_admin') {
          const orgSnap = await getDoc(doc(db, 'organizations', userProfile.organizationId));
          if (orgSnap.exists()) {
            const orgData = orgSnap.data();
            let active = orgData.status === 'active';
            if (active && orgData.planExpiresAt) {
              const expiresDate = new Date(orgData.planExpiresAt + 'T23:59:59');
              const today = new Date();
              if (today > expiresDate) {
                active = false;
              }
            }
            setIsOrgActive(active);
          } else {
            setIsOrgActive(false);
          }
        } else {
          setIsOrgActive(true);
        }
      } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
      }
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden selection:bg-sky-500/30">
        <DynamicBackground theme="dark" />
        
        <div className="absolute w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              filter: ["drop-shadow(0 0 10px rgba(14, 165, 233, 0.2))", "drop-shadow(0 0 20px rgba(14, 165, 233, 0.4))", "drop-shadow(0 0 10px rgba(14, 165, 233, 0.2))"]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative"
          >
            <img src="/logo.png" alt="Tracker Logo" className="w-[432px] h-[432px] object-contain" />
          </motion.div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tighter italic">TRACKER</h2>
            <div className="h-1 w-12 bg-sky-500 mx-auto rounded-full"></div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 animate-pulse">
              Carregando Ambiente...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
        <Routes>
          <Route path="/login" element={<LoginPage onAuthSuccess={() => navigate('/')} showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  if (!isOrgActive) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md p-8 rounded-3xl border border-white/5 bg-slate-900/20 space-y-6">
          <WarningCircle className="text-rose-500 mx-auto animate-pulse" size={48} />
          <h2 className="text-2xl font-bold text-white">Acesso Suspenso</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            O acesso para a organização vinculada à sua conta foi temporariamente suspenso.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Entre em contato com o suporte ou o administrador do sistema para mais informações.
          </p>
          <button 
            onClick={async () => {
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setIsOrgActive(true);
              navigate('/login');
            }} 
            className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (profile?.role === 'super_admin' || profile?.organizationId === 'sandbox-test') {
    if (simulation?.active) {
      const rawProfile = sandboxService.getProfile(simulatedUid);
      const simulatedProfile: UserProfile = rawProfile ? {
        ...rawProfile,
        email: profile.email || '', // Mantém o email do usuário real
        theme: profile.theme || 'dark'
      } : {
        uid: 'sandbox-manager-a',
        email: profile.email || '',
        displayName: 'Arthur (Gerente A)',
        role: 'manager',
        organizationId: 'sandbox-test',
        theme: profile.theme || 'dark',
        createdAt: new Date().toISOString()
      };

      return (
        <>
          <AnimatePresence>
            {toast && (
              <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast(null)} 
              />
            )}
          </AnimatePresence>

          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-950/95 to-indigo-950/95 backdrop-blur-md border-b border-purple-500/30 px-6 py-3 flex justify-between items-center no-print shadow-lg">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500"></span>
              </span>
              <p className="text-xs font-bold text-purple-200">
                AMBIENTE DE TESTE ATIVO — Simulando <span className="uppercase text-white font-black">{simulatedProfile.displayName}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={async () => {
                  sandboxService.resetSandbox();
                  setSimulation(null);
                  if (profile?.role !== 'super_admin') {
                    await signOut(auth);
                    navigate('/login');
                    showToast('Sessão do Sandbox encerrada.', 'info');
                  } else {
                    showToast('Simulação encerrada. Dados de teste descartados.', 'info');
                  }
                }}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-purple-500 transition-colors shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
              >
                {profile?.role === 'super_admin' ? 'Sair da Simulação' : 'Sair do Sandbox'}
              </button>
            </div>
          </div>

          <div className="pt-12">
            <DynamicBackground theme={simulatedProfile.theme} />
            <Routes>
              <Route path="/" element={
                <Dashboard 
                  user={user} 
                  profile={simulatedProfile} 
                  onSettingsClick={() => navigate('/profile')} 
                  showToast={showToast}
                />
              } />
              <Route path="/profile" element={
                <ProfileSettings 
                  profile={simulatedProfile} 
                  onUpdate={(updatedData) => {
                    if (updatedData) {
                      sandboxService.setProfile({
                        ...simulatedProfile,
                        ...updatedData
                      });
                      showToast('Perfil simulado atualizado na memória!', 'success');
                    }
                  }}
                  onBack={() => navigate('/')}
                  onCreateTeam={() => navigate('/create-team')}
                  showToast={showToast}
                />
              } />
              <Route path="/create-team" element={
                <Onboarding 
                  user={user} 
                  profile={simulatedProfile}
                  onComplete={() => {
                    showToast('Equipe simulada criada com sucesso!', 'success');
                    navigate('/profile');
                  }} 
                  isAdditionalTeam={true}
                  onBack={() => navigate('/profile')}
                  showToast={showToast}
                />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </>
      );
    }

    return (
      <>
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
        <Routes>
          <Route path="/" element={
            <AdminDashboard 
              profile={profile}
              onLogoutSuccess={refreshProfile}
              showToast={showToast}
              onStartSimulation={(role) => setSimulation({ active: true, role })}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  const hasNoTeam = !profile?.teamId;
  const isSupervisorWithManagedTeams = profile?.role === 'supervisor' && (profile?.managedTeams?.length || 0) > 0;
  const isManagerOrCoordinator = profile?.role === 'manager' || profile?.role === 'coordinator';

  if (!profile || (!isManagerOrCoordinator && hasNoTeam && !isSupervisorWithManagedTeams)) {
    return (
      <>
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
        <Routes>
          <Route path="/onboarding" element={<Onboarding user={user} profile={profile} onComplete={refreshProfile} showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <DynamicBackground theme={profile?.theme} />
      <Routes>
        <Route path="/" element={
          <Dashboard 
            user={user} 
            profile={profile} 
            onSettingsClick={() => navigate('/profile')} 
            showToast={showToast}
          />
        } />
        <Route path="/profile" element={
          <ProfileSettings 
            profile={profile} 
            onUpdate={refreshProfile}
            onBack={() => navigate('/')}
            onCreateTeam={() => navigate('/create-team')}
            showToast={showToast}
          />
        } />
        <Route path="/create-team" element={
          <Onboarding 
            user={user} 
            profile={profile}
            onComplete={refreshProfile} 
            isAdditionalTeam={true}
            onBack={() => navigate('/profile')}
            showToast={showToast}
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <IconContext.Provider value={{ weight: 'duotone', size: 16 }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </IconContext.Provider>
  );
}
