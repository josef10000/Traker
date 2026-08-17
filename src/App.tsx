import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { CircleNotch, IconContext } from '@phosphor-icons/react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useDesignMode } from './hooks/useDesignMode';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { useSpotlightShortcut } from './hooks/useSpotlightShortcut';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LoginPage } from './components/auth/LoginPage';
import { AcceptInvitePage } from './components/auth/AcceptInvitePage';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { PublicPortfolioView } from './components/dashboard/PublicPortfolioView';
import { DemoPage } from './components/demo/DemoPage';
import { SalesPresentationPage } from './components/public/SalesPresentationPage';
import { getUserProfile } from './lib/teams';
import { UserProfile, UserRole } from './types';
import { sandboxService } from './lib/sandboxService';
import { Toast, ToastType } from './components/ui/Toast';
import { AnimatePresence } from 'motion/react';
import { DynamicBackground } from './components/ui/DynamicBackground';
import { StatusPage } from './components/StatusPage';
import { SpotlightSearchModal } from './components/dashboard/SpotlightSearchModal';
import { AppLoadingScreen } from './components/app/AppLoadingScreen';
import { OrgSuspendedScreen } from './components/app/OrgSuspendedScreen';
import { DemoSimulationBanner } from './components/app/DemoSimulationBanner';

const isMasterAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return e === 'hubsymples@gmail.com' || e === 'admin@traker.com.br' || e.includes('hubsymples');
};

export function AppContent() {
  const [, setDesignMode] = useDesignMode();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('tracker_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isOrgActive, setIsOrgActive] = useState(true);
  const [loading, setLoading] = useState<boolean>(() => auth.currentUser !== null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Atalho de teclado Ctrl+K / Cmd+K via hook isolado
  useSpotlightShortcut(() => setIsSpotlightOpen(prev => !prev));

  // Aplica dinamicamente a preferência de tema de cores e cursor customizado
  useEffect(() => {
    const cursorStyle = profile?.customCursorStyle || 'cyan_enterprise';
    const themeStyle = profile?.theme || 'cyan';
    document.documentElement.setAttribute('data-cursor', cursorStyle);
    document.documentElement.setAttribute('data-theme', themeStyle);
  }, [profile?.customCursorStyle, profile?.theme]);

  const [simulation, setSimulation] = useState<{ active: boolean; role: UserRole; isDemoMode?: boolean; demoRestrictedRole?: UserRole } | null>(() => {
    try {
      const saved = sessionStorage.getItem('tracker_demo_simulation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [simulatedUid, setSimulatedUid] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<string>('profile');

  const handleOpenSettings = (tab?: string) => {
    setProfileInitialTab(tab || 'profile');
    setIsProfileModalOpen(true);
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (simulation?.active) {
      sessionStorage.setItem('tracker_demo_simulation', JSON.stringify(simulation));
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
      sandboxService.resetSandbox();
    } else {
      sessionStorage.removeItem('tracker_demo_simulation');
      setSimulatedUid('');
    }
  }, [simulation]);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // Logout automático por inatividade de 1 hora (ativo apenas quando usuário está autenticado)
  useInactivityLogout(
    user
      ? () => showToast('Sessão encerrada por inatividade. Faça login novamente.', 'info')
      : undefined
  );

  useEffect(() => {
    // Safety timer: Desbloqueia o carregamento em no máximo 800ms independente de rede/Firestore
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // Define o perfil otimista imediatamente para nao travar a tela de login
        let userProfile: UserProfile | null = null;
        try {
          const cached = localStorage.getItem('tracker_cached_profile');
          if (cached) userProfile = JSON.parse(cached);
        } catch {}

        if (!userProfile) {
          const isMaster = isMasterAdminEmail(u.email);
          userProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email?.split('@')[0] || (isMaster ? 'Super Admin Master' : 'Usuário'),
            role: isMaster ? 'super_admin' : 'manager',
            organizationId: isMaster ? undefined : 'org-master',
            createdAt: new Date().toISOString()
          };
        }

        setProfile(userProfile);
        setLoading(false);

        try {
          const freshProfile = await getUserProfile(u.uid);
          if (freshProfile) {
            userProfile = freshProfile;
          }

          if (isMasterAdminEmail(u.email)) {
            if (!userProfile) {
              userProfile = {
                uid: u.uid,
                email: u.email || 'hubsymples@gmail.com',
                displayName: u.displayName || u.email?.split('@')[0] || 'Super Admin Master',
                role: 'super_admin',
                createdAt: new Date().toISOString()
              };
              setDoc(doc(db, 'users', u.uid), userProfile, { merge: true }).catch(() => {});
            } else if (userProfile.role !== 'super_admin') {
              userProfile.role = 'super_admin';
              setDoc(doc(db, 'users', u.uid), { role: 'super_admin' }, { merge: true }).catch(() => {});
            }
          } else {
            if (!userProfile) {
              userProfile = {
                uid: u.uid,
                email: u.email || 'operador@traker.com.br',
                displayName: u.displayName || u.email?.split('@')[0] || 'Novo Usuário',
                role: 'manager',
                organizationId: 'org-master',
                createdAt: new Date().toISOString()
              };
              setDoc(doc(db, 'users', u.uid), userProfile, { merge: true }).catch(() => {});
            }
            if (!userProfile.organizationId) {
              userProfile.organizationId = 'org-master';
            }
          }

          setProfile(userProfile);
          try {
            localStorage.setItem('tracker_cached_profile', JSON.stringify(userProfile));
          } catch {}

          if (userProfile && userProfile.organizationId && userProfile.role !== 'super_admin') {
            getDoc(doc(db, 'organizations', userProfile.organizationId)).then(orgSnap => {
              if (orgSnap.exists()) {
                const orgData = orgSnap.data();
                let active = orgData.status === 'active';
                if (active && orgData.planExpiresAt) {
                  const expiresDate = new Date(orgData.planExpiresAt + 'T23:59:59');
                  if (new Date() > expiresDate) active = false;
                }
                setIsOrgActive(active);
              } else {
                setIsOrgActive(true);
              }
            }).catch(() => setIsOrgActive(true));
          } else {
            setIsOrgActive(true);
          }
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
          const isMaster = isMasterAdminEmail(u.email);
          const fallbackProfile: UserProfile = {
            uid: u.uid,
            email: u.email || 'hubsymples@gmail.com',
            displayName: u.displayName || u.email?.split('@')[0] || (isMaster ? 'Super Admin Master' : 'Novo Usuário'),
            role: isMaster ? 'super_admin' : 'manager',
            organizationId: isMaster ? undefined : 'org-master',
            createdAt: new Date().toISOString()
          };
          setProfile(fallbackProfile);
          setIsOrgActive(true);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsOrgActive(true);
        localStorage.removeItem('tracker_cached_profile');
      }
      setLoading(false);
      clearTimeout(safetyTimer);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('tracker-theme') as 'dark' | 'light' | null;
    const resolvedTheme = savedTheme || profile?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.theme]);

  const refreshProfile = async () => {
    if (user) {
      try {
        let userProfile = await getUserProfile(user.uid);
        if (isMasterAdminEmail(user.email)) {
          if (!userProfile) {
            userProfile = {
              uid: user.uid,
              email: user.email || 'hubsymples@gmail.com',
              displayName: user.displayName || user.email?.split('@')[0] || 'Super Admin Master',
              role: 'super_admin',
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', user.uid), userProfile);
            } catch (e) {
              console.error("Erro no auto-provisionamento:", e);
            }
          } else if (userProfile.role !== 'super_admin') {
            userProfile.role = 'super_admin';
            await setDoc(doc(db, 'users', user.uid), { role: 'super_admin' }, { merge: true }).catch(() => {});
          }
        } else {
          if (!userProfile) {
            userProfile = {
              uid: user.uid,
              email: user.email || 'operador@traker.com.br',
              displayName: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
              role: 'manager',
              organizationId: 'org-master',
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', user.uid), userProfile);
            } catch (e) {
              console.error("Erro no auto-provisionamento:", e);
            }
          }
          if (!userProfile.organizationId) {
            userProfile.organizationId = 'org-master';
          }
        }
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
    return <AppLoadingScreen />;
  }

  const isPublicRoute = window.location.pathname.startsWith('/public/');

  if (isPublicRoute) {
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
          <Route path="/public/portfolio" element={<PublicPortfolioView />} />
        </Routes>
      </>
    );
  }

  const handleStartDemo = (role: UserRole) => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as UserRole | null;
    const validRoles: UserRole[] = ['manager', 'coordinator', 'supervisor', 'member', 'backoffice', 'monitor'];
    const restrictedRole = (roleParam && validRoles.includes(roleParam)) ? roleParam : simulation?.demoRestrictedRole;

    setSimulation({ 
      active: true, 
      role, 
      isDemoMode: true, 
      demoRestrictedRole: restrictedRole 
    });
    showToast(`Simulação iniciada como ${role.toUpperCase()}!`, 'success');
  };

  // NOTA: /apresentacao, /vendas e /demo são tratados como <Route> dentro dos blocos <Routes> abaixo
  // para que useNavigate() funcione corretamente em SalesPresentationPage e DemoPage.

  const queryParams = new URLSearchParams(window.location.search);
  const hasInviteToken = queryParams.has('invite');

  if (hasInviteToken) {
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
          <Route path="/login" element={<LoginPage onAuthSuccess={refreshProfile} showToast={showToast} />} />
          <Route path="/register" element={<LoginPage onAuthSuccess={refreshProfile} showToast={showToast} />} />
          <Route path="/apresentacao" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="/vendas" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="/demo" element={<DemoPage onStartDemo={handleStartDemo} />} />
          <Route path="*" element={<Navigate to={`/register${window.location.search}`} replace />} />
        </Routes>
      </>
    );
  }

  // SIMULAÇÃO ATIVA (Tanto para SuperAdmin quanto para Visitantes na Rota /demo)
  if (simulation?.active) {
    const rawProfile = sandboxService.getProfile(simulatedUid);
    const simulatedProfile: UserProfile = rawProfile ? {
      ...rawProfile,
      email: profile?.email || 'demo@hubsymples.com.br',
      theme: profile?.theme || 'dark'
    } : {
      uid: simulatedUid || 'sandbox-op-1',
      email: profile?.email || 'demo@hubsymples.com.br',
      displayName: simulation.role === 'member' ? 'Ana Souza (Operadora)' : 
                   simulation.role === 'supervisor' ? 'Carlos (Supervisor)' :
                   simulation.role === 'coordinator' ? 'Mariana (Coordenadora)' :
                   simulation.role === 'monitor' ? 'Monitor de Qualidade' :
                   simulation.role === 'backoffice' ? 'Back Office Principal' : 'Arthur (Gerente)',
      role: simulation.role,
      organizationId: 'sandbox-test',
      teamId: simulation.role === 'member' || simulation.role === 'supervisor' || simulation.role === 'backoffice' ? 'team-fenix' : undefined,
      theme: profile?.theme || 'dark',
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

        <DemoSimulationBanner 
          displayName={simulatedProfile.displayName} 
          onEndDemo={async () => {
            const restrictedRole = simulation?.demoRestrictedRole;
            sessionStorage.removeItem('tracker_demo_simulation');
            sandboxService.resetSandbox();
            const wasDemo = simulation?.isDemoMode;
            setSimulation(null);
            if (wasDemo) {
              const targetUrl = restrictedRole ? `/demo?role=${restrictedRole}` : '/demo';
              window.history.replaceState({}, '', targetUrl);
              navigate(targetUrl);
            } else if (profile?.role !== 'super_admin') {
              await signOut(auth);
              navigate('/login');
              showToast('Sessão encerrada.', 'info');
            } else {
              showToast('Simulação encerrada.', 'info');
            }
          }}
        />

        <div className="pt-12">
          <DynamicBackground theme={simulatedProfile.theme} />
          <Routes>
            <Route path="/" element={
              <Dashboard 
                user={user} 
                profile={simulatedProfile} 
                onSettingsClick={handleOpenSettings} 
                showToast={showToast}
                onCreateTeam={() => {
                  setIsProfileModalOpen(false);
                  navigate('/create-team');
                }}
              />
            } />
            <Route path="/apresentacao" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
            <Route path="/vendas" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
            <Route path="/demo" element={<DemoPage onStartDemo={handleStartDemo} />} />
            <Route path="/create-team" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <ProfileSettings
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={simulatedProfile}
          initialTab={profileInitialTab}
          onUpdate={(updatedData) => {
            if (updatedData) {
              sandboxService.setProfile({
                ...simulatedProfile,
                ...updatedData
              });
              showToast('Perfil simulado atualizado na memória!', 'success');
            }
          }}
          onCreateTeam={() => {
            setIsProfileModalOpen(false);
            navigate('/create-team');
          }}
          showToast={showToast}
          theme={simulatedProfile.theme || 'dark'}
          onOpenReconciliation={() => window.dispatchEvent(new CustomEvent('open-reconciliation'))}
          onOpenMessageTemplates={() => window.dispatchEvent(new CustomEvent('open-message-templates'))}
        />
      </>
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
          <Route path="/register" element={<AcceptInvitePage onAuthSuccess={() => navigate('/')} showToast={showToast} />} />
          <Route path="/accept-invite" element={<AcceptInvitePage onAuthSuccess={() => navigate('/')} showToast={showToast} />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/demo" element={
            <DemoPage 
              onStartDemo={handleStartDemo} 
            />
          } />
          <Route path="/apresentacao" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="/vendas" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="*" element={
            (window.location.search.includes('invite=') || window.location.search.includes('token='))
              ? <Navigate to={`/accept-invite${window.location.search}`} replace />
              : <Navigate to={`/login${window.location.search}`} replace />
          } />
        </Routes>
      </>
    );
  }

  if (!isOrgActive) {
    return (
      <OrgSuspendedScreen 
        onReturnToLogin={async () => {
          await signOut(auth);
          setUser(null);
          setProfile(null);
          setIsOrgActive(true);
          navigate('/login');
        }}
      />
    );
  }

  if (profile?.role === 'super_admin') {
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
              onUpdateProfile={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : null)}
            />
          } />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/demo" element={
            <DemoPage 
              onStartDemo={handleStartDemo} 
            />
          } />
          <Route path="/apresentacao" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="/vendas" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <CircleNotch className="w-10 h-10 text-sky-400 animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Carregando ambiente...</p>
      </div>
    );
  }

  return (
    <>
      <DynamicBackground theme={profile?.theme} />
      <Routes>
        <Route path="/" element={
          <Dashboard 
            user={user} 
            profile={profile!} 
            onSettingsClick={handleOpenSettings} 
            showToast={showToast}
            onCreateTeam={() => {
              setIsProfileModalOpen(false);
              navigate('/');
            }}
          />
        } />
        <Route path="/apresentacao" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
        <Route path="/vendas" element={<SalesPresentationPage onStartDemo={handleStartDemo} />} />
        <Route path="/create-team" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {profile && (
        <>
          <ProfileSettings
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            profile={profile}
            initialTab={profileInitialTab}
            onUpdate={refreshProfile}
            onCreateTeam={() => {
              setIsProfileModalOpen(false);
              navigate('/create-team');
            }}
            showToast={showToast}
            theme={profile.theme || 'dark'}
            onOpenReconciliation={() => window.dispatchEvent(new CustomEvent('open-reconciliation'))}
            onOpenMessageTemplates={() => window.dispatchEvent(new CustomEvent('open-message-templates'))}
          />
          <SpotlightSearchModal 
            isOpen={isSpotlightOpen} 
            onClose={() => setIsSpotlightOpen(false)} 
            profile={profile} 
          />
        </>
      )}
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
