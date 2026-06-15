import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Agreement, AgreementStatus } from '../types';
import { parseLocalDate } from '../utils/date';

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
  searchTerm
}: UseAgreementsProps) => {
  const [monthAgreements, setMonthAgreements] = useState<Agreement[]>([]);
  const [paginatedAgreements, setPaginatedAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  
  const itemsPerPage = 8;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. QUERY DE ESTATÍSTICAS (Tudo do Mês)
  // Traz apenas os acordos criados no mês de faturamento selecionado para alimentar os KPIs e gráficos
  useEffect(() => {
    if (!organizationId || teamsToWatch.length === 0) {
      setMonthAgreements([]);
      setLoading(false);
      return;
    }

    setLoading(true);

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

    const unsubscribe = onSnapshot(qStats, (snapshot) => {
      if (!isMounted.current) return;
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      setMonthAgreements(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro na query de estatísticas:", error);
      if (isMounted.current) setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId, teamsToWatch, selectedMonth, selectedYear]);

  // Auxiliar para construir a query filtrada
  const buildFilteredQuery = useCallback((baseLimit?: number, startDoc?: QueryDocumentSnapshot<DocumentData> | null) => {
    let q = query(
      collection(db, 'agreements'),
      where('organizationId', '==', organizationId),
      where('teamId', 'in', teamsToWatch)
    );

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
  }, [filterStatus, dateFilter, customStartDate, customEndDate, selectedMonth, selectedYear, searchTerm]);

  // 2. QUERY DA TABELA PAGINADA
  useEffect(() => {
    if (!organizationId || teamsToWatch.length === 0) {
      setPaginatedAgreements([]);
      return;
    }

    // Se houver busca por texto, filtramos localmente em cima do monthAgreements para dar suporte a buscas parciais de cliente e CPF
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      const matched = monthAgreements.filter(a => 
        a.clientName.toLowerCase().includes(lowerSearch) ||
        a.clientCpf.includes(searchTerm)
      );
      
      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      setPaginatedAgreements(matched.slice(startIdx, endIdx));
      setHasNextPage(matched.length > endIdx);
      return;
    }

    // Caso padrão (Sem termo de busca): Paginação Real no Banco de Dados (Firestore)
    const cursor = pageHistory[currentPage - 1];
    
    // Consulta da página atual (trazendo limit + 1 para checar se há próxima página)
    const qPage = buildFilteredQuery(itemsPerPage + 1, cursor);

    const unsubscribe = onSnapshot(qPage, (snapshot) => {
      if (!isMounted.current) return;
      
      const docs = snapshot.docs;
      const hasMore = docs.length > itemsPerPage;
      setHasNextPage(hasMore);

      // Corta para o tamanho da página
      const pageDocs = hasMore ? docs.slice(0, itemsPerPage) : docs;
      const data = pageDocs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      
      setPaginatedAgreements(data);

      if (pageDocs.length > 0) {
        setFirstVisible(pageDocs[0]);
        setLastVisible(pageDocs[pageDocs.length - 1]);
      } else {
        setFirstVisible(null);
        setLastVisible(null);
      }
    }, (error) => {
      console.error("Erro na query paginada do Firestore:", error);
    });

    return () => unsubscribe();
  }, [organizationId, teamsToWatch, currentPage, pageHistory, monthAgreements, searchTerm, buildFilteredQuery]);

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
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      const matched = monthAgreements.filter(a => 
        a.clientName.toLowerCase().includes(lowerSearch) ||
        a.clientCpf.includes(searchTerm)
      );
      return Math.ceil(matched.length / itemsPerPage);
    }
    // Para paginação reativa do banco, calculamos com base no tamanho consolidado do mês filtrado
    // Se o filtro de status estiver ativo, calculamos sobre os acordos do mês com o status correspondente
    let baseList = monthAgreements;
    if (filterStatus !== 'all') {
      baseList = baseList.filter(a => a.status === filterStatus);
    }
    return Math.ceil(baseList.length / itemsPerPage) || 1;
  }, [monthAgreements, filterStatus, searchTerm]);

  return {
    monthAgreements,
    paginatedAgreements,
    loading,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage: currentPage > 1
  };
};
