import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Team } from '../types';
import { getTeamData, getTeamMembers } from '../lib/teams';

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

  // 1. Carregar membros quando o time selecionado muda
  useEffect(() => {
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
    let active = true;
    const loadTeamsData = async () => {
      let validTeams: Team[] = [];
      try {
        if (profile.role === 'manager' && profile.organizationId) {
          // Manager carrega todas as equipes da organização
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
          const snap = await getDocs(q);
          validTeams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
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
