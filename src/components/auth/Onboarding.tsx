import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, ArrowRight, Loader2, Building, Shield } from 'lucide-react';
import { createTeam, joinTeam, createOrganization } from '../../lib/teams';
import { User } from 'firebase/auth';
import { UserProfile, UserRole } from '../../types';
import { collection, query, where, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { ToastType } from '../ui/Toast';

interface OnboardingProps {
  user: User;
  profile?: UserProfile | null;
  onComplete: () => void;
  isAdditionalTeam?: boolean;
  onBack?: () => void;
  showToast?: (message: string, type?: ToastType) => void;
}

export const Onboarding = ({ user, profile, onComplete, isAdditionalTeam, onBack, showToast }: OnboardingProps) => {
  const [mode, setMode] = useState<'choice' | 'create-org' | 'create-team' | 'join'>(
    isAdditionalTeam ? 'create-team' : 'choice'
  );
  const [orgName, setOrgName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean>(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'super_admin'),
          limit(1)
        );
        const snap = await getDocs(q);
        setHasSuperAdmin(!snap.empty);
      } catch (err) {
        console.error('Erro ao verificar Super Admin:', err);
        setHasSuperAdmin(true); // Segurança
      }
    };
    if (!isAdditionalTeam) {
      checkSuperAdmin();
    }
  }, [isAdditionalTeam]);

  const handleSetupSuperAdmin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.email!.split('@')[0],
        role: 'super_admin',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, userProfile);
      if (showToast) showToast('Acesso de Super Admin configurado com sucesso!', 'success');
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await createOrganization(user.uid, user.email!, orgName);
      if (showToast) showToast('Empresa criada com sucesso!', 'success');
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    if (!profile?.organizationId) {
      setError("Organização não identificada.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await createTeam(user.uid, user.email!, teamName, profile.organizationId);
      if (showToast) showToast('Equipe criada com sucesso!', 'success');
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await joinTeam(user.uid, user.email!, inviteToken);
      if (showToast) showToast('Você entrou na equipe com sucesso!', 'success');
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center text-slate-400 hover:text-white transition-colors"
          >
            Voltar
          </button>
        )}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isAdditionalTeam ? 'Criar Nova Equipe' : 'Bem-vindo ao RNV Gestão'}
          </h2>
          <p className="mt-2 text-slate-400">
            {isAdditionalTeam 
              ? 'Dê um nome para sua nova equipe de gestão.' 
              : 'Para começar, crie sua organização SaaS ou entre em uma equipe existente.'}
          </p>
        </div>

        <motion.div 
          layout
          className="glass-card p-8 rounded-3xl shadow-2xl border border-slate-800"
        >
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {mode === 'choice' && (
            <div className="space-y-4">
              <button 
                onClick={() => setMode('create-org')}
                className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-sky-500/10 border border-white/10 hover:border-sky-500/30 rounded-2xl transition-all group backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
                    <Building size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">Criar Nova Empresa</p>
                    <p className="text-xs text-slate-500">Quero criar uma conta SaaS para gerenciar minha empresa</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-600 group-hover:text-sky-400 transition-colors" />
              </button>

              <button 
                onClick={() => setMode('join')}
                className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-2xl transition-all group backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">Entrar em uma Equipe</p>
                    <p className="text-xs text-slate-500">Recebi um código de convite de um supervisor</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>

              {!hasSuperAdmin && (
                <button 
                  onClick={handleSetupSuperAdmin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                      <Shield size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Configurar Super Admin Master</p>
                      <p className="text-xs text-slate-500">Nenhum administrador geral detectado. Configurar esta conta como admin master.</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
                </button>
              )}
            </div>
          )}

          {mode === 'create-org' && (
            <form onSubmit={handleCreateOrg} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nome da Empresa / Organização</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sky-500/50 outline-none transition-all backdrop-blur-sm"
                  placeholder="Ex: Minha Empresa Ltda"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setMode('choice')}
                  className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-sky-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-sky-400 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Criar Empresa'}
                </button>
              </div>
            </form>
          )}

          {mode === 'create-team' && (
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nome da Equipe</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sky-500/50 outline-none transition-all backdrop-blur-sm"
                  placeholder="Ex: Time Comercial Sul"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                {onBack && (
                  <button 
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                  >
                    Voltar
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-sky-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-sky-400 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Criar Equipe'}
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Código de Convite</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-emerald-500/50 outline-none transition-all backdrop-blur-sm"
                  placeholder="Cole o código aqui..."
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setMode('choice')}
                  className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-emerald-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar na Equipe'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
