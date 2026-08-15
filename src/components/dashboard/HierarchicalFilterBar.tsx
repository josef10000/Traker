import React, { useMemo } from 'react';
import { 
  Buildings, 
  Briefcase, 
  UserCheck, 
  Users, 
  Tag,
  Funnel
} from '@phosphor-icons/react';
import { Team, UserProfile, UserRole } from '../../types';

export interface HierarchyFilterState {
  product: string;       // 'all' ou nome do produto (ex: 'Consignado', 'Cartões', etc.)
  managerId: string;     // 'all' ou uid do gerente
  supervisorId: string;  // 'all' ou uid do supervisor
  teamId: string;        // 'all' ou id da equipe
}

interface HierarchicalFilterBarProps {
  userRole: UserRole;
  userProfile: UserProfile;
  teams: Team[];
  managers?: UserProfile[];
  supervisors: UserProfile[];
  filters: HierarchyFilterState;
  onFilterChange: (newFilters: HierarchyFilterState) => void;
  className?: string;
  isCompact?: boolean;
}

export const HierarchicalFilterBar: React.FC<HierarchicalFilterBarProps> = ({
  userRole,
  userProfile,
  teams = [],
  managers = [],
  supervisors = [],
  filters,
  onFilterChange,
  className = '',
  isCompact = false
}) => {
  const isSuperAdminOrCoord = userRole === 'super_admin' || userRole === 'coordinator';
  const isManager = userRole === 'manager';
  const isSupervisor = userRole === 'supervisor';

  // 1. Extrair Lista de Produtos Disponíveis
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => {
      const prod = t.product || (t as any).portfolio;
      if (prod && typeof prod === 'string' && prod.trim()) {
        set.add(prod.trim());
      }
    });

    // Se o gerente tiver managedProducts
    if (isManager && userProfile.managedProducts && userProfile.managedProducts.length > 0) {
      return userProfile.managedProducts;
    }

    const list = Array.from(set).sort();
    if (list.length === 0) {
      return ['Carteira Geral', 'Consignado', 'Cartões', 'Veículos'];
    }
    return list;
  }, [teams, isManager, userProfile]);

  // 2. Gerentes Filtrados por Produto
  const filteredManagers = useMemo(() => {
    if (!isSuperAdminOrCoord) return [];
    if (filters.product === 'all') return managers;
    return managers.filter(m => {
      if (m.managedProducts?.includes(filters.product) || m.product === filters.product) return true;
      // Verificar se alguma equipe desse produto é gerenciada por ele
      const managerTeam = teams.find(t => (t.product === filters.product || (t as any).portfolio === filters.product) && t.managerId === m.uid);
      return !!managerTeam;
    });
  }, [isSuperAdminOrCoord, filters.product, managers, teams]);

  // 3. Supervisores Filtrados por Produto & Gerente
  const filteredSupervisors = useMemo(() => {
    if (isSupervisor) return [];
    let sups = supervisors;

    // Se for Gerente, filtra os supervisores das suas equipes
    if (isManager) {
      const managerTeamIds = new Set(teams.filter(t => t.managerId === userProfile.uid || !t.managerId).map(t => t.id));
      sups = sups.filter(s => {
        if (s.managerId === userProfile.uid) return true;
        const managesTeam = s.managedTeams?.some(tid => managerTeamIds.has(tid)) || (s.teamId && managerTeamIds.has(s.teamId));
        return managesTeam;
      });
    } else if (filters.managerId !== 'all') {
      sups = sups.filter(s => s.managerId === filters.managerId);
    }

    // Filtrar por Produto
    if (filters.product !== 'all') {
      const productTeamIds = new Set(teams.filter(t => (t.product === filters.product || (t as any).portfolio === filters.product)).map(t => t.id));
      sups = sups.filter(s => {
        if (s.product === filters.product) return true;
        const inProductTeam = s.managedTeams?.some(tid => productTeamIds.has(tid)) || (s.teamId && productTeamIds.has(s.teamId));
        return inProductTeam;
      });
    }

    return sups;
  }, [isSupervisor, isManager, userProfile, filters.managerId, filters.product, supervisors, teams]);

  // 4. Equipes Filtradas por Produto, Gerente e Supervisor
  const filteredTeams = useMemo(() => {
    let tList = teams;

    // Supervisor só vê as suas equipes
    if (isSupervisor) {
      const supManaged = new Set(userProfile.managedTeams || (userProfile.teamId ? [userProfile.teamId] : []));
      return tList.filter(t => supManaged.has(t.id) || t.supervisorId === userProfile.uid);
    }

    // Gerente só vê equipes sob sua gerência
    if (isManager) {
      tList = tList.filter(t => t.managerId === userProfile.uid || !t.managerId);
    } else if (filters.managerId !== 'all') {
      tList = tList.filter(t => t.managerId === filters.managerId);
    }

    // Filtrar por Produto
    if (filters.product !== 'all') {
      tList = tList.filter(t => (t.product === filters.product || (t as any).portfolio === filters.product));
    }

    // Filtrar por Supervisor
    if (filters.supervisorId !== 'all') {
      tList = tList.filter(t => t.supervisorId === filters.supervisorId);
    }

    return tList;
  }, [teams, isSupervisor, isManager, userProfile, filters.managerId, filters.product, filters.supervisorId]);

  // Handlers de Mudança em Cascata
  const handleProductChange = (prod: string) => {
    onFilterChange({
      product: prod,
      managerId: 'all',
      supervisorId: 'all',
      teamId: 'all'
    });
  };

  const handleManagerChange = (mId: string) => {
    onFilterChange({
      ...filters,
      managerId: mId,
      supervisorId: 'all',
      teamId: 'all'
    });
  };

  const handleSupervisorChange = (sId: string) => {
    onFilterChange({
      ...filters,
      supervisorId: sId,
      teamId: 'all'
    });
  };

  const handleTeamChange = (tId: string) => {
    onFilterChange({
      ...filters,
      teamId: tId
    });
  };

  // Se for Supervisor, exibe apenas o seletor de suas equipes
  if (isSupervisor) {
    return (
      <div className={`flex items-center gap-2 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-2xl ${className}`}>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
          <Users size={14} className="text-emerald-400" />
          Minha Equipe:
        </span>
        <select
          value={filters.teamId}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-950 border border-white/10 text-white focus:border-emerald-500 transition-all cursor-pointer"
        >
          <option value="all">👥 Todas as Minhas Equipes (Consolidado)</option>
          {filteredTeams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 p-2 bg-slate-950/80 border border-white/10 rounded-2xl backdrop-blur-md ${className}`}>
      <div className="flex items-center gap-1.5 px-2 text-slate-400 text-xs font-black uppercase tracking-wider shrink-0">
        <Funnel size={14} className="text-sky-400" />
        <span>Filtro Hierárquico:</span>
      </div>

      {/* 1. NÍVEL PRODUTO */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-xl">
        <Tag size={13} className="text-purple-400 shrink-0" />
        <select
          value={filters.product}
          onChange={(e) => handleProductChange(e.target.value)}
          className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
        >
          <option value="all">🏷️ Todos os Produtos</option>
          {availableProducts.map(p => (
            <option key={p} value={p}>🏷️ {p}</option>
          ))}
        </select>
      </div>

      {/* 2. NÍVEL GERENTE (Apenas Coordenador e Super Admin) */}
      {isSuperAdminOrCoord && (
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-xl">
          <Briefcase size={13} className="text-amber-400 shrink-0" />
          <select
            value={filters.managerId}
            onChange={(e) => handleManagerChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
          >
            <option value="all">👔 Todos os Gerentes</option>
            {filteredManagers.map(m => (
              <option key={m.uid} value={m.uid}>👔 {m.displayName || m.email}</option>
            ))}
          </select>
        </div>
      )}

      {/* 3. NÍVEL SUPERVISOR */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-xl">
        <UserCheck size={13} className="text-sky-400 shrink-0" />
        <select
          value={filters.supervisorId}
          onChange={(e) => handleSupervisorChange(e.target.value)}
          className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
        >
          <option value="all">👤 Todos os Supervisores</option>
          {filteredSupervisors.map(s => (
            <option key={s.uid} value={s.uid}>👤 {s.displayName || s.email}</option>
          ))}
        </select>
      </div>

      {/* 4. NÍVEL EQUIPE */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-xl">
        <Users size={13} className="text-emerald-400 shrink-0" />
        <select
          value={filters.teamId}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
        >
          <option value="all">👥 Todas as Equipes</option>
          {filteredTeams.map(t => (
            <option key={t.id} value={t.id}>👥 {t.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
