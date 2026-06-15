import React, { useState, useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { Onboarding } from './components/auth/Onboarding';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { getUserProfile } from './lib/teams';
import { UserProfile } from './types';

import { Toast, ToastType } from './components/ui/Toast';
import { AnimatePresence } from 'motion/react';
import { DynamicBackground } from './components/ui/DynamicBackground';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOrgActive, setIsOrgActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'profile' | 'create-team'>('dashboard');
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userProfile = await getUserProfile(u.uid);
          setProfile(userProfile);
          
          if (userProfile && userProfile.organizationId && userProfile.role !== 'super_admin') {
            const orgSnap = await getDoc(doc(db, 'organizations', userProfile.organizationId));
            if (orgSnap.exists()) {
              setIsOrgActive(orgSnap.data().status === 'active');
            } else {
              setIsOrgActive(false);
            }
          } else {
            setIsOrgActive(true);
          }
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
          setProfile(null);
          setIsOrgActive(true);
        }
      } else {
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
      document.documentElement.setAttribute('data-theme', 'sky');
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
            setIsOrgActive(orgSnap.data().status === 'active');
          } else {
            setIsOrgActive(false);
          }
        } else {
          setIsOrgActive(true);
        }
      } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
      }
      setView('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={48} />
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
        <LoginPage onAuthSuccess={() => {}} showToast={showToast} />
      </>
    );
  }

  if (!isOrgActive) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md p-8 rounded-3xl border border-white/5 bg-slate-900/20 space-y-6">
          <ShieldAlert className="text-rose-500 mx-auto animate-pulse" size={48} />
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
            }} 
            className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
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
        <AdminDashboard 
          profile={profile}
          onLogoutSuccess={refreshProfile}
          showToast={showToast}
        />
      </>
    );
  }

  const hasNoTeam = !profile?.teamId;
  const isSupervisorWithManagedTeams = profile?.role === 'supervisor' && (profile?.managedTeams?.length || 0) > 0;
  const isManager = profile?.role === 'manager';

  if (!profile || (!isManager && hasNoTeam && !isSupervisorWithManagedTeams)) {
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
        <Onboarding user={user} profile={profile} onComplete={refreshProfile} showToast={showToast} />
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
      {view === 'profile' ? (
        <ProfileSettings 
          profile={profile} 
          onUpdate={refreshProfile}
          onBack={() => setView('dashboard')}
          onCreateTeam={() => setView('create-team')}
          showToast={showToast}
        />
      ) : view === 'create-team' ? (
        <Onboarding 
          user={user} 
          profile={profile}
          onComplete={refreshProfile} 
          isAdditionalTeam={true}
          onBack={() => setView('profile')}
          showToast={showToast}
        />
      ) : (
        <Dashboard 
          user={user} 
          profile={profile} 
          onSettingsClick={() => setView('profile')} 
          showToast={showToast}
        />
      )}
    </>
  );
}
