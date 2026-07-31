import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { NumberShuffle } from '../ui/NumberShuffle';
import { uploadImage } from '../../lib/imageUpload';
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
  EyeSlash,
  Image as ImageIcon,
  ArrowsOut,
  CheckSquare,
  Minus,
  Broom,
  WarningOctagon,
  ChatCircleText
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
import { sanitizeFilename } from '../../utils/sanitize';
import { ExcelExportModal } from '../modals/ExcelExportModal';
import { ExcelExportColumn } from '../../utils/excelExport';
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const backofficeExportColumns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID do Registro', type: 'text' },
    { key: 'cpf', label: 'CPF / CNPJ do Cliente', type: 'cpf' },
    { key: 'name', label: 'Nome do Cliente', type: 'text' },
    { key: 'contractNumber', label: 'Nº do Contrato', type: 'text' },
    { key: 'originalDebt', label: 'Valor da Dívida (R$)', type: 'currency' },
    { key: 'proposalValue', label: 'Valor Proposto (R$)', type: 'currency' },
    { key: 'installmentValue', label: 'Valor Parcela (R$)', type: 'currency' },
    { key: 'status', label: 'Status do Atendimento', type: 'text' },
    { key: 'note', label: 'Observação / Nota', type: 'text' },
    { key: 'createdAt', label: 'Data de Importação', type: 'date' }
  ];
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'treated' | 'ignored' | 'has_notes' | 'invalid_cpf'>('all');

  // Estado para Seleção em Massa de Clientes
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // Reseta seleção em massa ao trocar de importação
  useEffect(() => {
    setSelectedClientIds([]);
  }, [selectedImportId]);

  const handleToggleSelectAllVisible = (visibleClients: BackOfficeClient[]) => {
    const visibleIds = visibleClients.map(c => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedClientIds.includes(id));

    if (allSelected) {
      setSelectedClientIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const combined = new Set([...selectedClientIds, ...visibleIds]);
      setSelectedClientIds(Array.from(combined));
    }
  };

  const handleToggleSelectClient = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSelectFirstN = (n: number) => {
    const firstN = filteredClients.slice(0, n).map(c => c.id);
    setSelectedClientIds(firstN);
    showToast(`${firstN.length} primeiro(s) cliente(s) selecionado(s)!`, 'info');
  };

  const handleBulkUpdateStatus = async (newStatus: 'pending' | 'in_progress' | 'treated' | 'ignored') => {
    if (selectedClientIds.length === 0) return;

    setIsUpdatingBulk(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateBackofficeClientStatusBatch(selectedClientIds, newStatus);
      } else {
        const batchSize = 500;
        for (let i = 0; i < selectedClientIds.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = selectedClientIds.slice(i, i + batchSize);
          chunk.forEach(id => {
            const ref = doc(db, 'backoffice_clients', id);
            batch.update(ref, {
              status: newStatus,
              updatedAt: new Date().toISOString()
            });
          });
          await batch.commit();
        }
      }

      const statusLabels: Record<string, string> = {
        pending: 'Pendente',
        in_progress: 'Em Tratativa',
        treated: 'Tratado',
        ignored: 'Ignorado'
      };

      showToast(`${selectedClientIds.length} cliente(s) alterado(s) para '${statusLabels[newStatus]}' com sucesso!`, 'success');
      setSelectedClientIds([]);
    } catch (error) {
      console.error('[BackOfficeTab] Erro ao atualizar status em massa:', error);
      showToast('Erro ao atualizar status dos clientes selecionados.', 'error');
    } finally {
      setIsUpdatingBulk(false);
    }
  };

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
  const [noteAttachmentUrl, setNoteAttachmentUrl] = useState<string | null>(null);
  const [isUploadingNoteImage, setIsUploadingNoteImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleNoteImageFile = async (file: File | Blob) => {
    setIsUploadingNoteImage(true);
    try {
      const url = await uploadImage(file, { folder: 'backoffice_prints' });
      setNoteAttachmentUrl(url);
      showToast('Print da tratativa anexado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Falha ao processar print.', 'error');
    } finally {
      setIsUploadingNoteImage(false);
    }
  };

  const handleNotePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleNoteImageFile(file);
          break;
        }
      }
    }
  };

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
  // Renomear cabeçalho de coluna customizada dinamicamente
  const handleRenameHeader = async (oldHeader: string) => {
    const trimmed = newHeaderName.trim();
    if (!trimmed) {
      showToast('O nome da coluna não pode ser vazio.', 'warning');
      return;
    }
    if (trimmed === oldHeader || !selectedImportId || selectedImportId === 'all') {
      setEditingHeader(null);
      return;
    }

    setIsSavingHeader(true);
    try {
      const activeImportObj = imports.find(i => i.id === selectedImportId);
      if (!activeImportObj) return;

      const updatedHeaders = activeImportObj.headers.map(h => h === oldHeader ? trimmed : h);
      
      const updatedMapping = { ...activeImportObj.columnMapping };
      Object.keys(updatedMapping).forEach(key => {
        if (updatedMapping[key as keyof typeof updatedMapping] === oldHeader) {
          (updatedMapping as any)[key] = trimmed;
        }
      });

      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateBackofficeImport(selectedImportId, {
          headers: updatedHeaders,
          columnMapping: updatedMapping
        });
        sandboxService.renameBackofficeColumnHeader(selectedImportId, oldHeader, trimmed);
        showToast(`Coluna renomeada para '${trimmed}' com sucesso!`, 'success');
        setEditingHeader(null);
        setNewHeaderName('');
        return;
      }

      // 1. Atualiza os headers na importação no Firestore
      const importRef = doc(db, 'backoffice_imports', selectedImportId);
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

  // Atualizar Status do Cliente (pending, in_progress, treated, ignored)
  const handleUpdateStatus = async (clientId: string, newStatus: 'pending' | 'in_progress' | 'treated' | 'ignored') => {
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
      const newNote: BackOfficeNote = {
        id: `note-${Date.now()}`,
        authorId: profile.uid,
        authorName: profile.displayName || 'Colaborador',
        content: newNoteText.trim(),
        attachmentUrl: noteAttachmentUrl || undefined,
        createdAt: new Date().toISOString()
      };
      sandboxService.addBackofficeClientNote(activeClientForNotes.id, newNote);
      setNewNoteText('');
      setNoteAttachmentUrl(null);
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
        attachmentUrl: noteAttachmentUrl || undefined,
        createdAt: new Date().toISOString()
      };

      const updatedNotes = [...(activeClientForNotes.notes || []), newNote];
      const ref = doc(db, 'backoffice_clients', activeClientForNotes.id);

      await updateDoc(ref, {
        notes: updatedNotes,
        updatedAt: new Date().toISOString()
      });

      setNewNoteText('');
      setNoteAttachmentUrl(null);
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
    a.download = `original_${sanitizeFilename(activeImport.fileName)}`;
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
    a.download = `atualizado_${sanitizeFilename(activeImport.fileName)}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Estatísticas e Métricas da Planilha Selecionada
  const stats = useMemo(() => {
    const total = clients.length;
    const pending = clients.filter(c => c.status === 'pending' || !c.status).length;
    const inProgress = clients.filter(c => c.status === 'in_progress').length;
    const treated = clients.filter(c => c.status === 'treated').length;
    const ignored = clients.filter(c => c.status === 'ignored').length;
    const totalNotes = clients.reduce((acc, c) => acc + (c.notes?.length || 0), 0);
    const progressPercent = total > 0 ? Math.round(((treated + ignored) / total) * 100) : 0;

    // Detectar CPFs inválidos ou fora do padrão de 11 dígitos
    const invalidCpfsCount = clients.filter(c => {
      const clean = c.clientCpf.replace(/\D/g, '');
      return clean.length !== 11 || /^(\d)\1{10}$/.test(clean);
    }).length;

    // Detectar CPFs duplicados na carga
    const cpfCounts = new Map<string, number>();
    clients.forEach(c => {
      const clean = c.clientCpf.replace(/\D/g, '');
      if (clean) {
        cpfCounts.set(clean, (cpfCounts.get(clean) || 0) + 1);
      }
    });
    const duplicateCpfsCount = Array.from(cpfCounts.values())
      .filter(count => count > 1)
      .reduce((acc, count) => acc + (count - 1), 0);

    return { 
      total, 
      pending, 
      inProgress, 
      treated, 
      ignored, 
      totalNotes, 
      progressPercent, 
      invalidCpfsCount, 
      duplicateCpfsCount 
    };
  }, [clients]);

  // Função para Remover Registros Duplicados mantendo a primeira ocorrência
  const handleRemoveDuplicates = async () => {
    if (stats.duplicateCpfsCount === 0) {
      showToast('Nenhum CPF duplicado encontrado nesta carga.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Remover CPFs Duplicados',
      message: `Encontrados ${stats.duplicateCpfsCount} registro(s) duplicado(s) nesta planilha. Deseja manter apenas a primeira ocorrência de cada CPF e excluir os excedentes?`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsLoadingClients(true);

        const seenCpfs = new Set<string>();
        const idsToRemove: string[] = [];

        clients.forEach(cli => {
          const clean = cli.clientCpf.replace(/\D/g, '');
          if (clean) {
            if (seenCpfs.has(clean)) {
              idsToRemove.push(cli.id);
            } else {
              seenCpfs.add(clean);
            }
          }
        });

        try {
          if (profile.organizationId === 'sandbox-test') {
            idsToRemove.forEach(id => sandboxService.deleteBackofficeClient(id));
          } else {
            const batchSize = 500;
            for (let i = 0; i < idsToRemove.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = idsToRemove.slice(i, i + batchSize);
              chunk.forEach(id => {
                const ref = doc(db, 'backoffice_clients', id);
                batch.delete(ref);
              });
              await batch.commit();
            }
          }

          showToast(`${idsToRemove.length} registro(s) duplicado(s) removido(s) com sucesso!`, 'success');
        } catch (error) {
          console.error('[BackOfficeTab] Erro ao remover duplicados:', error);
          showToast('Erro ao remover registros duplicados.', 'error');
        } finally {
          setIsLoadingClients(false);
        }
      }
    });
  };

  // Filtros de Tabela (dados originais filtrados)
  const filteredClients = useMemo(() => {
    return clients.filter(cli => {
      const matchesSearch = cli.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            cli.clientCpf.includes(searchTerm.replace(/\D/g, ''));

      let matchesStatus = true;
      if (statusFilter === 'has_notes') {
        matchesStatus = Boolean(cli.notes && cli.notes.length > 0);
      } else if (statusFilter === 'invalid_cpf') {
        const clean = cli.clientCpf.replace(/\D/g, '');
        matchesStatus = clean.length !== 11 || /^(\d)\1{10}$/.test(clean);
      } else if (statusFilter !== 'all') {
        matchesStatus = cli.status === statusFilter;
      }

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
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
            status === 'treated' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : status === 'in_progress'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : status === 'ignored' 
                  ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {status === 'treated' ? 'Tratado' : status === 'in_progress' ? 'Em Tratativa' : status === 'ignored' ? 'Ignorado' : 'Pendente'}
          </span>
        );
      }
    };


    // Coluna administrativa de Ações (4 Slots Fixos e Perfeitamente Alinhados)
    const actionsColumn: ColumnDef<BackOfficeClient> = {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const cli = row.original;
        const noteCount = cli.notes?.length || 0;
        const isInProgress = cli.status === 'in_progress';
        const isTreated = cli.status === 'treated';
        const isIgnored = cli.status === 'ignored';

        return (
          <div className="flex items-center justify-center gap-1.5 w-full">
            {/* Slot 1: Deixar Comentário / Observação */}
            <button
              onClick={() => setActiveClientForNotes(cli)}
              className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer relative ${
                noteCount > 0 
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25 shadow-xs' 
                  : (theme === 'dark' ? 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200')
              }`}
              title={`${noteCount} Comentário(s)`}
            >
              <ChatText size={14} />
              {noteCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-black text-white shadow-xs">
                  {noteCount}
                </span>
              )}
            </button>

            {/* Slot 2: Marcar / Alternar Em Tratativa */}
            <button
              onClick={() => handleUpdateStatus(cli.id, isInProgress ? 'pending' : 'in_progress')}
              className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isInProgress
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/25 scale-105 font-bold'
                  : (theme === 'dark' ? 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-sky-50')
              }`}
              title={isInProgress ? 'Em Tratativa (Clique para desmarcar)' : 'Marcar como Em Tratativa'}
            >
              <Spinner size={14} className={isInProgress ? 'animate-spin' : ''} />
            </button>

            {/* Slot 3: Marcar / Alternar Tratado */}
            <button
              onClick={() => handleUpdateStatus(cli.id, isTreated ? 'pending' : 'treated')}
              className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isTreated
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25 scale-105 font-bold'
                  : (theme === 'dark' ? 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50')
              }`}
              title={isTreated ? 'Tratado (Clique para desfazer)' : 'Marcar como Tratado'}
            >
              <Check size={14} weight={isTreated ? 'bold' : 'regular'} />
            </button>

            {/* Slot 4: Marcar / Alternar Ignorar */}
            <button
              onClick={() => handleUpdateStatus(cli.id, isIgnored ? 'pending' : 'ignored')}
              className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isIgnored
                  ? 'bg-slate-700 text-slate-200 border-slate-500 shadow-md shadow-slate-900/40 scale-105'
                  : (theme === 'dark' ? 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200')
              }`}
              title={isIgnored ? 'Ignorado (Clique para desmarcar)' : 'Marcar como Ignorar Cliente'}
            >
              <XIcon size={14} weight={isIgnored ? 'bold' : 'regular'} />
            </button>
          </div>
        );
      }
    };

    // Coluna 0: Checkbox Customizado de Seleção em Massa (14px)
    const selectColumn: ColumnDef<BackOfficeClient> = {
      id: 'select',
      header: ({ table }) => {
        const visibleRows = table.getRowModel().rows.map(r => r.original);
        const visibleIds = visibleRows.map(c => c.id);
        const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedClientIds.includes(id));
        const isSomeSelected = visibleIds.some(id => selectedClientIds.includes(id)) && !isAllSelected;

        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleToggleSelectAllVisible(visibleRows)}
              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-xs shadow-orange-500/20 scale-105'
                  : isSomeSelected
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                    : (theme === 'dark' ? 'bg-white/[0.03] border-white/20 text-transparent hover:border-orange-500/50 hover:bg-orange-500/10' : 'bg-slate-100 border-slate-300 text-transparent hover:border-orange-500/50')
              }`}
              title={isAllSelected ? "Desmarcar todos desta página" : "Selecionar todos desta página"}
            >
              {isAllSelected && <Check size={11} weight="bold" />}
              {isSomeSelected && <Minus size={11} weight="bold" />}
            </button>
          </div>
        );
      },
      cell: ({ row }) => {
        const cli = row.original;
        const isSelected = selectedClientIds.includes(cli.id);
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleToggleSelectClient(cli.id)}
              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-xs shadow-orange-500/20 scale-105'
                  : (theme === 'dark' ? 'bg-white/[0.03] border-white/20 text-transparent hover:border-orange-500/50 hover:bg-orange-500/10' : 'bg-slate-100 border-slate-300 text-transparent hover:border-orange-500/50')
              }`}
            >
              {isSelected && <Check size={11} weight="bold" />}
            </button>
          </div>
        );
      }
    };

    return [selectColumn, ...dynColumns, statusColumn, actionsColumn];
  }, [activeImport, theme, onAttend, profile, selectedClientIds]);

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
          {/* CARDS DE MÉTRICAS E DESEMPENHO DA PLANILHA ATIVA (Spotlight + NumberShuffle) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total CPFs */}
            <SpotlightCard
              spotlightColor="rgba(249, 115, 22, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-900/60 border-orange-500/20' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Carga</span>
                <span className="text-[10px] font-bold text-orange-400 font-mono">{stats.progressPercent}%</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <NumberShuffle value={stats.total} className="text-2xl font-black text-white" />
                <span className="text-[10px] font-bold text-slate-500">CPFs</span>
              </div>
              {/* Barra de Progresso Visual */}
              <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </SpotlightCard>

            {/* Pendentes */}
            <SpotlightCard
              spotlightColor="rgba(245, 158, 11, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">📌 Pendentes</span>
              <div className="flex items-baseline gap-2 mt-1">
                <NumberShuffle value={stats.pending} className="text-2xl font-black text-amber-400" />
                <span className="text-[10px] font-bold text-amber-500/70">
                  {stats.total > 0 ? `${((stats.pending / stats.total) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </SpotlightCard>

            {/* Em Tratativa */}
            <SpotlightCard
              spotlightColor="rgba(14, 165, 233, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">⏳ Em Tratativa</span>
              <div className="flex items-baseline gap-2 mt-1">
                <NumberShuffle value={stats.inProgress} className="text-2xl font-black text-sky-400" />
                <span className="text-[10px] font-bold text-sky-500/70">
                  {stats.total > 0 ? `${((stats.inProgress / stats.total) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </SpotlightCard>

            {/* Tratados */}
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">✅ Tratados</span>
              <div className="flex items-baseline gap-2 mt-1">
                <NumberShuffle value={stats.treated} className="text-2xl font-black text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-500/70">
                  {stats.total > 0 ? `${((stats.treated / stats.total) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </SpotlightCard>

            {/* Ignorados */}
            <SpotlightCard
              spotlightColor="rgba(148, 163, 184, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-500/5 border-slate-500/20' : 'bg-slate-100 border-slate-200 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🚫 Ignorados</span>
              <div className="flex items-baseline gap-2 mt-1">
                <NumberShuffle value={stats.ignored} className="text-2xl font-black text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500/70">
                  {stats.total > 0 ? `${((stats.ignored / stats.total) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </SpotlightCard>

            {/* Anotações / Prints Anexadas */}
            <SpotlightCard
              spotlightColor="rgba(168, 85, 247, 0.25)"
              className={`p-4 flex flex-col justify-between ${
                theme === 'dark' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-200 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">💬 Anotações / Prints</span>
              <div className="flex items-baseline gap-2 mt-1">
                <NumberShuffle value={stats.totalNotes} className="text-2xl font-black text-purple-400" />
                <span className="text-[10px] font-bold text-purple-500/70">anexos</span>
              </div>
            </SpotlightCard>
          </div>

          {/* BARRA DE HIGIENIZAÇÃO DE DADOS E FILTROS */}
          <div className={`flex flex-col md:flex-row justify-between items-stretch md:items-center p-4 rounded-2xl border gap-4 ${
            theme === 'dark' ? 'bg-slate-900/20 border-white/[0.04]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap items-center">
              {/* Busca */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
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

              {/* Filtros de Status & Higienização */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">Filtro:</span>
                <div className="flex bg-slate-950/40 p-0.5 rounded-lg border border-white/[0.02] gap-0.5">
                  {(['all', 'pending', 'in_progress', 'treated', 'ignored', 'has_notes', 'invalid_cpf'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        statusFilter === st
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-sm' : 'bg-primary text-white shadow-sm')
                          : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-850')
                      }`}
                    >
                      {st === 'all' && `Tudo (${stats.total})`}
                      {st === 'pending' && `Pendente (${stats.pending})`}
                      {st === 'in_progress' && `Em Tratativa (${stats.inProgress})`}
                      {st === 'treated' && `Tratado (${stats.treated})`}
                      {st === 'ignored' && `Ignorado (${stats.ignored})`}
                      {st === 'has_notes' && (
                        <>
                          <ChatCircleText size={12} className="text-purple-400" />
                          <span>Com Anotações ({stats.totalNotes})</span>
                        </>
                      )}
                      {st === 'invalid_cpf' && (
                        <>
                          <WarningOctagon size={12} className={stats.invalidCpfsCount > 0 ? "text-rose-400" : "text-slate-400"} />
                          <span className={stats.invalidCpfsCount > 0 ? "text-rose-400" : ""}>
                            CPFs Inválidos ({stats.invalidCpfsCount})
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão Higienizador: Remover Duplicados */}
              {stats.duplicateCpfsCount > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveDuplicates}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 animate-pulse shrink-0"
                  title="Detectar e remover CPFs duplicados mantendo o primeiro registro"
                >
                  <Broom size={14} />
                  <span>Remover Duplicados ({stats.duplicateCpfsCount})</span>
                </button>
              )}

              {/* Seleção Rápida em Lote */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Lote:</span>
                <button
                  type="button"
                  onClick={() => handleSelectFirstN(10)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Selecionar os primeiros 10 clientes"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFirstN(50)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Selecionar os primeiros 50 clientes"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFirstN(100)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Selecionar os primeiros 100 clientes"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = filteredClients.map(c => c.id);
                    setSelectedClientIds(allIds);
                    showToast(`${allIds.length} cliente(s) selecionado(s)!`, 'info');
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all cursor-pointer"
                  title="Selecionar todos os clientes filtrados"
                >
                  Todos ({filteredClients.length})
                </button>
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
                  type="button"
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
                        .filter(column => column.id !== 'actions' && column.id !== 'status' && column.id !== 'select')
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
                onClick={() => setIsExportModalOpen(true)}
                className={`px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md shadow-orange-500/10' 
                    : 'bg-primary shadow-md shadow-primary/10'
                }`}
              >
                <FileArrowDown size={14} />
                Baixar Planilha (ExcelJS)
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
                          const headerText = String(header.column.columnDef.header || '');
                          const isEditingThisHeader = editingHeader === headerText;
                          const isDynamicHeader = header.column.id.startsWith('dyn_');

                          return (
                            <th 
                              key={header.id} 
                              className={`p-4 font-bold text-slate-400 uppercase tracking-wider relative group/th ${
                                isSortable && !isEditingThisHeader ? 'cursor-pointer select-none hover:text-white transition-colors' : ''
                              }`}
                              onClick={isSortable && !isEditingThisHeader ? header.column.getToggleSortingHandler() : undefined}
                            >
                              {isEditingThisHeader ? (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleRenameHeader(headerText);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 min-w-[150px]"
                                >
                                  <input
                                    type="text"
                                    value={newHeaderName}
                                    onChange={(e) => setNewHeaderName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') setEditingHeader(null);
                                    }}
                                    className="bg-slate-950 border border-orange-500/80 rounded-lg px-2 py-1 text-xs text-white outline-none w-full shadow-inner"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isSavingHeader}
                                    title="Salvar novo nome"
                                    className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-all cursor-pointer shrink-0"
                                  >
                                    <Check size={12} weight="bold" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingHeader(null);
                                    }}
                                    title="Cancelar"
                                    className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-md transition-all cursor-pointer shrink-0"
                                  >
                                    <XIcon size={12} weight="bold" />
                                  </button>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    
                                    {isSortable && (
                                      <span className="text-[10px] text-slate-500 group-hover/th:text-slate-300">
                                        {{
                                          asc: <CaretUp size={10} weight="bold" />,
                                          desc: <CaretDown size={10} weight="bold" />,
                                        }[header.column.getIsSorted() as string] ?? (
                                          <ArrowsDownUp size={10} className="opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {/* Lápis de Edição Manual do Nome da Coluna */}
                                  {isDynamicHeader && selectedImportId !== 'all' && (
                                    <button
                                      type="button"
                                      title="Renomear esta coluna"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingHeader(headerText);
                                        setNewHeaderName(headerText);
                                      }}
                                      className="opacity-0 group-hover/th:opacity-100 p-1 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-md transition-all cursor-pointer"
                                    >
                                      <PencilSimple size={12} weight="bold" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <motion.tbody
                    className="divide-y divide-white/[0.02]"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
                      hidden: {},
                    }}
                  >
                    {currentClientsRows.map(row => {
                      const clientObj = row.original as BackOfficeClient;
                      const isRowSelected = Boolean(clientObj?.id && selectedClientIds.includes(clientObj.id));
                      return (
                        <motion.tr
                          key={row.id}
                          variants={{
                            hidden: { opacity: 0, y: 8 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
                          }}
                          className={`transition-all group ${
                            isRowSelected
                              ? (theme === 'dark' ? 'bg-orange-500/[0.07] shadow-xs' : 'bg-orange-50/80')
                              : (theme === 'dark' ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50')
                          }`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="p-4">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print cursor-pointer"
          onClick={() => setIsMappingModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md rounded-3xl border p-6 space-y-6 cursor-default ${
              theme === 'dark' ? 'bg-slate-950 border-purple-500/20 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
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
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in no-print cursor-pointer"
          onClick={() => setActiveClientForNotes(null)}
        >
          <div 
            className="w-full max-w-md bg-slate-950 border-l border-white/[0.05] p-6 shadow-2xl flex flex-col justify-between animate-slide-in h-full cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <div key={note.id} className="p-3 bg-slate-900 border border-white/[0.03] rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>{note.authorName}</span>
                      <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal font-medium">{note.content}</p>
                    {note.attachmentUrl && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[9px] font-bold text-sky-400 block mb-1">Print Anexado:</span>
                        <div 
                          onClick={() => setPreviewImage(note.attachmentUrl!)}
                          className="relative group inline-block rounded-xl overflow-hidden border border-sky-500/30 cursor-pointer max-w-[200px]"
                        >
                          <img src={note.attachmentUrl} alt="Print da tratativa" className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[10px] font-bold">
                            <ArrowsOut size={14} />
                            Ampliar Print
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Campo de Input */}
          <div className="pt-4 border-t border-white/[0.05] space-y-3 shrink-0">
            {/* Pré-visualização de anexo antes de enviar */}
            {noteAttachmentUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-sky-500/30 bg-slate-900 p-2 flex items-center gap-3">
                <img 
                  src={noteAttachmentUrl} 
                  alt="Anexo de tratativa" 
                  className="w-12 h-12 object-cover rounded-lg border border-white/10 cursor-pointer"
                  onClick={() => setPreviewImage(noteAttachmentUrl)}
                />
                <div className="flex-1 overflow-hidden">
                  <span className="text-xs font-bold text-sky-400 block truncate">Print Anexado à Nota</span>
                  <span className="text-[9px] text-slate-500 block">Clique para ampliar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNoteAttachmentUrl(null)}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                  title="Remover print"
                >
                  <Trash size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                  isUploadingNoteImage ? 'opacity-50 pointer-events-none' : ''
                } ${
                  theme === 'dark' 
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300' 
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}>
                  {isUploadingNoteImage ? <Spinner size={14} className="animate-spin text-sky-400" /> : <ImageIcon size={14} className="text-sky-400" />}
                  <span>{isUploadingNoteImage ? 'Processando print...' : 'Anexar Print (ou Ctrl+V)'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleNoteImageFile(file);
                    }}
                  />
                </label>
              </div>
            )}

            <div className="relative">
              <textarea
                placeholder="Escreva uma nova nota sobre o cliente... (Cole o print diretamente com Ctrl+V!)"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onPaste={handleNotePaste}
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
                disabled={isSavingNote || isUploadingNoteImage || (!newNoteText.trim() && !noteAttachmentUrl)}
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

      {/* Modal Lightbox de Zoom de Print */}
      {previewImage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-fade-in"
            onClick={() => setPreviewImage(null)}
          />
          <div className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center justify-center space-y-3 animate-scale-in">
            <img 
              src={previewImage} 
              alt="Print da tratativa" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl" 
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border border-white/10"
            >
              <XIcon size={16} />
              Fechar Imagem
            </button>
          </div>
        </div>
      )}
      {/* BARRA FLUTUANTE DE AÇÕES EM MASSA */}
      {selectedClientIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in no-print">
          <div className={`px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-4 flex-wrap backdrop-blur-md ${
            theme === 'dark'
              ? 'bg-slate-950/95 border-orange-500/40 text-white shadow-orange-500/10'
              : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/30'
          }`}>
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-black">
                {selectedClientIds.length} {selectedClientIds.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Ações em Massa:
              </span>

              {/* Marcar Pendente */}
              <button
                type="button"
                disabled={isUpdatingBulk}
                onClick={() => handleBulkUpdateStatus('pending')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingBulk ? <Spinner size={12} className="animate-spin" /> : '📌'} Pendente
              </button>

              {/* Marcar Em Tratativa */}
              <button
                type="button"
                disabled={isUpdatingBulk}
                onClick={() => handleBulkUpdateStatus('in_progress')}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 border border-sky-500/30 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingBulk ? <Spinner size={12} className="animate-spin" /> : '⏳'} Em Tratativa
              </button>

              {/* Marcar Tratado */}
              <button
                type="button"
                disabled={isUpdatingBulk}
                onClick={() => handleBulkUpdateStatus('treated')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingBulk ? <Spinner size={12} className="animate-spin" /> : '✅'} Tratado
              </button>

              {/* Marcar Ignorado */}
              <button
                type="button"
                disabled={isUpdatingBulk}
                onClick={() => handleBulkUpdateStatus('ignored')}
                className="px-3 py-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingBulk ? <Spinner size={12} className="animate-spin" /> : '🚫'} Ignorar
              </button>
            </div>

            {/* Cancelar Seleção */}
            <button
              type="button"
              onClick={() => setSelectedClientIds([])}
              className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Cancelar Seleção"
            >
              <XIcon size={16} weight="bold" />
            </button>
          </div>
        </div>
      {/* MODAL DE EXPORTAÇÃO EXCEL CONFIGURÁVEL DA ABA BACKOFFICE */}
      <ExcelExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Relatório BackOffice de Esteira de Clientes"
        defaultFilename={`Relatorio_BackOffice_${new Date().toISOString().split('T')[0]}.xlsx`}
        availableColumns={backofficeExportColumns}
        data={filteredClients}
        showToast={showToast}
        theme={theme}
      />
    </div>
  );
};
