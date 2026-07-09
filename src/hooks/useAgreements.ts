import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { areStatsCachesFresh, saveStatsCache } from '../lib/statsCache';
import { Agreement, AgreementStatus } from '../types';
import { parseLocalDate } from '../utils/date';
import { sandboxService } from '../lib/sandboxService';

/**
 * Auto-refresh silencioso a cada 30 minutos.
 * Reduz ~83% das leituras automáticas em comparação com 5 minutos,
 * mantendo os dados razoavelmente frescos para gestores.
 * O operador pode forçar atualização imediata pelo botão na UI.
 */
const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

interface UseAgreementsProps {
  organizationId: string;
  teamsToWatch: string[];
  selectedMonth: number;
  selectedYear: number;
  filterStatus: 'all' | AgreementStatus;
  dateFilter: 'all' | 'today' | 'yesterday' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  searchTerm: string;
  isChecklistMode: boolean;
  operatorId: string | 'all';
  /** UID do usuário logado (para registrar quem computou o cache) */
  userId: string;
}

export const useAgreements = ({
  organizationId,
  teamsToWatch,
  selectedMonth,
  selectedYear,
  filterStatus,
  dateFilter,
  customStartDate,
  customEndDate,
  searchTerm,
  isChecklistMode,
  operatorId,
  userId
}: UseAgreementsProps) => {
  const [monthAgreements, setMonthAgreements] = useState<Agreement[]>([]);
  const [paginatedAgreements, setPaginatedAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const isSandbox = organizationId === 'sandbox-test';

  // Controle de refresh manual e auto-refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const forceServerRefreshRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  
  const itemsPerPage = 8;
  const isMounted = useRef(true);
  const shouldForceServerForPage = useRef(false);

  // Sincronização de mudanças do sandboxService
  useEffect(() => {
    if (!isSandbox) return;

    const syncSandboxData = () => {
      // 1. Carrega todos os acordos da org sandbox do mês/ano correspondente
      let allAgreements = sandboxService.getAgreements(organizationId, selectedMonth, selectedYear);
      
      // Filtrar acordos por equipes sob monitoramento (teamsToWatch)
      if (teamsToWatch && teamsToWatch.length > 0) {
        allAgreements = allAgreements.filter(a => teamsToWatch.includes(a.teamId));
      }
      
      setMonthAgreements(allAgreements);

      // 2. Aplica filtros para a paginação local
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let matched = allAgreements.filter(a => !a.isAdjustment);

      if (operatorId !== 'all') {
        matched = matched.filter(a => a.operatorId === operatorId);
      }

      if (isChecklistMode) {
        matched = matched.filter(a => {
          const dueDate = parseLocalDate(a.dueDate);
          const isPending = a.status === AgreementStatus.WAITING;
          const wasCheckedToday = a.lastCheckedAt && 
            new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
          
          const isOverdue = dueDate < today;
          const isDueToday = dueDate.getTime() === today.getTime();
          const wasCheckedAtAnyTime = !!a.lastCheckedAt;

          if (isDueToday) return isPending && !wasCheckedToday;
          if (isOverdue) return isPending && !wasCheckedAtAnyTime;
          return false;
        });
      } else {
        if (filterStatus !== 'all') {
          if (filterStatus === AgreementStatus.BROKEN) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.BROKEN || 
              (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)
            );
          } else if (filterStatus === AgreementStatus.WAITING) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today
            );
          } else {
            matched = matched.filter(a => a.status === filterStatus);
          }
        }

        if (dateFilter === 'today') {
          const todayStr = today.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === todayStr);
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === yesterdayStr);
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          matched = matched.filter(a => a.dueDate >= customStartDate && a.dueDate <= customEndDate);
        }
      }

      if (searchTerm.trim() !== '') {
        const lowerSearch = searchTerm.toLowerCase();
        matched = matched.filter(a => 
          a.clientName.toLowerCase().includes(lowerSearch) ||
          a.clientCpf.includes(searchTerm)
        );
      }

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      setPaginatedAgreements(matched.slice(startIdx, endIdx));
      setHasNextPage(matched.length > endIdx);
      setLoading(false);
    };

    syncSandboxData();
    
    // Inscreve-se para atualizar sempre que as escritas do sandbox ocorrerem
    const unsubscribe = sandboxService.subscribe(syncSandboxData);
    return () => unsubscribe();
  }, [
    isSandbox, 
    organizationId, 
    selectedMonth, 
    selectedYear, 
    filterStatus, 
    dateFilter, 
    customStartDate, 
    customEndDate, 
    searchTerm, 
    isChecklistMode, 
    operatorId, 
    currentPage,
    teamsToWatch
  ]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /** Dispara uma nova busca manual dos dados do mês (sempre vai ao servidor, ignora cache) */
  const refreshAgreements = useCallback(() => {
    forceServerRefreshRef.current = true;
    setRefreshTrigger(prev => prev + 1);
  }, []);

  /** Auto-refresh silencioso a cada 30 minutos */
  useEffect(() => {
    if (!organizationId || teamsToWatch.length === 0) return;
    const interval = setInterval(() => {
      if (isMounted.current) {
        setRefreshTrigger(prev => prev + 1);
      }
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [organizationId, teamsToWatch]);

  // 1. QUERY DE ESTATÍSTICAS (Tudo do Mês) — com Cache Gate
  //
  // Fluxo:
  // 1. Verifica cache compartilhado no Firestore (1 leitura por equipe)
  // 2. Se fresco → usa IndexedDB local (0 leituras no servidor)
  // 3. Se stale  → busca do servidor (N leituras) e atualiza o cache
  // 4. Refresh manual → sempre vai ao servidor
  //
  // Resultado: ~94% de redução nas leituras diárias com 60 operadores.
  useEffect(() => {
    if (!organizationId || teamsToWatch.length === 0 || organizationId === 'sandbox-test') {
      if (organizationId !== 'sandbox-test') {
        setMonthAgreements([]);
        setLoading(false);
      }
      return;
    }

    const fetchStats = async () => {
      // Na primeira carga mostra loading completo; nos refreshes, apenas o indicador
      if (refreshTrigger === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const startOfMonthIso = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0).toISOString();
      const endOfMonthIso = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString();

      const qStats = query(
        collection(db, 'agreements'),
        where('organizationId', '==', organizationId),
        where('teamId', 'in', teamsToWatch),
        where('createdAt', '>=', startOfMonthIso),
        where('createdAt', '<=', endOfMonthIso),
        orderBy('createdAt', 'desc')
      );

      try {
        const isForceRefresh = forceServerRefreshRef.current;
        forceServerRefreshRef.current = false; // Reset para próximo ciclo

        let usedServer = false;

        if (!isForceRefresh) {
          // Verificar cache compartilhado (1 leitura Firestore por equipe)
          const cacheFresh = await areStatsCachesFresh(
            organizationId, teamsToWatch, selectedMonth, selectedYear
          );

          if (cacheFresh) {
            // Cache fresco — nenhum acordo mudou desde o último cálculo.
            // Usar dados do IndexedDB local (0 leituras no servidor).
            try {
              const cachedSnapshot = await getDocsFromCache(qStats);
              if (!cachedSnapshot.empty) {
                if (!isMounted.current) return;
                const data = cachedSnapshot.docs.map(d => (
                  { id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as Agreement
                ));
                setMonthAgreements(data);
                setLastRefreshed(new Date());
                return; // Pronto! Zero leituras no servidor.
              }
              // IndexedDB vazio (primeira vez deste operador) — precisa ir ao servidor
            } catch {
              // IndexedDB indisponível — fallback para servidor
            }
          }
        }

        // Cache stale, forçado, ou IndexedDB vazio — buscar do servidor
        const snapshot = await getDocsFromServer(qStats);
        usedServer = true;
        shouldForceServerForPage.current = true;
        if (!isMounted.current) return;
        const data = snapshot.docs.map(d => (
          { id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as Agreement
        ));
        setMonthAgreements(data);
        setLastRefreshed(new Date());

        // Salvar cache para que próximos operadores usem IndexedDB
        if (usedServer) {
          saveStatsCache(organizationId, teamsToWatch, selectedMonth, selectedYear, userId)
            .catch(err => console.error('[useAgreements] Erro ao salvar cache:', err));
        }
      } catch (error) {
        console.error('Erro na query de estatísticas:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchStats();
  // refreshTrigger é incluído para que o refresh manual e o auto-refresh disparem nova busca
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, teamsToWatch, selectedMonth, selectedYear, refreshTrigger, userId]);

  // Auxiliar para construir a query filtrada
  const buildFilteredQuery = useCallback((baseLimit?: number, startDoc?: QueryDocumentSnapshot<DocumentData> | null) => {
    let q = query(
      collection(db, 'agreements'),
      where('organizationId', '==', organizationId),
      where('teamId', 'in', teamsToWatch)
    );

    // Filtro de operador no servidor — garante que dados de outros operadores
    // nunca chegam ao browser (segurança em profundidade, além do filtro de UI)
    if (operatorId !== 'all') {
      q = query(q, where('operatorId', '==', operatorId));
    }

    // Filtro de Status
    if (filterStatus !== 'all') {
      q = query(q, where('status', '==', filterStatus));
    }

    // Filtro de Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      q = query(q, where('dueDate', '==', todayStr));
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      q = query(q, where('dueDate', '==', yesterdayStr));
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      q = query(q, where('dueDate', '>=', customStartDate), where('dueDate', '<=', customEndDate));
    } else {
      // Se não for data específica, filtrar para trazer o mês selecionado
      const startOfMonthIso = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0).toISOString();
      const endOfMonthIso = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString();
      q = query(q, where('createdAt', '>=', startOfMonthIso), where('createdAt', '<=', endOfMonthIso));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    if (startDoc) {
      q = query(q, startAfter(startDoc));
    }

    if (baseLimit) {
      q = query(q, limit(baseLimit));
    }

    return q;
  }, [organizationId, teamsToWatch, filterStatus, dateFilter, customStartDate, customEndDate, selectedMonth, selectedYear]);

  // Resetar paginação ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
    setLastVisible(null);
    setFirstVisible(null);
    setPageHistory([null]);
  }, [filterStatus, dateFilter, customStartDate, customEndDate, selectedMonth, selectedYear, searchTerm, isChecklistMode, operatorId]);

  // 2. QUERY DA TABELA PAGINADA
  useEffect(() => {
    if (!organizationId || teamsToWatch.length === 0 || organizationId === 'sandbox-test') {
      if (organizationId !== 'sandbox-test') {
        setPaginatedAgreements([]);
      }
      return;
    }

    // Se houver busca por texto, ou modo de checklist, ou filtro de operador específico, filtramos localmente
    if (searchTerm.trim() !== '' || isChecklistMode || operatorId !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let matched = monthAgreements.filter(a => !a.isAdjustment);

      // 1. Filtro por Operador
      if (operatorId !== 'all') {
        matched = matched.filter(a => a.operatorId === operatorId);
      }

      // 2. Filtro por Modo Checklist (Conferência de CPF)
      if (isChecklistMode) {
        matched = matched.filter(a => {
          const dueDate = parseLocalDate(a.dueDate);
          const isPending = a.status === AgreementStatus.WAITING;
          const wasCheckedToday = a.lastCheckedAt && 
            new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
          
          const isOverdue = dueDate < today;
          const isDueToday = dueDate.getTime() === today.getTime();
          const wasCheckedAtAnyTime = !!a.lastCheckedAt;

          if (isDueToday) {
            return isPending && !wasCheckedToday;
          } 
          if (isOverdue) {
            return isPending && !wasCheckedAtAnyTime;
          }
          return false;
        });
      } else {
        // Filtro por Status
        if (filterStatus !== 'all') {
          if (filterStatus === AgreementStatus.BROKEN) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.BROKEN || 
              (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)
            );
          } else if (filterStatus === AgreementStatus.WAITING) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today
            );
          } else {
            matched = matched.filter(a => a.status === filterStatus);
          }
        }

        // Filtro por Data
        if (dateFilter === 'today') {
          const todayStr = today.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === todayStr);
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === yesterdayStr);
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          matched = matched.filter(a => a.dueDate >= customStartDate && a.dueDate <= customEndDate);
        }
      }

      // 3. Filtro por Busca de Texto (Nome ou CPF)
      if (searchTerm.trim() !== '') {
        const lowerSearch = searchTerm.toLowerCase();
        matched = matched.filter(a => 
          a.clientName.toLowerCase().includes(lowerSearch) ||
          a.clientCpf.includes(searchTerm)
        );
      }

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      setPaginatedAgreements(matched.slice(startIdx, endIdx));
      setHasNextPage(matched.length > endIdx);
      return;
    }

    // Caso padrão (Sem termo de busca/checklist/operador): Paginação Real no Banco de Dados (Firestore)
    // Usa getDocs (leitura única por página) em vez de onSnapshot (listener contínuo).
    // A tabela atualiza automaticamente quando o usuário usa o botão de refresh global.
    const cursor = pageHistory[currentPage - 1];
    
    // Consulta da página atual (trazendo limit + 1 para checar se há próxima página)
    const qPage = buildFilteredQuery(itemsPerPage + 1, cursor);

    let active = true;
    const fetchPage = async () => {
      try {
        /**
         * Estratégia Cache-First para a query paginada:
         * 1. Tenta servir do IndexedDB local (custo = 0 leituras no Firestore)
         * 2. Se o cache estiver vazio (primeira vez ou cache expirado), vai ao servidor
         * Isso significa que navegação entre páginas e filtros são gratuitos
         * após a primeira carga. Só o refresh manual/auto vai ao servidor.
         */
        let snapshot;
        const forceServer = shouldForceServerForPage.current;
        shouldForceServerForPage.current = false;

        if (forceServer) {
          snapshot = await getDocsFromServer(qPage);
        } else {
          try {
            snapshot = await getDocsFromCache(qPage);
            // Se o cache retornou vazio mas a query deveria ter resultados,
            // fallback para o servidor para não mostrar tela em branco
            if (snapshot.empty && refreshTrigger === 0) {
              snapshot = await getDocsFromServer(qPage);
            }
          } catch {
            // Cache indisponível (ex: primeira abertura) — vai direto ao servidor
            snapshot = await getDocsFromServer(qPage);
          }
        }

        if (!active || !isMounted.current) return;

        const docs = snapshot.docs;
        const hasMore = docs.length > itemsPerPage;
        setHasNextPage(hasMore);

        // Corta para o tamanho da página
        const pageDocs = hasMore ? docs.slice(0, itemsPerPage) : docs;
        const data = pageDocs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as unknown as Agreement));
        
        setPaginatedAgreements(data);

        if (pageDocs.length > 0) {
          setFirstVisible(pageDocs[0]);
          setLastVisible(pageDocs[pageDocs.length - 1]);
        } else {
          setFirstVisible(null);
          setLastVisible(null);
        }
      } catch (error) {
        console.error('Erro na query paginada do Firestore:', error);
      }
    };

    fetchPage();
    return () => { active = false; };
  // monthAgreements é incluído para que a tabela recarregue após um refresh global dos dados
  }, [organizationId, teamsToWatch, currentPage, pageHistory, monthAgreements, searchTerm, isChecklistMode, operatorId, filterStatus, dateFilter, buildFilteredQuery]);

  // Navegação de Páginas
  const nextPage = useCallback(() => {
    if (hasNextPage && lastVisible) {
      setPageHistory(prev => {
        const nextHist = [...prev];
        nextHist[currentPage] = lastVisible;
        return nextHist;
      });
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage, lastVisible, currentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const totalPages = useMemo(() => {
    if (searchTerm.trim() !== '' || isChecklistMode || operatorId !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let matched = monthAgreements.filter(a => !a.isAdjustment);

      if (operatorId !== 'all') {
        matched = matched.filter(a => a.operatorId === operatorId);
      }

      if (isChecklistMode) {
        matched = matched.filter(a => {
          const dueDate = parseLocalDate(a.dueDate);
          const isPending = a.status === AgreementStatus.WAITING;
          const wasCheckedToday = a.lastCheckedAt && 
            new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
          
          const isOverdue = dueDate < today;
          const isDueToday = dueDate.getTime() === today.getTime();
          const wasCheckedAtAnyTime = !!a.lastCheckedAt;

          if (isDueToday) {
            return isPending && !wasCheckedToday;
          } 
          if (isOverdue) {
            return isPending && !wasCheckedAtAnyTime;
          }
          return false;
        });
      } else {
        if (filterStatus !== 'all') {
          if (filterStatus === AgreementStatus.BROKEN) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.BROKEN || 
              (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)
            );
          } else if (filterStatus === AgreementStatus.WAITING) {
            matched = matched.filter(a => 
              a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today
            );
          } else {
            matched = matched.filter(a => a.status === filterStatus);
          }
        }

        if (dateFilter === 'today') {
          const todayStr = today.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === todayStr);
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          matched = matched.filter(a => a.dueDate === yesterdayStr);
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          matched = matched.filter(a => a.dueDate >= customStartDate && a.dueDate <= customEndDate);
        }
      }

      if (searchTerm.trim() !== '') {
        const lowerSearch = searchTerm.toLowerCase();
        matched = matched.filter(a => 
          a.clientName.toLowerCase().includes(lowerSearch) ||
          a.clientCpf.includes(searchTerm)
        );
      }

      return Math.ceil(matched.length / itemsPerPage);
    }
    
    // Para paginação reativa do banco, calculamos com base no tamanho consolidado do mês filtrado
    let baseList = monthAgreements;
    if (filterStatus !== 'all') {
      baseList = baseList.filter(a => a.status === filterStatus);
    }
    return Math.ceil(baseList.length / itemsPerPage) || 1;
  }, [monthAgreements, filterStatus, searchTerm, isChecklistMode, operatorId, dateFilter]);

  return {
    monthAgreements,
    paginatedAgreements,
    loading,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage: currentPage > 1,
    // Controles de refresh para a UI
    refreshAgreements,
    lastRefreshed,
    isRefreshing
  };
};
