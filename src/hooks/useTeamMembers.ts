import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Team } from '../types';
import { getTeamData, getTeamMembers } from '../lib/teams';
import { sandboxService } from '../lib/sandboxService';

interface UseTeamMembersProps {
  profile: UserProfile;
  selectedTeamId: string;
}

export const useTeamMembers = ({ profile, selectedTeamId }: UseTeamMembersProps) => {
  const [currentTeamMembers, setCurrentTeamMembers] = useState<UserProfile[]>([]);
  const [managedTeamsData, setManagedTeamsData] = useState<Team[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);

  /**
   * Estabiliza a referência do array managedTeams comparando por valor (JSON).
   * Sem isso, se o componente pai recriar o array com o mesmo conteúdo a cada render,
   * os useEffects abaixo seriam disparados desnecessariamente, gerando leituras extras no Firestore.
   */
  const managedTeamsKey = useMemo(
    () => JSON.stringify([...(profile.managedTeams || [])].sort()),
    [profile.managedTeams]
  );
  const stableManagedTeams = useRef<string[]>(profile.managedTeams || []);
  useEffect(() => {
    stableManagedTeams.current = profile.managedTeams || [];
  }, [managedTeamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSandbox = profile.organizationId === 'sandbox-test';

  // 0. Sincronização Sandbox
  useEffect(() => {
    if (!isSandbox) return;

    const syncSandboxTeams = () => {
      setLoading(true);

      // Carregar Equipes Gerenciadas
      let validTeams: Team[] = [];
      if (profile.role === 'manager') {
        const allTeams = sandboxService.getTeams(profile.organizationId);
        const mySupervisorsUids = sandboxService.getUsers(profile.organizationId)
          .filter(u => u.role === 'supervisor' && u.managerId === profile.uid)
          .map(u => u.uid);
        validTeams = allTeams.filter(team => 
          team.managerId === profile.uid || 
          (team.supervisorId && mySupervisorsUids.includes(team.supervisorId))
        );
      } else if (profile.role === 'coordinator' || profile.role === 'monitor') {
        validTeams = sandboxService.getTeams(profile.organizationId);
      } else if (profile.managedTeams && profile.managedTeams.length > 0) {
        validTeams = profile.managedTeams
          .map(id => sandboxService.getTeam(id))
          .filter((t): t is Team => t !== null);
      } else if (profile.teamId) {
        const t = sandboxService.getTeam(profile.teamId);
        if (t) validTeams = [t];
      }
      setManagedTeamsData(validTeams);

      // Carregar Membros da Equipe Selecionada
      if (selectedTeamId !== 'all') {
        const members = sandboxService.getTeamMembers(selectedTeamId);
        setCurrentTeamMembers(members.filter(m => m.role === 'member'));
      } else {
        // Obter todos os membros acessíveis
        let accessibleTeamIds: string[] = [];
        if (profile.role === 'manager') {
          accessibleTeamIds = validTeams.map(t => t.id);
        } else if (profile.role === 'coordinator' || profile.role === 'monitor') {
          accessibleTeamIds = sandboxService.getTeams(profile.organizationId).map(t => t.id);
        } else if (profile.managedTeams && profile.managedTeams.length > 0) {
          accessibleTeamIds = profile.managedTeams;
        } else if (profile.teamId) {
          accessibleTeamIds = [profile.teamId];
        }

        if (accessibleTeamIds.length > 0) {
          const flatMembers = accessibleTeamIds.flatMap(id => sandboxService.getTeamMembers(id));
          const uniqueMembersMap: Record<string, UserProfile> = {};
          flatMembers.forEach(m => {
            if (m.role === 'member') {
              uniqueMembersMap[m.uid] = m;
            }
          });
          setCurrentTeamMembers(Object.values(uniqueMembersMap));
        } else {
          setCurrentTeamMembers([]);
        }
      }
      setLoading(false);
    };

    syncSandboxTeams();
    const unsubscribe = sandboxService.subscribe(syncSandboxTeams);
    return () => unsubscribe();
  }, [isSandbox, selectedTeamId, profile.role, profile.organizationId, profile.managedTeams, profile.teamId]);

  // 1. Carregar membros quando o time selecionado muda
  useEffect(() => {
    if (profile.organizationId === 'sandbox-test') return;
    let active = true;
    const loadMembers = async () => {
      setLoading(true);
      if (selectedTeamId !== 'all') {
        try {
          const members = await getTeamMembers(selectedTeamId);
          if (active) {
            setCurrentTeamMembers(members.filter(m => m.role === 'member'));
            setSelectedMemberId('all');
          }
        } catch (err) {
          console.error("Erro ao carregar membros da equipe:", err);
          if (active) setCurrentTeamMembers([]);
        }
      } else {
        try {
          let accessibleTeamIds: string[] = [];
          if (profile.role === 'manager' && profile.organizationId) {
            const teamsRef = collection(db, 'teams');
            const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
            const snap = await getDocs(q);
            const allTeams = snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));

            const usersRef = collection(db, 'users');
            const supsQ = query(usersRef, where('organizationId', '==', profile.organizationId), where('role', '==', 'supervisor'));
            const supsSnap = await getDocs(supsQ);
            const mySupervisorsUids = supsSnap.docs
              .map(doc => doc.data() as UserProfile)
              .filter(s => s.managerId === profile.uid)
              .map(s => s.uid);

            accessibleTeamIds = allTeams
              .filter(team => team.managerId === profile.uid || (team.supervisorId && mySupervisorsUids.includes(team.supervisorId)))
              .map(t => t.id);
          } else if (profile.role === 'coordinator' && profile.organizationId) {
            const snap = await getDocs(query(collection(db, 'teams'), where('organizationId', '==', profile.organizationId)));
            accessibleTeamIds = snap.docs.map(d => d.id);
          } else if (profile.managedTeams && profile.managedTeams.length > 0) {
            accessibleTeamIds = profile.managedTeams;
          }
          
          if (accessibleTeamIds.length > 0) {
            const allMembersPromises = accessibleTeamIds.map(id => getTeamMembers(id));
            const allMembersResults = await Promise.all(allMembersPromises);
            const flatMembers = allMembersResults.flat();
            
            const uniqueMembersMap: Record<string, UserProfile> = {};
            flatMembers.forEach(m => {
              if (m.role === 'member') {
                uniqueMembersMap[m.uid] = m;
              }
            });
            if (active) {
              setCurrentTeamMembers(Object.values(uniqueMembersMap));
              setSelectedMemberId('all');
            }
          } else {
            if (active) {
              setCurrentTeamMembers([]);
              setSelectedMemberId('all');
            }
          }
        } catch (error) {
          console.error("Erro ao carregar todos os membros:", error);
          if (active) {
            setCurrentTeamMembers([]);
            setSelectedMemberId('all');
          }
        }
      }
      if (active) setLoading(false);
    };

    loadMembers();
    return () => {
      active = false;
    };
  // managedTeamsKey garante estabilidade de referência: só re-executa se o conteúdo do array mudar
  }, [selectedTeamId, profile.role, profile.organizationId, managedTeamsKey]);

  // 2. Carregar informações das equipes gerenciadas
  useEffect(() => {
    if (profile.organizationId === 'sandbox-test') return;
    let active = true;
    const loadTeamsData = async () => {
      let validTeams: Team[] = [];
      try {
        if (profile.role === 'manager' && profile.organizationId) {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
          const snap = await getDocs(q);
          const allTeams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

          const usersRef = collection(db, 'users');
          const supsQ = query(usersRef, where('organizationId', '==', profile.organizationId), where('role', '==', 'supervisor'));
          const supsSnap = await getDocs(supsQ);
          const mySupervisorsUids = supsSnap.docs
            .map(doc => doc.data() as UserProfile)
            .filter(s => s.managerId === profile.uid)
            .map(s => s.uid);

          validTeams = allTeams.filter(team => 
            team.managerId === profile.uid || 
            (team.supervisorId && mySupervisorsUids.includes(team.supervisorId))
          );
        } else if (profile.managedTeams && profile.managedTeams.length > 0) {
          // Supervisor carrega as equipes gerenciadas
          const teams = await Promise.all(
            profile.managedTeams.map(id => getTeamData(id))
          );
          validTeams = teams.filter((t): t is Team => t !== null);
        } else if (profile.teamId) {
          // Operador carrega sua equipe própria
          const t = await getTeamData(profile.teamId);
          if (t) validTeams = [t];
        }
        if (active) setManagedTeamsData(validTeams);
      } catch (err) {
        console.error("Erro ao carregar informações de equipes:", err);
      }
    };

    loadTeamsData();
    return () => {
      active = false;
    };
  // managedTeamsKey garante estabilidade de referência: só re-executa se o conteúdo do array mudar
  }, [profile.role, profile.organizationId, managedTeamsKey, profile.teamId]);

  return {
    currentTeamMembers,
    setCurrentTeamMembers,
    managedTeamsData,
    selectedMemberId,
    setSelectedMemberId,
    loading
  };
};
