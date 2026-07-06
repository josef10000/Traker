import React, { useState, useEffect, useRef } from 'react';
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
  CaretRight
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
import { db } from '../../lib/firebase';
import { UserProfile, BackOfficeImport, BackOfficeClient, BackOfficeNote } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import * as XLSX from 'xlsx';

interface BackOfficeTabProps {
  profile: UserProfile;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  theme?: 'light' | 'dark';
  selectedTeamId?: string;
}

export const BackOfficeTab: React.FC<BackOfficeTabProps> = ({
  profile,
  showToast,
  theme = 'dark',
  selectedTeamId = 'all'
}) => {
  // Estados para Importações
  const [imports, setImports] = useState<BackOfficeImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>('all');
  const [isLoadingImports, setIsLoadingImports] = useState(true);

  // Estados para Clientes da Importação Selecionada
  const [clients, setClients] = useState<BackOfficeClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'treated' | 'ignored'>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Listener para carregar as importações da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    setIsLoadingImports(true);
    const q = query(
      collection(db, 'backoffice_imports'),
      where('organizationId', '==', profile.organizationId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BackOfficeImport[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BackOfficeImport);
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
  }, [profile.organizationId]);

  // Listener para carregar os clientes da importação selecionada
  useEffect(() => {
    if (!profile.organizationId || selectedImportId === 'all') {
      setClients([]);
      return;
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

  // Atualizar gaveta lateral se o cliente selecionado tiver alterações reativas
  useEffect(() => {
    if (activeClientForNotes) {
      const updated = clients.find(c => c.id === activeClientForNotes.id);
      if (updated) {
        setActiveClientForNotes(updated);
      }
    }
  }, [clients]);

  // Processar arquivo Excel/CSV localmente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (data.length === 0) {
          showToast('A planilha selecionada está vazia.', 'error');
          setFileToUpload(null);
          return;
        }

        // Extrai os cabeçalhos
        const headers = Object.keys(data[0]);
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
    reader.readAsBinaryString(file);
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
        const rawDate = String(row[columnMapping.dueDate] || '').trim();

        if (!rawName || !rawCpf) return; // Ignora se não houver identificador

        validCount++;

        // Guarda dados customizados (todos os campos originais da linha menos os mapeados)
        const customFields: Record<string, string> = {};
        excelHeaders.forEach(h => {
          if (!Object.values(columnMapping).includes(h)) {
            customFields[h] = String(row[h] || '');
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
    if (!window.confirm('Tem certeza que deseja excluir esta planilha e todos os seus clientes tratados? Esta ação não pode ser desfeita.')) return;

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
  const handleDownloadOriginal = () => {
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

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Original');
    XLSX.writeFile(wb, `original_${activeImport.fileName}`);
  };

  // Baixar Planilha Atualizada (Original + Status de Tratamento + Notas)
  const handleDownloadUpdated = () => {
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

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Atualizado');
    XLSX.writeFile(wb, `atualizado_${activeImport.fileName}`);
  };

  // Filtros de Tabela
  const filteredClients = clients.filter(cli => {
    const matchesSearch = cli.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cli.clientCpf.includes(searchTerm.replace(/\D/g, ''));
    const matchesStatus = statusFilter === 'all' || cli.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Cálculo de Paginação
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);

  const activeImport = imports.find(i => i.id === selectedImportId);

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
            <select
              value={selectedImportId}
              onChange={(e) => setSelectedImportId(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-purple-500' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500'
              }`}
            >
              <option value="all">-- Nenhuma Planilha Selecionada --</option>
              {imports.map(imp => (
                <option key={imp.id} value={imp.id}>
                  {imp.fileName} ({new Date(imp.createdAt).toLocaleDateString('pt-BR')} - {imp.validRows} cli)
                </option>
              ))}
            </select>

            {selectedImportId !== 'all' && (
              <button
                onClick={() => handleDeleteImport(selectedImportId)}
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
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
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
            <h4 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
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
                          ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st === 'all' ? 'Tudo' : (st === 'pending' ? 'Pendente' : (st === 'treated' ? 'Tratado' : 'Ignorado'))}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Exportadores */}
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-500/10 flex items-center gap-1.5 cursor-pointer"
              >
                <FileArrowDown size={14} />
                Baixar Planilha Atualizada
              </button>
            </div>
          </div>

          {/* Tabela Premium de Clientes */}
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
                    <tr className={`border-b ${theme === 'dark' ? 'bg-slate-900/50 border-white/[0.04]' : 'bg-slate-50 border-slate-100'}`}>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">CPF</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">Vencimento</th>
                      {/* Mostrar as 2 primeiras colunas customizadas extras na tabela para contextualizar */}
                      {activeImport?.headers
                        .filter(h => !Object.values(activeImport.columnMapping).includes(h))
                        .slice(0, 2)
                        .map(h => (
                          <th key={h} className="p-4 font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {currentClients.map(cli => (
                      <tr 
                        key={cli.id} 
                        className={`transition-colors group ${
                          theme === 'dark' ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="p-4">
                          <span className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                            {cli.clientName}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{maskCPF(cli.clientCpf)}</td>
                        <td className={`p-4 font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatCurrency(cli.value)}
                        </td>
                        <td className="p-4 text-slate-400">{cli.dueDate}</td>
                        
                        {/* Custom fields extras */}
                        {activeImport?.headers
                          .filter(h => !Object.values(activeImport.columnMapping).includes(h))
                          .slice(0, 2)
                          .map(h => (
                            <td key={h} className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {cli.customFields[h] || '-'}
                              </span>
                            </td>
                          ))}

                        {/* Status Tag */}
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            cli.status === 'treated' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : (cli.status === 'ignored' 
                                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
                          }`}>
                            {cli.status === 'treated' ? 'Tratado' : (cli.status === 'ignored' ? 'Ignorado' : 'Pendente')}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="p-4">
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
                        </td>
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
                <select
                  value={columnMapping.clientName}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, clientName: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                  }`}
                >
                  <option value="">-- Selecione --</option>
                  {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* CPF */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  CPF/CNPJ do Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  value={columnMapping.clientCpf}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, clientCpf: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                  }`}
                >
                  <option value="">-- Selecione --</option>
                  {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Valor Devido <span className="text-rose-500">*</span>
                </label>
                <select
                  value={columnMapping.value}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, value: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                  }`}
                >
                  <option value="">-- Selecione --</option>
                  {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Vencimento */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Data de Vencimento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={columnMapping.dueDate}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                  }`}
                >
                  <option value="">-- Selecione --</option>
                  {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
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
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-xl hover:opacity-90 transition-all shadow shadow-orange-500/10 cursor-pointer disabled:opacity-40"
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
    </div>
  );
};
