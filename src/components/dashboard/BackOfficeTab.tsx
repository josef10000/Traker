import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileCsv as FileSpreadsheet, 
  UploadSimple, 
  Trash, 
  Check, 
  X as XIcon, 
  FileArrowDown, 
  PaperPlaneTilt, 
  ChatText,
  MagnifyingGlass,
  Spinner,
  CaretLeft,
  CaretRight,
  Handshake,
  PencilSimple,
  CaretDown,
  CaretUp,
  ArrowsDownUp,
  SlidersHorizontal,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import { 
  collection, 
  setDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  flexRender, 
  SortingState, 
  VisibilityState,
  ColumnDef
} from '@tanstack/react-table';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { UserProfile, BackOfficeImport, BackOfficeClient, BackOfficeNote, Agreement, AgreementStatus } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomConfirm } from '../ui/CustomConfirm';
import ExcelJS from 'exceljs';

interface BackOfficeTabProps {
  profile: UserProfile;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  theme?: 'light' | 'dark';
  selectedTeamId?: string;
  onAttend?: (agreement: any) => void;
  agreements?: Agreement[];
}

export const BackOfficeTab: React.FC<BackOfficeTabProps> = ({
  profile,
  showToast,
  theme = 'dark',
  selectedTeamId = 'all',
  onAttend,
  agreements = []
}) => {
  // Estados para Importações
  const [imports, setImports] = useState<BackOfficeImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>('all');
  const [isLoadingImports, setIsLoadingImports] = useState(true);

  // Estados para edição dinâmica de cabeçalhos de coluna
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [newHeaderName, setNewHeaderName] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Estados para Clientes da Importação Selecionada
  const [clients, setClients] = useState<BackOfficeClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'treated' | 'ignored'>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para o TanStack Table (Ordenação e Visibilidade)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Resetar ordenação e visibilidade quando a importação muda
  useEffect(() => {
    setSorting([]);
    setColumnVisibility({});
    setIsColumnDropdownOpen(false);
    setCurrentPage(1);
  }, [selectedImportId]);

  // Estado de Upload de Arquivo
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    clientName: '',
    clientCpf: '',
    value: '',
    dueDate: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gaveta Lateral (Drawer) de Notas
  const [activeClientForNotes, setActiveClientForNotes] = useState<BackOfficeClient | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Lista consolidada de clientes para cruzamento de estatísticas
  const allOrgClients = useMemo(() => {
    if (clients.length > 0 && selectedImportId !== 'all') return clients;
    if (profile.organizationId === 'sandbox-test') {
      const imps = sandboxService.getBackofficeImports(profile.organizationId);
      const allCli: BackOfficeClient[] = [];
      imps.forEach(imp => {
        allCli.push(...sandboxService.getBackofficeClients(imp.id));
      });
      return allCli.length > 0 ? allCli : clients;
    }
    return clients;
  }, [clients, profile.organizationId, imports, selectedImportId]);

  // Cruzamento por CPF e Cálculo do Valor Recuperado R$
  const recoveryStats = useMemo(() => {
    if (!agreements || agreements.length === 0 || allOrgClients.length === 0) {
      return { totalRecoveredValue: 0, recoveredCount: 0 };
    }

    const clientCpfMap = new Map<string, BackOfficeClient>();
    allOrgClients.forEach(c => {
      const clean = (c.clientCpf || '').replace(/\D/g, '');
      if (clean) clientCpfMap.set(clean, c);
    });

    let totalRecoveredValue = 0;
    let recoveredCount = 0;

    agreements.forEach(ag => {
      if (!ag.clientCpf) return;
      const cleanCpf = ag.clientCpf.replace(/\D/g, '');
      if (clientCpfMap.has(cleanCpf)) {
        recoveredCount++;
        if (ag.status === AgreementStatus.PAID || (ag.status as any) === 'paid') {
          totalRecoveredValue += (ag.value || 0);
        }
      }
    });

    return { totalRecoveredValue, recoveredCount };
  }, [agreements, allOrgClients]);

  // Listener para carregar as importações da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const syncSandboxImports = () => {
        setIsLoadingImports(true);
        let list = sandboxService.getBackofficeImports(profile.organizationId);
        if (profile.role === 'supervisor' || profile.role === 'member') {
          list = list.filter(imp => imp.importedBy === profile.uid);
        }
        setImports(list);
        setIsLoadingImports(false);

        if (list.length > 0 && selectedImportId === 'all') {
          setSelectedImportId(list[0].id);
        }
      };
      syncSandboxImports();
      return sandboxService.subscribe(syncSandboxImports);
    }

    setIsLoadingImports(true);
    const q = query(
      collection(db, 'backoffice_imports'),
      where('organizationId', '==', profile.organizationId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BackOfficeImport[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (profile.role === 'backoffice' || data.importedBy === profile.uid) {
          list.push({ id: d.id, ...data } as BackOfficeImport);
        }
      });
      setImports(list);
      setIsLoadingImports(false);

      // Auto-seleciona a última importação se nenhuma estiver selecionada
      if (list.length > 0 && selectedImportId === 'all') {
        setSelectedImportId(list[0].id);
      }
    }, (error) => {
      console.error('Erro ao escutar importações:', error);
      showToast('Erro ao carregar histórico de planilhas.', 'error');
      setIsLoadingImports(false);
    });

    return () => unsubscribe();
  }, [profile.organizationId, selectedImportId]);

  // Listener para carregar os clientes da importação selecionada
  useEffect(() => {
    if (!profile.organizationId || selectedImportId === 'all') {
      setClients([]);
      return;
    }

    if (profile.organizationId === 'sandbox-test') {
      const syncSandboxClients = () => {
        setIsLoadingClients(true);
        const list = sandboxService.getBackofficeClients(selectedImportId);
        list.sort((a, b) => a.clientName.localeCompare(b.clientName));
        setClients(list);
        setIsLoadingClients(false);
        setCurrentPage(1);
      };
      syncSandboxClients();
      return sandboxService.subscribe(syncSandboxClients);
    }

    setIsLoadingClients(true);
    const q = query(
      collection(db, 'backoffice_clients'),
      where('importId', '==', selectedImportId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BackOfficeClient[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BackOfficeClient);
      });
      // Ordena por nome por padrão
      list.sort((a, b) => a.clientName.localeCompare(b.clientName));
      setClients(list);
      setIsLoadingClients(false);
      setCurrentPage(1); // Reseta paginação
    }, (error) => {
      console.error('Erro ao escutar clientes:', error);
      showToast('Erro ao carregar dados dos clientes.', 'error');
      setIsLoadingClients(false);
    });

    return () => unsubscribe();
  }, [selectedImportId, profile.organizationId]);

  // Renomear cabeçalho de coluna customizada dinamicamente
  const handleRenameHeader = async (oldHeader: string) => {
    const trimmed = newHeaderName.trim();
    if (!trimmed) {
      showToast('O nome da coluna não pode ser vazio.', 'warning');
      return;
    }
    if (trimmed === oldHeader || !selectedImportId) {
      setEditingHeader(null);
      return;
    }

    setIsSavingHeader(true);
    try {
      const importRef = doc(db, 'backoffice_imports', selectedImportId);
      const activeImportObj = imports.find(i => i.id === selectedImportId);
      if (!activeImportObj) return;

      // 1. Atualiza os headers na importação
      const updatedHeaders = activeImportObj.headers.map(h => h === oldHeader ? trimmed : h);
      
      // Atualiza o mapping caso estivesse mapeado
      const updatedMapping = { ...activeImportObj.columnMapping };
      Object.keys(updatedMapping).forEach(key => {
        if (updatedMapping[key as keyof typeof updatedMapping] === oldHeader) {
          (updatedMapping as any)[key] = trimmed;
        }
      });

      await updateDoc(importRef, {
        headers: updatedHeaders,
        columnMapping: updatedMapping
      });

      // 2. Atualiza todos os clientes vinculados a essa importação para trocar a chave no customFields
      const q = query(
        collection(db, 'backoffice_clients'),
        where('importId', '==', selectedImportId)
      );
      const snap = await getDocs(q);

      // Usando batch para atualizar de 500 em 500
      const batchSize = 500;
      const docsArray = snap.docs;

      for (let i = 0; i < docsArray.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docsArray.slice(i, i + batchSize);

        chunk.forEach(d => {
          const cli = d.data() as BackOfficeClient;
          const customFields = { ...cli.customFields };
          
          if (oldHeader in customFields) {
            customFields[trimmed] = customFields[oldHeader];
            delete customFields[oldHeader];
          }

          batch.update(d.ref, {
            customFields,
            updatedAt: new Date().toISOString()
          });
        });

        await batch.commit();
      }

      showToast(`Coluna renomeada para '${trimmed}' com sucesso!`, 'success');
      setEditingHeader(null);
      setNewHeaderName('');
    } catch (error) {
      console.error('[BackOfficeTab] Erro ao renomear coluna:', error);
      showToast('Erro ao renomear a coluna.', 'error');
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Atualizar gaveta lateral se o cliente selecionado tiver alterações reativas
  useEffect(() => {
    if (activeClientForNotes) {
      const updated = clients.find(c => c.id === activeClientForNotes.id);
      if (updated) {
        setActiveClientForNotes(updated);
      }
    }
  }, [clients]);

  // Função para tratar e formatar datas do Excel/CSV de forma robusta
  const formatExcelDate = (value: any): string => {
    if (!value && value !== 0) return '';
    
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Se for um número de série do Excel (representando dias desde 1900-01-01)
    if (typeof value === 'number' && value > 30000 && value < 60000) {
      try {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
      } catch (e) {
        return String(value);
      }
    }

    // Se for uma string numérica (como "46206") representando a data
    if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (num > 30000 && num < 60000) {
        try {
          const date = new Date(Math.round((num - 25569) * 86400 * 1000));
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${day}/${month}/${year}`;
        } catch (e) {
          return value;
        }
      }
    }

    return String(value).trim();
  };

  // Processar arquivo Excel/CSV localmente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload(file);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const ws = workbook.worksheets[0];

        if (!ws || ws.rowCount < 2) {
          showToast('A planilha selecionada está vazia.', 'error');
          setFileToUpload(null);
          return;
        }

        // Extrai cabeçalhos da primeira linha
        const headerRow = ws.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell((cell) => { headers.push(String(cell.value ?? '')); });

        // Converte todas as linhas para objetos
        const data: Record<string, any>[] = [];
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // pula cabeçalho
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            const cell = row.getCell(i + 1);
            obj[h] = cell.value ?? '';
          });
          data.push(obj);
        });

        if (data.length === 0) {
          showToast('A planilha selecionada está vazia.', 'error');
          setFileToUpload(null);
          return;
        }

        setExcelHeaders(headers);
        setExcelData(data);

        // Mapeamento automático inteligente inicial
        const mapping: Record<string, string> = {
          clientName: '',
          clientCpf: '',
          value: '',
          dueDate: ''
        };

        headers.forEach(h => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('nome') || lower.includes('cliente') || lower.includes('razao')) {
            mapping.clientName = h;
          } else if (lower.includes('cpf') || lower.includes('cnpj') || lower.includes('documento')) {
            mapping.clientCpf = h;
          } else if (lower.includes('valor') || lower.includes('saldo') || lower.includes('quantia')) {
            mapping.value = h;
          } else if (lower.includes('vencimento') || lower.includes('data') || lower.includes('prazo')) {
            mapping.dueDate = h;
          }
        });

        setColumnMapping(mapping);
        setIsMappingModalOpen(true);
      } catch (err) {
        console.error(err);
        showToast('Erro ao ler a planilha. Verifique o formato do arquivo.', 'error');
        setFileToUpload(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Salvar a importação e clientes no Firestore
  const handleConfirmImport = async () => {
    if (!fileToUpload || !profile.organizationId) return;

    // Validar mapeamentos obrigatórios
    if (!columnMapping.clientName || !columnMapping.clientCpf || !columnMapping.value || !columnMapping.dueDate) {
      showToast('Por favor, mapeie todos os campos obrigatórios do sistema.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const orgId = profile.organizationId;
      const teamId = profile.teamId || 'no-team';

      // 1. Criar cabeçalho da Importação
      const importId = `imp-${Date.now()}`;
      const importObj: BackOfficeImport = {
        id: importId,
        organizationId: orgId,
        teamId: teamId,
        importedBy: profile.uid,
        importedByName: profile.displayName || 'Usuário',
        fileName: fileToUpload.name,
        totalRows: excelData.length,
        validRows: 0,
        headers: excelHeaders,
        columnMapping: columnMapping,
        createdAt: new Date().toISOString()
      };

      let validCount = 0;
      const clientObjects: BackOfficeClient[] = [];

      excelData.forEach((row, index) => {
        const rawName = String(row[columnMapping.clientName] || '').trim();
        const rawCpf = String(row[columnMapping.clientCpf] || '').trim().replace(/\D/g, '');
        const rawVal = parseFloat(String(row[columnMapping.value] || '').replace(/[^\d.,-]/g, '').replace(',', '.'));
        const rawDate = formatExcelDate(row[columnMapping.dueDate]);

        if (!rawName || !rawCpf) return; // Ignora se não houver identificador

        validCount++;

        // Guarda dados customizados (todos os campos originais da linha menos os mapeados)
        const customFields: Record<string, string> = {};
        excelHeaders.forEach(h => {
          if (!Object.values(columnMapping).includes(h)) {
            customFields[h] = formatExcelDate(row[h]);
          }
        });

        clientObjects.push({
          id: `cli-${importId}-${index}`,
          importId: importId,
          organizationId: orgId,
          teamId: teamId,
          clientName: rawName,
          clientCpf: rawCpf,
          value: isNaN(rawVal) ? 0 : rawVal,
          dueDate: rawDate,
          customFields: customFields,
          notes: [],
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      importObj.validRows = validCount;

      if (clientObjects.length === 0) {
        showToast('Nenhum registro válido encontrado com Nome e CPF preenchidos.', 'error');
        setIsUploading(false);
        return;
      }

      // Salva os metadados do lote de importação
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.addBackofficeImport(importObj, clientObjects);
        showToast(`Planilha importada com sucesso no Sandbox! ${validCount} registros criados em memória.`, 'success');
        setSelectedImportId(importId);
        setIsMappingModalOpen(false);
        setFileToUpload(null);
        setExcelData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
        return;
      }

      await setDoc(doc(db, 'backoffice_imports', importId), importObj);

      // Salva os clientes em lotes (batch) de 500 no Firestore (limite do writeBatch)
      const batchSize = 500;
      for (let i = 0; i < clientObjects.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = clientObjects.slice(i, i + batchSize);

        chunk.forEach(cli => {
          batch.set(doc(db, 'backoffice_clients', cli.id), cli);
        });

        await batch.commit();
      }

      showToast(`Planilha importada com sucesso! ${validCount} registros criados.`, 'success');
      setSelectedImportId(importId);
      setIsMappingModalOpen(false);
      setFileToUpload(null);
      setExcelData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      showToast('Ocorreu um erro ao salvar os dados no Firestore.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Excluir importação inteira e todos os seus clientes
  const handleDeleteImport = async (importId: string) => {
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.deleteBackofficeImport(importId);
      showToast('Planilha e dados vinculados removidos da memória do Sandbox.', 'success');
      if (selectedImportId === importId) {
        setSelectedImportId('all');
      }
      return;
    }

    try {
      showToast('Excluindo planilha...', 'info');
      // Busca os clientes vinculados a essa importação para remover
      const q = query(collection(db, 'backoffice_clients'), where('importId', '==', importId));
      const snap = await getDocs(q);

      const batchSize = 500;
      const docsArray = snap.docs;
      
      for (let i = 0; i < docsArray.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docsArray.slice(i, i + batchSize);
        chunk.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      // Exclui a importação do Firestore
      const { deleteDoc: fireDelete } = await import('firebase/firestore');
      await fireDelete(doc(db, 'backoffice_imports', importId));

      showToast('Planilha e dados vinculados removidos com sucesso.', 'success');
      if (selectedImportId === importId) {
        setSelectedImportId('all');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover planilha do banco de dados.', 'error');
    }
  };

  // Atualizar Status do Cliente (pending, treated, ignored)
  const handleUpdateStatus = async (clientId: string, newStatus: 'pending' | 'treated' | 'ignored') => {
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.updateBackofficeClientStatus(clientId, newStatus);
      showToast('Status atualizado na memória do Sandbox.', 'success');
      return;
    }

    try {
      const ref = doc(db, 'backoffice_clients', clientId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      showToast('Status atualizado.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  // Adicionar Nota Rápida ao Cliente
  const handleAddNote = async () => {
    if (!newNoteText.trim() || !activeClientForNotes) return;

    setIsSavingNote(true);

    if (profile.organizationId === 'sandbox-test') {
      const newNote = {
        id: `note-${Date.now()}`,
        authorId: profile.uid,
        authorName: profile.displayName || 'Colaborador',
        content: newNoteText.trim(),
        createdAt: new Date().toISOString()
      };
      sandboxService.addBackofficeClientNote(activeClientForNotes.id, newNote);
      setNewNoteText('');
      showToast('Nota adicionada ao cliente em memória!', 'success');
      setIsSavingNote(false);
      return;
    }

    try {
      const newNote: BackOfficeNote = {
        id: `note-${Date.now()}`,
        authorId: profile.uid,
        authorName: profile.displayName || 'Colaborador',
        content: newNoteText.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedNotes = [...(activeClientForNotes.notes || []), newNote];
      const ref = doc(db, 'backoffice_clients', activeClientForNotes.id);

      await updateDoc(ref, {
        notes: updatedNotes,
        updatedAt: new Date().toISOString()
      });

      setNewNoteText('');
      showToast('Nota adicionada ao cliente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao adicionar anotação.', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Baixar Planilha Original
  const handleDownloadOriginal = async () => {
    const activeImport = imports.find(i => i.id === selectedImportId);
    if (!activeImport || clients.length === 0) return;

    // Reconstrói a lista original baseado no mapeamento e customFields
    const rows = clients.map(cli => {
      const row: Record<string, any> = {};
      
      // Restaura mapeados
      row[activeImport.columnMapping.clientName] = cli.clientName;
      row[activeImport.columnMapping.clientCpf] = cli.clientCpf;
      row[activeImport.columnMapping.value] = cli.value;
      row[activeImport.columnMapping.dueDate] = cli.dueDate;

      // Restaura customizados
      Object.entries(cli.customFields).forEach(([h, val]) => {
        row[h] = val;
      });

      return row;
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Original');
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));
      rows.forEach(r => ws.addRow(r));
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `original_${activeImport.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Baixar Planilha Atualizada (Original + Status de Tratamento + Notas)
  const handleDownloadUpdated = async () => {
    const activeImport = imports.find(i => i.id === selectedImportId);
    if (!activeImport || clients.length === 0) return;

    const rows = clients.map(cli => {
      const row: Record<string, any> = {};
      
      // Restaura mapeados
      row[activeImport.columnMapping.clientName] = cli.clientName;
      row[activeImport.columnMapping.clientCpf] = cli.clientCpf;
      row[activeImport.columnMapping.value] = cli.value;
      row[activeImport.columnMapping.dueDate] = cli.dueDate;

      // Restaura customizados
      Object.entries(cli.customFields).forEach(([h, val]) => {
        row[h] = val;
      });

      // Adiciona colunas do Back Office
      row['Status de Tratamento'] = cli.status === 'treated' ? 'TRATADO' : (cli.status === 'ignored' ? 'IGNORADO' : 'PENDENTE');
      row['Última Nota'] = cli.notes && cli.notes.length > 0 ? cli.notes[cli.notes.length - 1].content : '';
      row['Data Última Modificação'] = new Date(cli.updatedAt).toLocaleString('pt-BR');

      return row;
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Atualizado');
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));
      rows.forEach(r => ws.addRow(r));
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atualizado_${activeImport.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtros de Tabela (dados originais filtrados - agora memoizados para estabilidade do TanStack)
  const filteredClients = useMemo(() => {
    return clients.filter(cli => {
      const matchesSearch = cli.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            cli.clientCpf.includes(searchTerm.replace(/\D/g, ''));
      const matchesStatus = statusFilter === 'all' || cli.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const activeImport = imports.find(i => i.id === selectedImportId);

  // Definição de Colunas Dinâmicas do TanStack Table com base nos cabeçalhos do Excel
  const columns = useMemo<ColumnDef<BackOfficeClient>[]>(() => {
    if (!activeImport) return [];

    // Colunas dinâmicas baseadas nos cabeçalhos originais do Excel e sua ordem exata
    // Usamos um ID estável baseado em índice ('dyn_X') para evitar qualquer colisão e loops infinitos no TanStack
    const dynColumns = activeImport.headers.map((h, idx): ColumnDef<BackOfficeClient> => {
      const isName = h === activeImport.columnMapping.clientName;
      const isCpf = h === activeImport.columnMapping.clientCpf;
      const isValue = h === activeImport.columnMapping.value;
      const isDueDate = h === activeImport.columnMapping.dueDate;

      return {
        id: `dyn_${idx}`,
        accessorFn: (row) => {
          if (isName) return row.clientName;
          if (isCpf) return row.clientCpf;
          if (isValue) return row.value;
          if (isDueDate) return row.dueDate;
          return row.customFields[h] || '';
        },
        header: h,
        cell: (info) => {
          const val = info.getValue();
          if (isName) {
            return (
              <span className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {String(val || '')}
              </span>
            );
          }
          if (isCpf) {
            return <span className="font-mono text-slate-400">{maskCPF(String(val || ''))}</span>;
          }
          if (isValue) {
            return (
              <span className={`font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {formatCurrency(Number(val || 0))}
              </span>
            );
          }
          if (isDueDate) {
            return <span className="text-slate-400">{String(val || '')}</span>;
          }
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {String(val || '-')}
            </span>
          );
        }
      };
    });

    // Coluna administrativa de Status
    const statusColumn: ColumnDef<BackOfficeClient> = {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
            status === 'treated' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : (status === 'ignored' 
                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
          }`}>
            {status === 'treated' ? 'Tratado' : (status === 'ignored' ? 'Ignorado' : 'Pendente')}
          </span>
        );
      }
    };


    // Coluna administrativa de Ações
    const actionsColumn: ColumnDef<BackOfficeClient> = {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const cli = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* Notas */}
            <button
              onClick={() => setActiveClientForNotes(cli)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer relative ${
                cli.notes && cli.notes.length > 0 
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' 
                  : 'bg-slate-900 border-white/[0.04] text-slate-400 hover:text-white'
              }`}
              title={`${cli.notes?.length || 0} Notas`}
            >
              <ChatText size={14} />
              {cli.notes && cli.notes.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-orange-600 text-[8px] font-black text-white">
                  {cli.notes.length}
                </span>
              )}
            </button>

            {/* Registrar Acordo diretamente */}
            {onAttend && cli.status !== 'treated' && (
              <button
                onClick={() => onAttend({
                  id: '', 
                  clientName: cli.clientName,
                  clientCpf: cli.clientCpf,
                  value: cli.value,
                  status: 'aguardando',
                  createdAt: new Date().toISOString(),
                  createdBy: profile.uid,
                  teamId: profile.teamId || '',
                  organizationId: profile.organizationId || '',
                  backOfficeClientIdRef: cli.id
                })}
                className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/25 transition-all cursor-pointer"
                title="Registrar Acordo Fechado"
              >
                <Handshake size={14} />
              </button>
            )}

            {/* Ações de status */}
            {cli.status !== 'treated' && (
              <button
                onClick={() => handleUpdateStatus(cli.id, 'treated')}
                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                title="Marcar como Tratado"
              >
                <Check size={14} />
              </button>
            )}

            {cli.status !== 'ignored' && (
              <button
                onClick={() => handleUpdateStatus(cli.id, 'ignored')}
                className="p-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/25 transition-all cursor-pointer"
                title="Ignorar Cliente"
              >
                <XIcon size={14} />
              </button>
            )}

            {(cli.status === 'treated' || cli.status === 'ignored') && (
              <button
                onClick={() => handleUpdateStatus(cli.id, 'pending')}
                className="px-1.5 py-1 rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-[9px] font-bold uppercase transition-all cursor-pointer"
                title="Voltar para Pendente"
              >
                Reabrir
              </button>
            )}
          </div>
        );
      }
    };

    return [...dynColumns, statusColumn, actionsColumn];
  }, [activeImport, theme, onAttend, profile]);

  // Inst instanciação do Hook useReactTable
  const table = useReactTable({
    data: filteredClients,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Cálculo de Paginação baseado no modelo ordenado do TanStack Table
  const sortedRows = table.getRowModel().rows;
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClientsRows = sortedRows.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      {/* CARD KPI: VALOR TOTAL RECUPERADO (R$) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">💰 Valor Recuperado (Pago)</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {formatCurrency(recoveryStats.totalRecoveredValue)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Acordos pagos vinculados à recuperação</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-lg">
            R$
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-sky-500/30' : 'bg-white border-sky-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block">🎯 Acordos Resgatados</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {recoveryStats.recoveredCount} clientes
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Acordos registrados via CPF</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 font-bold text-lg">
            ✓
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">📋 Clientes Pendentes</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {clients.filter(c => c.status === 'pending').length} de {clients.length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Fila aguardando tratamento</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 font-bold text-lg">
            ⏳
          </div>
        </div>
      </div>

      {/* Painel Superior: Seleção e Importação */}
      <div className={`flex flex-col lg:flex-row justify-between items-stretch lg:items-center p-6 rounded-3xl border gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/[0.04]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
          <div className="space-y-1 shrink-0">
            <h3 className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Tratamento de Planilhas
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Escolha uma importação ativa ou envie uma nova
            </p>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <CustomSelect 
              value={selectedImportId}
              onChange={(val) => setSelectedImportId(val)}
              placeholder="-- Nenhuma Planilha Selecionada --"
              options={[
                { value: "all", label: "-- Nenhuma Planilha Selecionada --" },
                ...imports.map(imp => ({
                  value: imp.id,
                  label: `${imp.fileName} (${new Date(imp.createdAt).toLocaleDateString('pt-BR')} - ${imp.validRows} cli)`
                }))
              ]}
            />

            {selectedImportId !== 'all' && (
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "Excluir Planilha",
                    message: "Tem certeza que deseja excluir esta planilha e todos os seus clientes tratados? Esta ação não pode ser desfeita.",
                    type: 'danger',
                    onConfirm: () => handleDeleteImport(selectedImportId)
                  });
                }}
                className={`p-2.5 rounded-xl border transition-colors hover:text-rose-500 cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}
                title="Excluir Planilha"
              >
                <Trash size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Upload de Planilha */}
        <div className="shrink-0">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-5 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md shadow-orange-500/20' 
                : 'bg-primary shadow-md shadow-primary/20'
            }`}
          >
            <UploadSimple size={16} />
            Subir Planilha
          </button>
        </div>
      </div>

      {/* Se não houver nada selecionado, mostra estado vazio */}
      {selectedImportId === 'all' ? (
        <div className={`p-16 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center space-y-4 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className="p-4 rounded-full bg-orange-500/10 text-orange-500 animate-pulse">
            <FileSpreadsheet size={48} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              Nenhuma planilha ativa
            </h4>
            <p className="text-xs text-slate-500">
              Faça a importação de uma nova lista de clientes para começar o tratamento de dados e anotações.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ações e Filtros de Clientes */}
          <div className={`flex flex-col md:flex-row justify-between items-stretch md:items-center p-4 rounded-2xl border gap-4 ${
            theme === 'dark' ? 'bg-slate-900/20 border-white/[0.04]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Busca */}
              <div className="relative flex-1 max-w-xs">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <MagnifyingGlass size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-orange-500'
                  }`}
                />
              </div>

              {/* Filtro de Status */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Filtro:</span>
                <div className="flex bg-slate-950/40 p-0.5 rounded-lg border border-white/[0.02]">
                  {(['all', 'pending', 'treated', 'ignored'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                        statusFilter === st
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-sm' : 'bg-primary text-white shadow-sm')
                          : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-850')
                      }`}
                    >
                      {st === 'all' ? 'Tudo' : (st === 'pending' ? 'Pendente' : (st === 'treated' ? 'Tratado' : 'Ignorado'))}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Exportadores e Seletor de Colunas */}
            <div className="flex items-center gap-2">
              {/* Dropdown de Visibilidade de Colunas (TanStack Table) */}
              <div className="relative">
                {isColumnDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-20 cursor-default" 
                    onClick={() => setIsColumnDropdownOpen(false)}
                  />
                )}
                <button
                  onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer z-30 relative ${
                    theme === 'dark' 
                      ? 'border-slate-800 text-slate-300 bg-slate-950 hover:bg-slate-900' 
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                  title="Configurar colunas exibidas na tabela"
                >
                  <SlidersHorizontal size={14} />
                  Colunas
                </button>
                
                {isColumnDropdownOpen && (
                  <div 
                    className={`absolute right-0 mt-2 w-56 rounded-2xl border p-3 z-30 shadow-xl space-y-2 ${
                      theme === 'dark' 
                        ? 'bg-slate-950 border-slate-800 text-white' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Exibir Colunas
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 select-none">
                      {table.getAllLeafColumns()
                        .filter(column => column.id !== 'actions' && column.id !== 'status')
                        .map(column => {
                          const isVisible = column.getIsVisible();
                          return (
                            <label 
                              key={column.id} 
                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] cursor-pointer text-[11px] font-bold"
                            >
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={column.getToggleVisibilityHandler()}
                                className="rounded border-slate-800 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="truncate">{String(column.columnDef.header || column.columnDef.id || column.id)}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadOriginal}
                className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileArrowDown size={14} />
                Original
              </button>
              <button
                onClick={handleDownloadUpdated}
                className={`px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md shadow-orange-500/10' 
                    : 'bg-primary shadow-md shadow-primary/10'
                }`}
              >
                <FileArrowDown size={14} />
                Baixar Planilha
              </button>
            </div>
          </div>

          {/* Tabela Premium de Clientes (TanStack Table) */}
          <div className={`border rounded-3xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-950/40 border-white/[0.04]' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {isLoadingClients ? (
              <div className="p-16 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Spinner size={32} className="animate-spin text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Carregando dados dos clientes...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-xs">
                Nenhum cliente atende aos filtros definidos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr 
                        key={headerGroup.id} 
                        className={`border-b ${theme === 'dark' ? 'bg-slate-900/50 border-white/[0.04]' : 'bg-slate-50 border-slate-100'}`}
                      >
                        {headerGroup.headers.map(header => {
                          const isSortable = header.column.id !== 'actions' && header.column.id !== 'status';
                          return (
                            <th 
                              key={header.id} 
                              className={`p-4 font-bold text-slate-400 uppercase tracking-wider relative group ${
                                isSortable ? 'cursor-pointer select-none hover:text-white transition-colors' : ''
                              }`}
                              onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                            >
                              <div className="flex items-center gap-1.5">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                
                                {isSortable && (
                                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                                    {{
                                      asc: <CaretUp size={10} weight="bold" />,
                                      desc: <CaretDown size={10} weight="bold" />,
                                    }[header.column.getIsSorted() as string] ?? (
                                      <ArrowsDownUp size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {currentClientsRows.map(row => (
                      <tr 
                        key={row.id} 
                        className={`transition-colors group ${
                          theme === 'dark' ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="p-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {!isLoadingClients && totalPages > 1 && (
              <div className={`p-4 border-t flex justify-between items-center ${
                theme === 'dark' ? 'border-white/[0.04] bg-slate-900/10' : 'border-slate-100 bg-slate-50'
              }`}>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Página {currentPage} de {totalPages} ({filteredClients.length} total)
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 disabled:opacity-30 hover:text-white cursor-pointer"
                  >
                    <CaretLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 disabled:opacity-30 hover:text-white cursor-pointer"
                  >
                    <CaretRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Mapeamento de Colunas */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-6 ${
            theme === 'dark' ? 'bg-slate-950 border-purple-500/20 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="space-y-1">
              <h4 className="font-black text-lg">Mapeamento de Colunas</h4>
              <p className="text-xs text-slate-500 font-medium">
                Vincule os campos do sistema aos cabeçalhos originais da sua planilha.
              </p>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Nome do Cliente <span className="text-rose-500">*</span>
                </label>
                <CustomSelect 
                  value={columnMapping.clientName}
                  onChange={(val) => setColumnMapping(prev => ({ ...prev, clientName: val }))}
                  placeholder="-- Selecione --"
                  options={[{ value: "", label: "-- Selecione --" }, ...excelHeaders.map(h => ({ value: h, label: h }))]}
                />
              </div>

              {/* CPF */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  CPF/CNPJ do Cliente <span className="text-rose-500">*</span>
                </label>
                <CustomSelect 
                  value={columnMapping.clientCpf}
                  onChange={(val) => setColumnMapping(prev => ({ ...prev, clientCpf: val }))}
                  placeholder="-- Selecione --"
                  options={[{ value: "", label: "-- Selecione --" }, ...excelHeaders.map(h => ({ value: h, label: h }))]}
                />
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Valor Devido <span className="text-rose-500">*</span>
                </label>
                <CustomSelect 
                  value={columnMapping.value}
                  onChange={(val) => setColumnMapping(prev => ({ ...prev, value: val }))}
                  placeholder="-- Selecione --"
                  options={[{ value: "", label: "-- Selecione --" }, ...excelHeaders.map(h => ({ value: h, label: h }))]}
                />
              </div>

              {/* Vencimento */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Data de Vencimento <span className="text-rose-500">*</span>
                </label>
                <CustomSelect 
                  value={columnMapping.dueDate}
                  onChange={(val) => setColumnMapping(prev => ({ ...prev, dueDate: val }))}
                  placeholder="-- Selecione --"
                  options={[{ value: "", label: "-- Selecione --" }, ...excelHeaders.map(h => ({ value: h, label: h }))]}
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              <span className="font-bold text-amber-500">Nota:</span> Todas as outras colunas que não forem selecionadas acima serão salvas como tags dinâmicas e estarão disponíveis para consulta.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsMappingModalOpen(false);
                  setFileToUpload(null);
                  setExcelData([]);
                }}
                disabled={isUploading}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  theme === 'dark' ? 'border-slate-850 hover:bg-slate-900' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isUploading}
                className={`flex-1 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md shadow-orange-500/20' 
                    : 'bg-primary shadow-md shadow-primary/20'
                }`}
              >
                {isUploading ? (
                  <>
                    <Spinner size={14} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Confirmar Carga'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gaveta Lateral (Drawer) de Anotações do Cliente */}
      {activeClientForNotes && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950 border-l border-white/[0.05] p-6 shadow-2xl flex flex-col justify-between animate-slide-in no-print">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/[0.05]">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                  Gaveta de Notas
                </span>
                <h4 className="font-black text-base text-white truncate max-w-xs">{activeClientForNotes.clientName}</h4>
                <p className="text-[10px] text-slate-500 font-mono">CPF: {maskCPF(activeClientForNotes.clientCpf)}</p>
              </div>
              <button
                onClick={() => setActiveClientForNotes(null)}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Listagem de Notas */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-0">
              {(!activeClientForNotes.notes || activeClientForNotes.notes.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 text-xs py-8">
                  <ChatText size={32} className="opacity-30 mb-2" />
                  Nenhuma anotação registrada ainda para este cliente.
                </div>
              ) : (
                activeClientForNotes.notes.map(note => (
                  <div key={note.id} className="p-3 bg-slate-900 border border-white/[0.03] rounded-2xl space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>{note.authorName}</span>
                      <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal font-medium">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Campo de Input */}
          <div className="pt-4 border-t border-white/[0.05] space-y-2 shrink-0">
            <div className="relative">
              <textarea
                placeholder="Escreva uma nova nota sobre o cliente..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full h-24 p-3 bg-slate-900 border border-white/[0.06] rounded-2xl text-xs text-white placeholder-slate-600 outline-none focus:border-orange-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={isSavingNote || !newNoteText.trim()}
                className={`absolute bottom-3 right-3 p-2 text-white rounded-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow shadow-orange-500/10' 
                    : 'bg-primary shadow shadow-primary/10'
                }`}
              >
                {isSavingNote ? <Spinner size={14} className="animate-spin" /> : <PaperPlaneTilt size={14} />}
              </button>
            </div>
            <p className="text-[9px] text-slate-600 leading-normal">
              Pressione Enter para enviar. As notas ficarão visíveis para supervisores e operadores.
            </p>
          </div>
        </div>
      )}

      <CustomConfirm 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
