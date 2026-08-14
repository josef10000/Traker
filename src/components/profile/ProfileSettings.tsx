import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImage } from '../../lib/imageUpload';
import { secureRandomId } from '../../utils/crypto';
import { 
  User as UserIcon, 
  Briefcase, 
  FloppyDisk as Save, 
  Plus, 
  ArrowLeft, 
  Trash as Trash2, 
  Users, 
  Palette, 
  Check, 
  X,
  ShieldCheck,
  Copy,
  PaperPlaneTilt,
  UserPlus,
  Globe,
  Target,
  MagnifyingGlass,
  CaretRight,
  CaretDown,
  Folder,
  FolderOpen,
  Bell,
  Calendar,
  CaretLeft,
  Info,
  Calculator,
  CursorClick,
  Camera,
  UploadSimple,
  CircleNotch,
  CircleNotch as Loader2,
  Pencil,
  Fingerprint,
  Envelope,
  CheckCircle,
  ArrowsVertical,
  SpeakerHigh,
  SpeakerSlash,
  Trophy
} from '@phosphor-icons/react';
import { playDealSound } from '../../utils/audioSynth';
import { doc, updateDoc, setDoc, collection, query, where, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Team, Organization, Invite, UserRole, TransferRequest, CollaborationNote, CalendarEvent } from '../../types';
import { sandboxService } from '../../lib/sandboxService';
import { getCollaborationNotes } from '../../lib/notes';
import { createNotification } from '../../lib/notifications';
import { registerWindowsHello, generateBackupCodes } from '../../lib/webAuthnService';
import { sendBackupCodesEmail, EmailPayload } from '../../lib/emailService';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomConfirm } from '../ui/CustomConfirm';
import { Avatar } from '../ui/Avatar';
import { ClosingPjSection } from './ClosingPjSection';
import { LgpdExportButton } from '../settings/LgpdExportButton';
import { 
  getTeamData, 
  deleteTeam, 
  getTeamMembers, 
  removeTeamMember, 
  regenerateSupervisorInviteToken, 
  regenerateCoordinatorInviteToken, 
  regenerateMonitorInviteToken,
  createInvitesInBulk,
  getPendingInvites,
  revokeInvite
} from '../../lib/teams';
import { ToastType } from '../ui/Toast';


const COVER_STILLS = [
  { id: 'cyberpunk_city', label: 'Cyberpunk City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80' },
  { id: 'neon_aurora', label: 'Neon Aurora', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80' },
  { id: 'dark_geometric', label: 'Dark Geometric', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { id: 'quantum_grid', label: 'Quantum Grid', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80' },
  { id: 'emerald_forest', label: 'Emerald Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80' },
  { id: 'abyssal_wave', label: 'Abyssal Wave', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' }
];

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (updatedData?: any) => void;
  onCreateTeam: () => void;
  showToast: (message: string, type?: ToastType) => void;
  theme?: UserProfile['theme'];
  initialTab?: string;
  onOpenReconciliation?: () => void;
  onOpenMessageTemplates?: () => void;
}

export function ProfileSettings({ isOpen, onClose, profile, onUpdate, onCreateTeam, showToast, theme = 'dark', initialTab, onOpenReconciliation, onOpenMessageTemplates }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle || '');
  const [avatarStyle, setAvatarStyle] = useState(profile.avatarStyle || 'initials');
  const [avatarSeed, setAvatarSeed] = useState(profile.avatarSeed || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [avatarType, setAvatarType] = useState<'custom' | 'api'>(profile.avatarType || (profile.photoURL ? 'custom' : 'api'));
  const [coverPhotoURL, setCoverPhotoURL] = useState<string>(profile.coverPhotoURL || '');
  const [coverPosition, setCoverPosition] = useState<string>(profile.coverPosition || 'center 50%');
  const [isRepositioning, setIsRepositioning] = useState<boolean>(false);
  const [isDraggingCover, setIsDraggingCover] = useState<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const initialPercentYRef = useRef<number>(50);
  const [tempPosY, setTempPosY] = useState<number>(() => {
    const pos = profile.coverPosition || 'center 50%';
    const match = pos.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 50;
  });

  const handleCoverDragStart = (clientY: number) => {
    if (!isRepositioning) return;
    setIsDraggingCover(true);
    dragStartYRef.current = clientY;
    initialPercentYRef.current = tempPosY;
  };

  const handleCoverDragMove = (clientY: number) => {
    if (!isDraggingCover || !isRepositioning) return;
    const deltaY = clientY - dragStartYRef.current;
    let newPercent = initialPercentYRef.current - Math.round(deltaY * 0.4);
    if (newPercent < 0) newPercent = 0;
    if (newPercent > 100) newPercent = 100;
    setTempPosY(newPercent);
    setCoverPosition(`center ${newPercent}%`);
  };

  const handleCoverDragEnd = () => {
    setIsDraggingCover(false);
  };

  const handleSaveCoverPosition = async () => {
    const finalPos = `center ${tempPosY}%`;
    setCoverPosition(finalPos);
    setIsRepositioning(false);
    await saveProfileFields({ coverPosition: finalPos });
    if (showToast) showToast('Posição da foto de capa salva!', 'success');
  };

  const handleCancelCoverPosition = () => {
    setIsRepositioning(false);
    const origPos = profile.coverPosition || 'center 50%';
    setCoverPosition(origPos);
    const match = origPos.match(/(\d+)%/);
    setTempPosY(match ? parseInt(match[1], 10) : 50);
  };

  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [showCoverPicker, setShowCoverPicker] = useState<boolean>(false);
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>(profile.theme || 'dark');
  const [currentCursor, setCurrentCursor] = useState<string>(profile.customCursorStyle || 'default');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  // Estados de Sons & Efeitos Sonoros (Sintetizador Web Audio API)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(profile.soundEnabled ?? true);
  const [soundVolume, setSoundVolume] = useState<number>(profile.soundVolume ?? 80);
  const [dealSoundEffect, setDealSoundEffect] = useState<'coin' | 'laser' | 'marimba' | 'silent'>(profile.dealSoundEffect || 'coin');

  // Estados de Metas Pessoais Motivacionais
  const [personalMonthlyGoal, setPersonalMonthlyGoal] = useState<number>(profile.personalMonthlyGoal || 0);
  const [personalDailyGoal, setPersonalDailyGoal] = useState<number>(profile.personalDailyGoal || 0);
  const [personalGoalType, setPersonalGoalType] = useState<'value' | 'count'>(profile.personalGoalType || 'value');
  const [showPersonalGoal, setShowPersonalGoal] = useState<boolean>(profile.showPersonalGoal ?? true);
  const [isSavingPersonalGoals, setIsSavingPersonalGoals] = useState<boolean>(false);
  const [saveGoalsProgress, setSaveGoalsProgress] = useState<number>(0);
  const [saveGoalsSuccess, setSaveGoalsSuccess] = useState<boolean>(false);

  type ProfileTab = 'profile' | 'closing_pj' | 'schedule' | 'appearance' | 'sound' | 'personal_goals' | 'reconciliation' | 'lgpd' | 'simulation' | 'sandbox';
  const [activeTab, setActiveTab] = useState<ProfileTab>((initialTab as ProfileTab) || 'profile');

  const saveProfileFields = async (fields: Partial<UserProfile>) => {
    const updatedData = {
      displayName,
      jobTitle,
      avatarStyle,
      avatarSeed,
      photoURL,
      avatarType,
      ...fields
    };

    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setProfile({
          ...profile,
          ...updatedData
        });
        onUpdate(updatedData);
        return;
      }

      if (profile.uid) {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, updatedData);
        onUpdate(updatedData);
      }
    } catch (err) {
      console.error('Erro ao salvar alterações no perfil:', err);
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setJobTitle(profile.jobTitle || '');
      setAvatarStyle(profile.avatarStyle || 'initials');
      setAvatarSeed(profile.avatarSeed || '');
      if (profile.photoURL !== undefined) setPhotoURL(profile.photoURL);
      if (profile.avatarType) setAvatarType(profile.avatarType);
    }
  }, [profile.displayName, profile.jobTitle, profile.avatarStyle, profile.avatarSeed, profile.photoURL, profile.avatarType]);

  const handleProfilePhotoUpload = async (file: File | Blob) => {
    setIsUploadingPhoto(true);
    try {
      const url = await uploadImage(file, { folder: 'profile_photos' });
      setPhotoURL(url);
      setAvatarType('custom');
      await saveProfileFields({ photoURL: url, avatarType: 'custom' });
      showToast('Foto de perfil salva com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar foto de perfil.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteProfilePhoto = async () => {
    setPhotoURL('');
    setAvatarType('api');
    await saveProfileFields({ photoURL: '', avatarType: 'api' });
    showToast('Foto removida. Revertido para o avatar da API.', 'info');
  };

  const handleSwitchAvatarType = async (type: 'custom' | 'api') => {
    setAvatarType(type);
    await saveProfileFields({ avatarType: type });
  };

  const [isEnrollingHello, setIsEnrollingHello] = useState(false);
  const [sandboxEmailPreview, setSandboxEmailPreview] = useState<EmailPayload | null>(null);

  const handleEnableWindowsHello = async () => {
    setIsEnrollingHello(true);
    try {
      const isSandbox = profile.organizationId === 'sandbox-test';
      const cred = await registerWindowsHello(profile.uid, profile.email, profile.displayName || profile.email, isSandbox);
      const backupCodes = generateBackupCodes(5);

      const emailResult = await sendBackupCodesEmail(profile.email, profile.displayName || profile.email, backupCodes, isSandbox);

      const existingCreds = profile.webAuthnCredentials || [];
      const updatedCreds = [...existingCreds.filter(c => c.id !== cred.id), cred];

      const patchData = {
        isWebAuthnEnabled: true,
        webAuthnCredentials: updatedCreds,
        backupCodes
      };

      await saveProfileFields(patchData);
      setSandboxEmailPreview(emailResult);
      showToast('Windows Hello ativado com sucesso! Códigos de contingência enviados para o seu e-mail.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao ativar o Windows Hello.', 'error');
    } finally {
      setIsEnrollingHello(false);
    }
  };

  const handleDisableWindowsHello = async () => {
    try {
      await saveProfileFields({
        isWebAuthnEnabled: false,
        webAuthnCredentials: [],
        backupCodes: []
      });
      showToast('Windows Hello desativado da sua conta.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Erro ao desativar Windows Hello.', 'error');
    }
  };
  
  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab, isOpen]);

  // Novos estados e effect para aba "Minha Escala"
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [scheduleNotes, setScheduleNotes] = useState<CollaborationNote[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  const [confirmedPresenciais, setConfirmedPresenciais] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeTab !== 'schedule' || !profile.uid || !profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const handleUpdate = () => {
        const notes = sandboxService.getCollaborationNotes(profile.uid)
          .filter(n => n.type === 'attendance');
        const events = sandboxService.getCalendarEvents('sandbox-test')
          .filter(e => {
            if (e.targetType === 'team') return e.targetId === profile.teamId;
            return e.targetId === profile.uid;
          });
        setScheduleNotes(notes);
        setScheduleEvents(events);
      };
      const unsubscribe = sandboxService.subscribe(handleUpdate);
      handleUpdate();
      return () => unsubscribe();
    } else {
      const qNotes = query(
        collection(db, 'collaboration_notes'),
        where('collaboratorId', '==', profile.uid),
        where('type', '==', 'attendance')
      );
      const unsubNotes = onSnapshot(qNotes, (snap) => {
        const notes = snap.docs.map(doc => doc.data() as CollaborationNote);
        setScheduleNotes(notes);
      });

      const qEvents = query(
        collection(db, 'calendar_events'),
        where('organizationId', '==', profile.organizationId)
      );
      const unsubEvents = onSnapshot(qEvents, (snap) => {
        const events = snap.docs.map(doc => doc.data() as CalendarEvent)
          .filter(e => {
            if (e.targetType === 'team') return e.targetId === profile.teamId;
            return e.targetId === profile.uid;
          });
        setScheduleEvents(events);
      });

      return () => {
        unsubNotes();
        unsubEvents();
      };
    }
  }, [activeTab, profile.uid, profile.organizationId, profile.teamId]);
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

  // Árvore Organizacional e Transferências
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showTransferModal, setShowTransferModal] = useState<UserProfile | null>(null);
  const [targetManagerId, setTargetManagerId] = useState('');
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);
  const [sandboxVersion, setSandboxVersion] = useState(0);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const [managedTeamsData, setManagedTeamsData] = useState<Team[]>([]);

  // Estados para configurar metas
  const [selectedGoalTeamId, setSelectedGoalTeamId] = useState<string>('');
  const [monthlyGoalInput, setMonthlyGoalInput] = useState<number>(0);
  const [effectivenessGoalInput, setEffectivenessGoalInput] = useState<number>(0);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDisplayName(profile.displayName || '');
      setJobTitle(profile.jobTitle || '');
      setAvatarStyle(profile.avatarStyle || 'initials');
      setAvatarSeed(profile.avatarSeed || '');
      setCurrentTheme(profile.theme || 'dark');
      setCurrentCursor(profile.customCursorStyle || 'default');
      setIsSaveSuccess(false);
      setActiveTab('profile');
      setSelectedTeamForMembers(null);
    }
    wasOpenRef.current = isOpen;
  }, [profile, isOpen]);

  useEffect(() => {
    if (!isOpen || !profile.organizationId) return;

    const loadTreeData = async () => {
      if (profile.organizationId === 'sandbox-test') {
        const users = sandboxService.getUsers(profile.organizationId);
        const teams = sandboxService.getTeams(profile.organizationId);
        setAllUsers(users);
        setAllTeams(teams);
        
        const requests = sandboxService.getTransferRequests ? sandboxService.getTransferRequests() : [];
        setTransferRequests(requests as TransferRequest[]);
        return;
      }

      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('organizationId', '==', profile.organizationId)));
        const users = usersSnap.docs.map(d => d.data() as UserProfile);
        setAllUsers(users);

        const teamsSnap = await getDocs(query(collection(db, 'teams'), where('organizationId', '==', profile.organizationId)));
        const teams = teamsSnap.docs.map(d => d.data() as Team);
        setAllTeams(teams);

        const reqsSnap = await getDocs(query(collection(db, 'transfer_requests'), where('toManagerId', '==', profile.uid), where('status', '==', 'pending')));
        const reqs = reqsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransferRequest));
        setTransferRequests(reqs);
      } catch (err) {
        console.error("Erro ao carregar dados da árvore:", err);
      }
    };

    loadTreeData();
  }, [isOpen, profile.organizationId, profile.uid, sandboxVersion]);

  useEffect(() => {
    if (managedTeamsData.length > 0 && !selectedGoalTeamId) {
      const firstTeam = managedTeamsData[0];
      setSelectedGoalTeamId(firstTeam.id);
      setMonthlyGoalInput(firstTeam.monthlyGoal || 0);
      setEffectivenessGoalInput(firstTeam.effectivenessGoal || 85);
    }
  }, [managedTeamsData, selectedGoalTeamId]);

  const handleGoalTeamChange = (teamId: string) => {
    setSelectedGoalTeamId(teamId);
    const team = managedTeamsData.find(t => t.id === teamId);
    if (team) {
      setMonthlyGoalInput(team.monthlyGoal || 0);
      setEffectivenessGoalInput(team.effectivenessGoal || 85);
    }
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalTeamId) return;

    setIsSavingGoals(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setTeamGoal(selectedGoalTeamId, monthlyGoalInput, effectivenessGoalInput);
        setManagedTeamsData(prev => prev.map(t => {
          if (t.id === selectedGoalTeamId) {
            return {
              ...t,
              monthlyGoal: monthlyGoalInput,
              effectivenessGoal: effectivenessGoalInput
            };
          }
          return t;
        }));
        showToast('Metas do Sandbox atualizadas na memória!', 'success');
      } else {
        await setDoc(doc(db, 'settings', selectedGoalTeamId), { 
          monthlyGoal: monthlyGoalInput,
          effectivenessGoal: effectivenessGoalInput,
          organizationId: profile.organizationId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await updateDoc(doc(db, 'teams', selectedGoalTeamId), {
          monthlyGoal: monthlyGoalInput,
          effectivenessGoal: effectivenessGoalInput
        });

        setManagedTeamsData(prev => prev.map(t => {
          if (t.id === selectedGoalTeamId) {
            return {
              ...t,
              monthlyGoal: monthlyGoalInput,
              effectivenessGoal: effectivenessGoalInput
            };
          }
          return t;
        }));
        showToast('Metas atualizadas com sucesso!', 'success');
      }
      onUpdate();
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar metas', 'error');
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (!showTransferModal || !targetManagerId) return;

    const targetManager = allUsers.find(u => u.uid === targetManagerId);
    if (!targetManager) return;

    const requestData: Omit<TransferRequest, 'id'> = {
      fromManagerId: profile.uid,
      fromManagerName: profile.displayName || profile.email.split('@')[0],
      toManagerId: targetManagerId,
      supervisorId: showTransferModal.uid,
      supervisorName: showTransferModal.displayName || showTransferModal.email.split('@')[0],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setIsProcessingTransfer(true);
    const isSandbox = profile.organizationId === 'sandbox-test';
    if (isSandbox) {
      const sandboxReq = {
        id: `sandbox-req-${Date.now()}`,
        ...requestData
      };
      sandboxService.createTransferRequest(sandboxReq);
      createNotification({
        userId: targetManagerId,
        title: 'Solicitação de Transferência',
        message: `${profile.displayName || profile.email.split('@')[0]} solicitou a transferência do supervisor ${requestData.supervisorName}.`,
        type: 'transfer_requested',
        referenceId: sandboxReq.id
      }, true);
      showToast('Solicitação de transferência criada na simulação!', 'success');
    } else {
      try {
        const reqRef = doc(collection(db, 'transfer_requests'));
        await setDoc(reqRef, requestData);
        await createNotification({
          userId: targetManagerId,
          title: 'Solicitação de Transferência',
          message: `${profile.displayName || profile.email.split('@')[0]} solicitou a transferência do supervisor ${requestData.supervisorName}.`,
          type: 'transfer_requested',
          referenceId: reqRef.id
        }, false);
        showToast('Solicitação de transferência enviada com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao criar solicitação de transferência.', 'error');
      }
    }
    setIsProcessingTransfer(false);
    setSandboxVersion(prev => prev + 1);
    setShowTransferModal(null);
    setTargetManagerId('');
  };

  const handleAcceptRequest = async (req: TransferRequest) => {
    setIsProcessingTransfer(true);
    if (profile.organizationId === 'sandbox-test') {
      const supervisor = sandboxService.getUser(req.supervisorId);
      if (supervisor) {
        sandboxService.setProfile({
          ...supervisor,
          managerId: req.fromManagerId
        });
      }
      const teams = sandboxService.getTeams(profile.organizationId);
      teams.forEach(team => {
        if (team.supervisorId === req.supervisorId) {
          sandboxService.setTeam({
            ...team,
            managerId: req.fromManagerId
          });
        }
      });
      sandboxService.updateTransferRequest(req.id, { status: 'accepted', updatedAt: new Date().toISOString() });
      showToast('Transferência aceita e realizada com sucesso!', 'success');
    } else {
      try {
        // Atualizar supervisor
        await updateDoc(doc(db, 'users', req.supervisorId), {
          managerId: req.fromManagerId
        });
        
        // Atualizar equipes deste supervisor
        const teamsRef = collection(db, 'teams');
        const teamsSnap = await getDocs(query(teamsRef, where('supervisorId', '==', req.supervisorId)));
        const updatePromises = teamsSnap.docs.map(d => updateDoc(d.ref, { managerId: req.fromManagerId }));
        await Promise.all(updatePromises);

        // Atualizar status da solicitação
        await updateDoc(doc(db, 'transfer_requests', req.id), {
          status: 'accepted',
          updatedAt: new Date().toISOString()
        });
        showToast('Transferência aceita e realizada no Firestore!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao aceitar transferência.', 'error');
      }
    }
    setIsProcessingTransfer(false);
    setSandboxVersion(prev => prev + 1);
  };

  const handleRejectRequest = async (req: TransferRequest) => {
    setIsProcessingTransfer(true);
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.updateTransferRequest(req.id, { status: 'rejected', updatedAt: new Date().toISOString() });
      showToast('Transferência rejeitada!', 'info');
    } else {
      try {
        await updateDoc(doc(db, 'transfer_requests', req.id), {
          status: 'rejected',
          updatedAt: new Date().toISOString()
        });
        showToast('Transferência rejeitada!', 'info');
      } catch (err) {
        console.error(err);
        showToast('Erro ao rejeitar transferência.', 'error');
      }
    }
    setIsProcessingTransfer(false);
    setSandboxVersion(prev => prev + 1);
  };

  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);

  useEffect(() => {
    setMemberSearchQuery('');
    setMemberCurrentPage(1);
  }, [selectedTeamForMembers]);

  const filteredTeamMembers = React.useMemo(() => {
    return teamMembers.filter(member => {
      const name = (member.displayName || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const queryStr = memberSearchQuery.toLowerCase().trim();
      return name.includes(queryStr) || email.includes(queryStr);
    });
  }, [teamMembers, memberSearchQuery]);

  const ITEMS_PER_PAGE = 5;
  const totalMemberPages = Math.max(1, Math.ceil(filteredTeamMembers.length / ITEMS_PER_PAGE));
  
  const paginatedTeamMembers = React.useMemo(() => {
    const startIndex = (memberCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredTeamMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTeamMembers, memberCurrentPage]);

  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [supervisorInviteToken, setSupervisorInviteToken] = useState<string | null>(null);
  const [coordinatorInviteToken, setCoordinatorInviteToken] = useState<string | null>(null);
  const [monitorInviteToken, setMonitorInviteToken] = useState<string | null>(null);

  // Estados de gerenciamento de convites
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteRows, setInviteRows] = useState<Array<{ email: string; role: UserRole; teamId: string; monthlyServiceValue?: number }>>([
    { email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }
  ]);
  const [generatedInvites, setGeneratedInvites] = useState<Invite[] | null>(null);
  const [isGeneratingInvites, setIsGeneratingInvites] = useState(false);

  // Buscar convites pendentes
  const loadInvites = async () => {
    if (!profile.organizationId) return;
    setLoadingInvites(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const list = sandboxService.getPendingInvites(profile.organizationId);
        setPendingInvites(list);
      } else {
        const list = await getPendingInvites(profile.organizationId);
        setPendingInvites(list);
      }
    } catch (e) {
      console.error('Erro ao carregar convites:', e);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [profile.organizationId, sandboxVersion]);


  useEffect(() => {
    if (profile.organizationId === 'sandbox-test') {
      const unsubscribe = sandboxService.subscribe(() => {
        setSandboxVersion(prev => prev + 1);
      });
      return () => unsubscribe();
    }
  }, [profile.organizationId]);

  useEffect(() => {
    const loadOrg = async () => {
      if (profile.organizationId === 'sandbox-test') {
        setOrgData({
          id: 'sandbox-test',
          name: 'Empresa Sandbox',
          createdAt: new Date().toISOString(),
          agreementLimit: 999999,
          supervisorInviteToken: 'sandbox-token-123',
          coordinatorInviteToken: 'sandbox-coord-123',
          monitorInviteToken: 'sandbox-mon-123'
        } as any);
        setSupervisorInviteToken('sandbox-token-123');
        setCoordinatorInviteToken('sandbox-coord-123');
        setMonitorInviteToken('sandbox-mon-123');
        return;
      }

      if (profile.organizationId) {
        try {
          const orgSnap = await getDoc(doc(db, 'organizations', profile.organizationId));
          if (orgSnap.exists()) {
            const org = orgSnap.data() as Organization;
            setOrgData(org);
            setSupervisorInviteToken(org.supervisorInviteToken || null);
            setCoordinatorInviteToken(org.coordinatorInviteToken || null);
            setMonitorInviteToken(org.monitorInviteToken || null);
          }
        } catch (error) {
          console.error('Erro ao carregar organização:', error);
        }
      }
    };
    loadOrg();
  }, [profile.organizationId]);

  useEffect(() => {
    const loadTeams = async () => {
      if (profile.organizationId === 'sandbox-test') {
        let teams: Team[] = [];
        if (profile.role === 'manager') {
          const allTeams = sandboxService.getTeams(profile.organizationId);
          const mySupervisorsUids = sandboxService.getUsers(profile.organizationId)
            .filter(u => u.role === 'supervisor' && u.managerId === profile.uid)
            .map(u => u.uid);
          teams = allTeams.filter(team => 
            team.managerId === profile.uid || 
            (team.supervisorId && mySupervisorsUids.includes(team.supervisorId))
          );
        } else if (profile.role === 'coordinator') {
          teams = sandboxService.getTeams(profile.organizationId);
        } else if (profile.role === 'supervisor') {
          teams = sandboxService.getTeams(profile.organizationId).filter(t => t.supervisorId === profile.uid);
        }
        setManagedTeamsData(teams);
        return;
      }

      if (profile.role === 'manager' && profile.organizationId) {
        try {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
          const querySnapshot = await getDocs(q);
          const allTeams = querySnapshot.docs.map(doc => doc.data() as Team);

          const usersRef = collection(db, 'users');
          const supsQ = query(usersRef, where('organizationId', '==', profile.organizationId), where('role', '==', 'supervisor'));
          const supsSnap = await getDocs(supsQ);
          const mySupervisorsUids = supsSnap.docs
            .map(doc => doc.data() as UserProfile)
            .filter(s => s.managerId === profile.uid)
            .map(s => s.uid);

          const filteredTeams = allTeams.filter(team => 
            team.managerId === profile.uid || 
            (team.supervisorId && mySupervisorsUids.includes(team.supervisorId))
          );
          setManagedTeamsData(filteredTeams);
        } catch (error) {
          console.error('Erro ao carregar equipes da empresa:', error);
        }
      } else if (profile.role === 'coordinator' && profile.organizationId) {
        try {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
          const querySnapshot = await getDocs(q);
          const teams = querySnapshot.docs.map(doc => doc.data() as Team);
          setManagedTeamsData(teams);
        } catch (error) {
          console.error('Erro ao carregar equipes da empresa (coordenador):', error);
        }
      } else if (profile.managedTeams && profile.managedTeams.length > 0) {
        const teams = await Promise.all(
          profile.managedTeams.map(id => getTeamData(id))
        );
        setManagedTeamsData(teams.filter((t): t is Team => t !== null));
      } else if (profile.role === 'supervisor') {
        try {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('supervisorId', '==', profile.uid));
          const querySnapshot = await getDocs(q);
          const teams = querySnapshot.docs.map(doc => doc.data() as Team);
          setManagedTeamsData(teams);
        } catch (error) {
          console.error('Erro ao carregar equipes do supervisor:', error);
        }
      }
    };
    loadTeams();
  }, [profile.managedTeams, profile.role, profile.organizationId, profile.uid, sandboxVersion]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setProfile({
          ...profile,
          displayName,
          jobTitle,
          avatarStyle,
          avatarSeed,
          photoURL,
          avatarType
        });
        setIsSaveSuccess(true);
        setTimeout(() => setIsSaveSuccess(false), 2500);
        showToast('Perfil simulado atualizado com sucesso!', 'success');
        onUpdate({
          displayName,
          jobTitle,
          avatarStyle,
          avatarSeed,
          photoURL,
          avatarType
        });
        return;
      }

      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName,
        jobTitle,
        avatarStyle,
        avatarSeed,
        photoURL,
        avatarType
      });
      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 2500);
      showToast('Perfil atualizado com sucesso!', 'success');
      onUpdate({
        displayName,
        jobTitle,
        avatarStyle,
        avatarSeed,
        photoURL,
        avatarType
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showToast('Erro ao salvar as alterações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Equipe",
      message: `Tem certeza que deseja excluir a equipe "${teamName}"? Esta ação não pode ser desfeita.`,
      type: 'danger',
      onConfirm: () => executeDeleteTeam(teamId)
    });
  };

  const executeDeleteTeam = async (teamId: string) => {
    try {
      if (profile.organizationId === 'sandbox-test') {
        // No Sandbox, apenas deletar em memória
        sandboxService.deleteTeam(teamId);
        setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
        showToast('Equipe excluída do Sandbox com sucesso!', 'success');
        onUpdate({});
        return;
      }
      await deleteTeam(profile.uid, teamId);
      setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
      showToast('Equipe excluída com sucesso!', 'success');
      onUpdate({});
    } catch (error) {
      showToast('Erro ao excluir equipe.', 'error');
    }
  };

  // --- AÇÕES DO FORMULÁRIO DINÂMICO DE CONVITES ---

  const handleAddInviteRow = () => {
    setInviteRows(prev => [...prev, { email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }]);
  };

  const handleRemoveInviteRow = (index: number) => {
    if (inviteRows.length === 1) return;
    setInviteRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleInviteRowChange = (index: number, field: 'email' | 'role' | 'teamId' | 'monthlyServiceValue', value: string) => {
    setInviteRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const updatedRow = { ...row, [field]: field === 'monthlyServiceValue' ? (Number(value) || 0) : value };
      
      // Se mudar a role para um cargo que não tem equipe (manager, coordinator, monitor), limpa o time
      if (field === 'role' && !['member', 'supervisor', 'backoffice'].includes(value)) {
        updatedRow.teamId = '';
      }
      return updatedRow;
    }));
  };

  const handleGenerateInvites = async () => {
    if (!profile.organizationId) return;

    const invalidRows = inviteRows.filter(row => !row.email.trim() || !row.email.includes('@'));
    if (invalidRows.length > 0) {
      showToast('Por favor, preencha todos os e-mails corretamente.', 'error');
      return;
    }

    setIsGeneratingInvites(true);
    try {
      const invitesPayload = inviteRows.map(row => ({
        email: row.email.trim().toLowerCase(),
        role: row.role,
        teamId: row.teamId || null,
        monthlyServiceValue: ['member', 'backoffice', 'supervisor', 'monitor'].includes(row.role) ? (row.monthlyServiceValue || 0) : undefined
      }));

      let list: Invite[] = [];
      if (profile.organizationId === 'sandbox-test') {
        list = sandboxService.createInvitesInBulk(
          invitesPayload,
          profile.organizationId,
          profile.uid
        );
        showToast('Convites simulados criados no Sandbox!', 'success');
      } else {
        list = await createInvitesInBulk(
          invitesPayload,
          profile.organizationId,
          profile.uid
        );
        showToast('Convites gerados com sucesso!', 'success');
      }

      setGeneratedInvites(list);
      setInviteRows([{ email: '', role: 'member', teamId: '' }]);
      loadInvites();
      onUpdate({});
    } catch (e: any) {
      showToast(e.message || 'Erro ao gerar convites.', 'error');
    } finally {
      setIsGeneratingInvites(false);
    }
  };

  const handleRevokeInvite = (inviteId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Revogar Convite",
      message: "Deseja revogar e cancelar este convite? O link associado não funcionará mais.",
      type: 'danger',
      onConfirm: () => executeRevokeInvite(inviteId)
    });
  };

  const executeRevokeInvite = async (inviteId: string) => {
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.revokeInvite(inviteId);
        showToast('Convite simulado revogado!', 'success');
      } else {
        await revokeInvite(inviteId);
        showToast('Convite revogado com sucesso!', 'success');
      }
      loadInvites();
      onUpdate({});
    } catch (e) {
      showToast('Erro ao revogar convite.', 'error');
    }
  };

  const handleSimulateAccept = async (token: string, email: string) => {
    try {
      const simulatedUid = `sandbox-user-${Date.now()}`;
      sandboxService.acceptInvite(simulatedUid, token);
      showToast(`Simulação: ${email} aceitou o convite e se cadastrou!`, 'success');
      loadInvites();
      onUpdate({});
    } catch (e) {
      showToast('Erro ao simular aceitação.', 'error');
    }
  };

  const handleManageMembers = async (team: Team) => {
    setSelectedTeamForMembers(team);
    setLoadingMembers(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const members = sandboxService.getUsers(profile.organizationId).filter(u => u.teamId === team.id);
        setTeamMembers(members);
      } else {
        const members = await getTeamMembers(team.id);
        setTeamMembers(members);
      }
    } catch (error) {
      showToast('Erro ao carregar membros.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = (memberUid: string, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remover Membro da Equipe",
      message: `Remover ${memberName} desta equipe?`,
      type: 'danger',
      onConfirm: () => executeRemoveMember(memberUid)
    });
  };

  const executeRemoveMember = async (memberUid: string) => {
    try {
      if (profile.organizationId === 'sandbox-test') {
        const user = sandboxService.getUser(memberUid);
        if (user) {
          sandboxService.setProfile({ ...user, teamId: '' });
        }
        setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
        showToast('Membro removido no Sandbox com sucesso!', 'success');
        return;
      }
      await removeTeamMember(memberUid);
      setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
      showToast('Membro removido com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao remover membro.', 'error');
    }
  };

  if (!isOpen) return null;

  const showAdminTabs = ['supervisor', 'coordinator', 'manager', 'admin', 'super_admin'].includes(profile.role) || profile.organizationId === 'sandbox-test';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="w-full max-w-5xl h-[85vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row bg-[#090d16] text-white relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coluna da Esquerda (Menu de Abas) */}
        <div className="w-full md:w-64 border-r border-white/5 bg-slate-950/40 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <Avatar
                displayName={profile.displayName}
                email={profile.email}
                avatarStyle={profile.avatarStyle}
                avatarSeed={profile.avatarSeed}
                theme={profile.theme}
                size="md"
                className="border-primary/20 text-primary bg-primary/10"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none truncate" title={profile.displayName}>
                  {profile.displayName}
                </h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1 block truncate">
                  {profile.role === 'member' ? 'Operador' : profile.role === 'backoffice' ? 'Back Office' : profile.role === 'monitor' ? 'Monitor / QA' : profile.role === 'supervisor' ? 'Supervisor' : profile.role === 'manager' ? 'Gerente' : profile.role}
                </span>
              </div>
            </div>

            <nav className="flex flex-col gap-3.5 overflow-y-auto custom-scrollbar flex-1 max-h-[55vh] pr-1">
              {/* Grupo 1: Perfil & Operação */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 block mb-1">
                  Perfil & Operação
                </span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('profile'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'profile'
                      ? 'bg-primary/10 text-primary border-primary/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <UserIcon size={16} />
                  <span>Meu Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('closing_pj'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'closing_pj'
                      ? 'bg-primary/10 text-primary border-primary/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <Calculator size={16} />
                  <span>Minha Prestação PJ</span>
                </button>

                {(profile.role === 'member' || profile.role === 'supervisor' || profile.role === 'backoffice') && (
                  <button
                    type="button"
                    onClick={() => { setActiveTab('schedule'); setSelectedTeamForMembers(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                      activeTab === 'schedule'
                        ? 'bg-primary/10 text-primary border-primary/25 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Minha Escala & Ponto</span>
                  </button>
                )}
              </div>

              {/* Grupo 2: Personalização & Design */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 block mb-1">
                  Personalização
                </span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('appearance'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'appearance'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <CursorClick size={16} className="text-purple-400" />
                  <span>Estilo do Cursor</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('sound'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'sound'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <SpeakerHigh size={16} className="text-amber-400" />
                  <span>Sons de Alerta</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('personal_goals'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'personal_goals'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <Trophy size={16} className="text-emerald-400" />
                  <span>Minhas Metas Pessoais</span>
                </button>
              </div>

              {/* Grupo 3: Ferramentas Operacionais */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 block mb-1">
                  Ferramentas
                </span>
                {/* Conciliação de Acordos (ESTREITAMENTE apenas Operador e Supervisor) */}
                {(profile.role === 'member' || profile.role === 'supervisor') && (
                  <button
                    type="button"
                    onClick={() => { setActiveTab('reconciliation'); setSelectedTeamForMembers(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                      activeTab === 'reconciliation'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    <Calculator size={16} className="text-sky-400" />
                    <span>Conciliação de Acordos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setActiveTab('lgpd'); setSelectedTeamForMembers(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    activeTab === 'lgpd'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                >
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Privacidade LGPD</span>
                </button>
              </div>

              {/* Grupo 4: Demonstração (Apenas Sandbox para cargos de gestão/supervisão) */}
              {profile.organizationId === 'sandbox-test' && ['supervisor', 'coordinator', 'manager', 'super_admin'].includes(profile.role) && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest px-2 block mb-1">
                    Ambiente Sandbox
                  </span>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('simulation'); setSelectedTeamForMembers(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                      activeTab === 'simulation'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    <Users size={16} className="text-amber-400" />
                    <span>Simulação de Cargos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('sandbox'); setSelectedTeamForMembers(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                      activeTab === 'sandbox'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    <Globe size={16} className="text-amber-400" />
                    <span>Painel Sandbox</span>
                  </button>
                </div>
              )}
            </nav>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer"
          >
            <X size={16} />
            Fechar
          </button>
        </div>

        {/* Coluna da Direita (Conteúdo) */}
        <div className="flex-1 p-5 md:p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-slate-950/20 relative flex flex-col">
          {/* Botão de Fechar no topo superior direito */}
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-10"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {/* ABA: MINHA ESCALA */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 max-w-3xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Minha Escala</h3>
                  <p className="text-xs text-slate-400 mt-1">Acompanhe suas presenças, atrasos, faltas e avisos da coordenação.</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setScheduleDate(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth() - 1, 1))}
                    className="p-2 rounded-xl border border-white/5 hover:bg-white/5 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <CaretLeft size={16} />
                  </button>
                  <span className="text-xs font-bold capitalize px-3 py-1 min-w-[120px] text-center text-white">
                    {scheduleDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScheduleDate(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth() + 1, 1))}
                    className="p-2 rounded-xl border border-white/5 hover:bg-white/5 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <CaretRight size={16} />
                  </button>
                </div>
              </div>

              {/* Grade de Calendário (Grade de Domingo a Sábado) */}
              <div className="border border-white/5 bg-slate-900/40 rounded-3xl p-6 space-y-4">
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 border-b border-white/5">
                  <div>Dom</div>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const y = scheduleDate.getFullYear();
                    const m = scheduleDate.getMonth();
                    const firstDayIndex = new Date(y, m, 1).getDay();
                    const totalDays = new Date(y, m + 1, 0).getDate();

                    const slots = [];
                    // Adicionar slots vazios para alinhar o primeiro dia
                    for (let i = 0; i < firstDayIndex; i++) {
                      slots.push(<div key={`blank-${i}`} className="aspect-square bg-transparent rounded-2xl border border-transparent" />);
                    }

                    // Adicionar os dias do mês
                    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
                      const dayStr = String(dayNum).padStart(2, '0');
                      const monthStr = String(m + 1).padStart(2, '0');
                      const dateStr = `${y}-${monthStr}-${dayStr}`;
                      const targetDate = new Date(dateStr);

                      // Buscar presenças
                      const dayNote = scheduleNotes.find(note => {
                        const noteDate = new Date(note.createdAt);
                        return (
                          noteDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
                          noteDate.getUTCMonth() === targetDate.getUTCMonth() &&
                          noteDate.getUTCDate() === targetDate.getUTCDate()
                        );
                      });

                      // Buscar eventos
                      const dayEvents = scheduleEvents.filter(e => e.date === dateStr);
                      const hasEvent = dayEvents.length > 0;
                      const eventText = hasEvent ? dayEvents.map(e => e.title).join(', ') : '';

                      const getAutomaticStatus = (dateStr: string) => {
                        const parts = dateStr.split('-');
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const dayVal = parseInt(parts[2], 10);
                        const dateObj = new Date(year, month, dayVal);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        if (isWeekend) {
                          return '';
                        }

                        const today = new Date();
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const dd = String(today.getDate()).padStart(2, '0');
                        const todayStr = `${yyyy}-${mm}-${dd}`;

                        if (dateStr < todayStr) {
                          return 'present';
                        }
                        if (dateStr === todayStr) {
                          if (today.getHours() >= 10) {
                            return 'present';
                          }
                        }
                        return '';
                      };

                      const status = dayNote?.attendanceStatus || getAutomaticStatus(dateStr);

                      slots.push(
                        <div
                          key={`day-${dayNum}`}
                          className={`aspect-square rounded-2xl border p-2 flex flex-col justify-between transition-all group relative overflow-hidden ${
                            status === 'present'
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : status === 'late'
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : status === 'absent'
                                  ? 'bg-rose-500/10 border-rose-500/30'
                                  : status === 'early_departure'
                                    ? 'bg-purple-500/10 border-purple-500/30'
                                    : status === 'day_off'
                                      ? 'bg-slate-500/10 border-slate-550/25'
                                      : status === 'vacation'
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-slate-950/40 border-white/5'
                          }`}
                        >
                          {/* Número do Dia */}
                          <span className={`text-xs font-bold ${
                            status === 'present'
                              ? 'text-emerald-400'
                              : status === 'late'
                                ? 'text-amber-400'
                                : status === 'absent'
                                  ? 'text-rose-400'
                                  : status === 'early_departure'
                                    ? 'text-purple-400'
                                    : status === 'day_off'
                                      ? 'text-slate-400'
                                      : status === 'vacation'
                                        ? 'text-blue-400'
                                        : 'text-slate-400'
                          }`}>
                            {dayNum}
                          </span>

                          {/* Indicador de Tipo de Evento / Presencial */}
                          {hasEvent && (
                            <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded-sm bg-sky-500/20 text-sky-400 border border-sky-500/20 truncate w-full text-center">
                              {dayEvents[0].title.split(' ').slice(1).join(' ') || dayEvents[0].title}
                            </span>
                          )}

                          {/* Botão e Status de Confirmação de Presença Presencial (Apenas para escalas presenciais explícitas) */}
                          {((dayNote && dayNote.attendanceStatus === 'present') || (hasEvent && dayEvents.some(e => e.title.toLowerCase().includes('presencial')))) && (
                            <div className="flex flex-col items-center gap-1 w-full mt-1">
                              <span className="text-[7px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 truncate w-full text-center">
                                🏢 Presencial
                              </span>

                              {(confirmedPresenciais[dateStr] || dayNote?.attendanceConfirmed) ? (
                                <span className="text-[7px] font-bold text-emerald-300 flex items-center justify-center gap-0.5 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/40 w-full text-center">
                                  ✓ Confirmado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setConfirmedPresenciais(prev => ({ ...prev, [dateStr]: true }));
                                    if (dayNote) {
                                      const updatedNote = {
                                        ...dayNote,
                                        attendanceConfirmed: true,
                                        confirmedAt: new Date().toISOString()
                                      };
                                      if (profile.organizationId === 'sandbox-test') {
                                        sandboxService.addCollaborationNote(updatedNote);
                                      } else {
                                        await updateDoc(doc(db, 'collaboration_notes', dayNote.id), {
                                          attendanceConfirmed: true,
                                          confirmedAt: new Date().toISOString()
                                        });
                                      }
                                    }
                                    showToast(`Presença confirmada para a escala presencial do dia ${dayNum}!`, 'success');
                                  }}
                                  className="text-[7px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-1 py-0.5 rounded shadow-sm shadow-emerald-600/40 border border-emerald-400/50 transition-all cursor-pointer w-full text-center font-sans"
                                >
                                  Confirmar
                                </button>
                              )}
                            </div>
                          )}

                          {/* Hover Tooltip */}
                          {(dayNote || hasEvent || status === 'present') && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 p-2.5 rounded-xl border border-white/10 bg-slate-950 text-slate-300 text-[9px] leading-relaxed shadow-xl w-44 pointer-events-none transition-all">
                              {hasEvent && (
                                <div className="mb-1">
                                  <span className="font-bold text-sky-400 block">📅 Aviso:</span>
                                  <span className="text-white block font-medium">{eventText}</span>
                                </div>
                              )}
                              {(dayNote || status === 'present') && (
                                <div>
                                  <span className="font-bold text-slate-400 block">Presença:</span>
                                  <span className={`font-extrabold ${
                                    status === 'present' ? 'text-emerald-400' :
                                    status === 'late' ? 'text-amber-400' :
                                    status === 'absent' ? 'text-rose-400' :
                                    status === 'early_departure' ? 'text-purple-400' :
                                    status === 'day_off' ? 'text-slate-400' : 'text-blue-400'
                                  }`}>
                                    {status === 'present' && 'Presente'}
                                    {status === 'late' && 'Atrasado'}
                                    {status === 'absent' && 'Falta'}
                                    {status === 'early_departure' && 'Saída Antecipada'}
                                    {status === 'day_off' && 'Day Off'}
                                    {status === 'vacation' && 'Férias'}
                                  </span>
                                  {status === 'late' && dayNote && dayNote.lateDuration && (
                                    <span className="block text-white font-medium mt-0.5">Tempo: {dayNote.lateDuration}</span>
                                  )}
                                  {status === 'early_departure' && dayNote && dayNote.lateDuration && (
                                    <span className="block text-white font-medium mt-0.5">Saída: {dayNote.lateDuration}</span>
                                  )}
                                  {(status === 'absent' || status === 'early_departure' || status === 'day_off') && dayNote && dayNote.absenceReason && (
                                    <span className="block text-white font-medium mt-0.5">Motivo: {dayNote.absenceReason}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return slots;
                  })()}
                </div>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-white/5 bg-slate-900/10 rounded-2xl text-[10px] text-slate-400 font-medium">
                <div className="flex flex-wrap items-center gap-4 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 inline-block" />
                    <strong className="text-emerald-400">Presente</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 inline-block" />
                    <strong className="text-amber-400">Atrasado</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 inline-block" />
                    <strong className="text-rose-400">Falta</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-purple-500/10 border border-purple-500/30 inline-block" />
                    <strong className="text-purple-400">Saída Antecipada</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-slate-500/10 border border-slate-550/30 inline-block" />
                    <strong className="text-slate-400">Day Off</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-blue-500/10 border border-blue-500/30 inline-block" />
                    <strong className="text-blue-400">Férias</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-sm bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[7px] font-black inline-block uppercase leading-none">Presencial</span>
                    Aviso da Coordenação
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Info size={12} className="text-slate-500" />
                  <span>Passe o mouse por cima das marcações para ver detalhes de atrasos ou faltas.</span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: MEU PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-3.5 max-w-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Meu Perfil</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Gerencie suas informações cadastrais básicas.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5">
                {/* 📸 CABEÇALHO UNIFICADO DO PERFIL (CAPA + AVATAR INTEGRADO COM LÁPIS DE EDIÇÃO) */}
                <div className="relative rounded-3xl border border-white/10 mb-6 bg-slate-900 shadow-xl">
                  {/* CAPA DE FUNDO (BANNER) COM SUPORTE A REPOSICIONAMENTO POR ARRASTE */}
                  <div
                    className={`h-36 sm:h-44 w-full relative bg-slate-950 overflow-hidden rounded-t-3xl ${
                      isRepositioning ? 'cursor-grab active:cursor-grabbing select-none' : ''
                    }`}
                    onMouseDown={(e) => handleCoverDragStart(e.clientY)}
                    onMouseMove={(e) => handleCoverDragMove(e.clientY)}
                    onMouseUp={handleCoverDragEnd}
                    onMouseLeave={handleCoverDragEnd}
                    onTouchStart={(e) => handleCoverDragStart(e.touches[0].clientY)}
                    onTouchMove={(e) => handleCoverDragMove(e.touches[0].clientY)}
                    onTouchEnd={handleCoverDragEnd}
                  >
                    {coverPhotoURL ? (
                      <img
                        src={coverPhotoURL}
                        alt="Capa de Perfil"
                        className="w-full h-full object-cover pointer-events-none transition-all duration-75"
                        style={{ objectPosition: coverPosition }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-slate-950 via-sky-950/40 to-slate-950" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/20 to-transparent pointer-events-none" />

                    {/* OVERLAY DE MODO DE REPOSICIONAMENTO (QUANDO ATIVO) */}
                    {isRepositioning && (
                      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-between p-3 z-30 pointer-events-none">
                        <span className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-400/50 text-sky-300 text-[10px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                          <ArrowsVertical size={13} />
                          <span>Clique e arraste verticalmente para ajustar o enquadramento</span>
                        </span>

                        <div className="flex items-center gap-2 pointer-events-auto">
                          <button
                            type="button"
                            onClick={handleSaveCoverPosition}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Check size={14} />
                            <span>Salvar Posição</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelCoverPosition}
                            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-slate-300 hover:text-white text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <X size={14} />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* APENAS O BOTÃO LÁPIS COM TOOLTIP AO PASSAR O MOUSE (CANTO SUPERIOR DIREITO) */}
                    {!isRepositioning && (
                      <div className="absolute top-3 right-3 z-20">
                        <button
                          type="button"
                          onClick={() => setShowCoverPicker(prev => !prev)}
                          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-sky-400 hover:text-white shadow-xl backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                          title="Personalizar Foto de Capa"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AVATAR SOBREPOSTO NA CAPA (ESTILO FACEBOOK) */}
                  <div className="px-6 pb-4 flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-12 sm:-mt-14 relative z-10 gap-3">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                      <div className="relative group shrink-0">
                        <Avatar
                          displayName={displayName}
                          email={profile.email}
                          avatarStyle={avatarStyle}
                          avatarSeed={avatarSeed}
                          photoURL={photoURL}
                          avatarType={avatarType}
                          theme={profile.theme}
                          size="xl"
                          className="shadow-2xl shadow-black/80 border-4 border-slate-900 w-24 h-24 sm:w-28 sm:h-28 rounded-full"
                        />

                        {/* Botão Canto Inferior Direito: Lápis/Paleta para trocar foto de perfil */}
                        {avatarType === 'api' ? (
                          <button
                            type="button"
                            onClick={() => setAvatarSeed(secureRandomId('avatar'))}
                            className="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-slate-900"
                            title="Gerar Novo Avatar Aleatório"
                          >
                            <Palette size={13} />
                          </button>
                        ) : (
                          <label 
                            className={`absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-slate-900 ${
                              isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            title={photoURL ? "Trocar Foto de Perfil" : "Enviar Foto de Perfil"}
                          >
                            {isUploadingPhoto ? <CircleNotch size={13} className="animate-spin" /> : <Pencil size={13} />}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleProfilePhotoUpload(file);
                              }}
                            />
                          </label>
                        )}

                        {/* Botão Canto Superior Direito: Excluir Foto de Perfil */}
                        {avatarType === 'custom' && !!photoURL && (
                          <button
                            type="button"
                            onClick={handleDeleteProfilePhoto}
                            className="absolute top-0 right-0 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-slate-900"
                            title="Excluir foto de perfil"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      <div className="pb-1">
                        <h4 className="text-xl font-black text-white">{displayName || profile.email}</h4>
                        <p className="text-xs text-slate-400 font-medium capitalize">{profile.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* PAINEL EXPANDÍVEL DE OPÇÕES DE CAPA (SEM CLIPPING) */}
                  <AnimatePresence>
                    {showCoverPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-white/10 bg-slate-950/80 backdrop-blur-md rounded-b-3xl"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Camera size={14} className="text-sky-400" />
                              <span>Personalizar Foto de Capa</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowCoverPicker(false)}
                              className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Ação 1: Enviar Imagem do Computador */}
                            <label className="py-2.5 px-3.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98">
                              <Camera size={15} />
                              <span>{isUploadingCover ? 'Enviando...' : 'Enviar Foto do Computador'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsUploadingCover(true);
                                    try {
                                      const url = await uploadImage(file, { folder: 'profile_covers' });
                                      setCoverPhotoURL(url);
                                      await saveProfileFields({ coverPhotoURL: url });
                                      if (showToast) showToast('Foto de capa atualizada com sucesso!', 'success');
                                      setIsRepositioning(true);
                                      setShowCoverPicker(false);
                                    } catch (err) {
                                      console.error(err);
                                      if (showToast) showToast('Erro ao enviar foto de capa.', 'error');
                                    } finally {
                                      setIsUploadingCover(false);
                                    }
                                  }
                                }}
                              />
                            </label>

                            {/* Ação 2: Reposicionar Capa */}
                            {coverPhotoURL && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRepositioning(true);
                                  setShowCoverPicker(false);
                                }}
                                className="py-2.5 px-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                              >
                                <ArrowsVertical size={15} />
                                <span>Reposicionar Enquadramento</span>
                              </button>
                            )}

                            {/* Ação 3: Remover Capa */}
                            <button
                              type="button"
                              onClick={async () => {
                                setCoverPhotoURL('');
                                await saveProfileFields({ coverPhotoURL: '' });
                                if (showToast) showToast('Modo sem capa ativado!', 'info');
                                setShowCoverPicker(false);
                              }}
                              className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                                !coverPhotoURL
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-300'
                              } ${coverPhotoURL ? 'sm:col-span-2' : ''}`}
                            >
                              <Trash2 size={15} />
                              <span>Usar Sem Capa (Gradiente Limpo)</span>
                            </button>
                          </div>

                          {/* Ação 3: Capas Estáticas ("Stills") 100% Clicáveis e Visíveis */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              🖼️ Galeria de Capas Estáticas ("Stills")
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {COVER_STILLS.map(still => (
                                <button
                                  key={still.id}
                                  type="button"
                                  onClick={async () => {
                                    setCoverPhotoURL(still.url);
                                    await saveProfileFields({ coverPhotoURL: still.url });
                                    if (showToast) showToast(`Capa '${still.label}' ativada!`, 'success');
                                    // Mantém o painel aberto para o usuário testar outras capas livremente
                                  }}
                                  className={`h-12 rounded-xl overflow-hidden border relative group/still transition-all cursor-pointer ${
                                    coverPhotoURL === still.url
                                      ? 'border-sky-400 ring-2 ring-sky-400/40 scale-105 z-10'
                                      : 'border-white/10 hover:border-white/30'
                                  }`}
                                  title={still.label}
                                >
                                  <img src={still.url} alt={still.label} className="w-full h-full object-cover group-hover/still:scale-110 transition-transform" />
                                  <div className="absolute inset-0 bg-black/40 group-hover/still:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="text-[8px] font-black text-white px-1 py-0.5 rounded bg-black/60 truncate max-w-[90%]">
                                      {still.label}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* MODO VISUALIZAÇÃO LIMPA (READ-ONLY) OU MODO EDIÇÃO SOB DEMANDA */}
                {!isEditingInfo ? (
                  /* CARD DE RESUMO LIMPO E ELEGANTE */
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <UserIcon size={16} className="text-sky-400" />
                        <span>Informações Cadastrais</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsEditingInfo(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md"
                      >
                        <Pencil size={14} />
                        <span>Editar Informações</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</span>
                        <p className="text-sm font-bold text-white truncate">{displayName || 'Não informado'}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cargo / Função</span>
                        <p className="text-sm font-bold text-white truncate">{jobTitle || 'Não informado'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      <span>Modo de Exibição: <strong className="text-sky-300 font-bold">{avatarType === 'custom' ? 'Foto Personalizada' : 'Avatar Dinâmico'}</strong></span>
                      <span>Estilo Avatar: <strong className="text-purple-300 font-bold capitalize">{avatarStyle}</strong></span>
                    </div>
                  </div>
                ) : (
                  /* FORMULÁRIO DE EDIÇÃO EXPANDIDO (SOB DEMANDA) */
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 rounded-3xl bg-slate-950/80 border border-sky-500/30 space-y-4 shadow-2xl backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                        <Pencil size={15} />
                        <span>Editar Dados Cadastrais</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingInfo(false)}
                        className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer font-bold"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Alternância de Modo: Usar Avatar vs Usar Foto */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">
                        Modo de Exibição do Avatar
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleSwitchAvatarType('api')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            avatarType === 'api'
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-md shadow-sky-500/10'
                              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Palette size={15} />
                          <span>Usar Avatar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSwitchAvatarType('custom')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            avatarType === 'custom'
                              ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Camera size={15} />
                          <span>Usar Foto</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                        <div className="relative group">
                          <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary/80 transition-colors" size={18} />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-3.5 text-xs text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20 backdrop-blur-sm"
                            placeholder="Seu nome"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Cargo / Função</label>
                        <div className="relative group">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary/80 transition-colors" size={18} />
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-3.5 text-xs text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20 backdrop-blur-sm"
                            placeholder="Ex: Gerente de Receptivo"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seletor de Estilo de Avatar */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Estilo do Avatar (DiceBear)</label>
                      <CustomSelect
                        value={avatarStyle}
                        onChange={(val) => setAvatarStyle(val)}
                        placeholder="Selecione o estilo do avatar..."
                        options={[
                          { value: 'initials', label: 'Iniciais (Profissional)' },
                          { value: 'bottts', label: 'Robôs (Moderno)' },
                          { value: 'adventurer', label: 'Aventureiros (Amigável)' },
                          { value: 'lorelei', label: 'Rostos Minimalistas (Limpo)' },
                          { value: 'fun-emoji', label: 'Emojis Divertidos (Descontraído)' },
                          { value: 'pixel-art', label: 'Pixel Art (Retrô)' }
                        ]}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingInfo(false)}
                        className="w-1/3 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        onClick={() => {
                          setTimeout(() => setIsEditingInfo(false), 800);
                        }}
                        className={`w-2/3 flex items-center justify-center font-bold py-2.5 text-xs rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer ${
                          isSaveSuccess
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white shadow-primary/20'
                        }`}
                      >
                        {isSaveSuccess ? (
                          <>
                            <Check size={18} className="mr-1.5" />
                            Alterações Salvas!
                          </>
                        ) : (
                          <>
                            <Save size={18} className="mr-1.5" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>

            </div>
          )}

          {/* ABA: APARÊNCIA & PERSONALIZAÇÃO */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CursorClick size={22} className="text-purple-400" />
                  Estilos de Ponteiros & Cursores
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Personalize o ponteiro do mouse ao navegar pela plataforma.
                </p>
              </div>

              {/* Estilos de Cursor do Sistema */}
              <div className="border border-white/10 bg-slate-900/40 rounded-3xl p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CursorClick size={16} className="text-sky-400" />
                    <span>Estilo do Cursor do Sistema</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Personalize o ponteiro do mouse ao navegar pela plataforma.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção 1: Padrão Windows */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('default');
                      document.documentElement.setAttribute('data-cursor', 'default');
                      document.body?.setAttribute('data-cursor', 'default');
                      await saveProfileFields({ customCursorStyle: 'default' });
                      if (showToast) showToast('Cursor padrão do sistema selecionado', 'info');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'default'
                        ? 'bg-sky-500/10 border-sky-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <span>🖥️ Padrão do Sistema</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Ponteiro original do seu SO</p>
                    </div>
                    {currentCursor === 'default' && (
                      <CheckCircle size={16} className="text-sky-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 2: Ciano Enterprise */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('cyan_enterprise');
                      document.documentElement.setAttribute('data-cursor', 'cyan_enterprise');
                      document.body?.setAttribute('data-cursor', 'cyan_enterprise');
                      await saveProfileFields({ customCursorStyle: 'cyan_enterprise' });
                      if (showToast) showToast('Cursor Ciano Enterprise ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'cyan_enterprise'
                        ? 'bg-sky-500/10 border-sky-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-sky-400">
                        <span>⚡ Ciano Enterprise</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Vetor ciano com foco nos botões</p>
                    </div>
                    {currentCursor === 'cyan_enterprise' && (
                      <CheckCircle size={16} className="text-sky-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 3: Precisão Reticular */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('precision_ring');
                      document.documentElement.setAttribute('data-cursor', 'precision_ring');
                      document.body?.setAttribute('data-cursor', 'precision_ring');
                      await saveProfileFields({ customCursorStyle: 'precision_ring' });
                      if (showToast) showToast('Cursor de Precisão Reticular ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'precision_ring'
                        ? 'bg-purple-500/10 border-purple-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-purple-400">
                        <span>🎯 Precisão Reticular</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Ponto + anel de mira High-Tech</p>
                    </div>
                    {currentCursor === 'precision_ring' && (
                      <CheckCircle size={16} className="text-purple-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 4: Halo Ambient Glow */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('ambient_glow');
                      document.documentElement.setAttribute('data-cursor', 'ambient_glow');
                      document.body?.setAttribute('data-cursor', 'ambient_glow');
                      await saveProfileFields({ customCursorStyle: 'ambient_glow' });
                      if (showToast) showToast('Cursor Halo Ambient Glow ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'ambient_glow'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                        <span>✨ Halo Ambient Glow</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Seta com aura neon animada</p>
                    </div>
                    {currentCursor === 'ambient_glow' && (
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 5: Neon Violet (Laser Gaming) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('neon_violet');
                      document.documentElement.setAttribute('data-cursor', 'neon_violet');
                      document.body?.setAttribute('data-cursor', 'neon_violet');
                      await saveProfileFields({ customCursorStyle: 'neon_violet' as any });
                      if (showToast) showToast('Cursor Neon Violet ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'neon_violet'
                        ? 'bg-purple-500/10 border-purple-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-purple-400">
                        <span>🟣 Neon Violet (Laser Gaming)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Vetor violeta neon com brilho magenta</p>
                    </div>
                    {currentCursor === 'neon_violet' && (
                      <CheckCircle size={16} className="text-purple-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 6: Emerald Matrix (Verde Hacker) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('emerald_matrix');
                      document.documentElement.setAttribute('data-cursor', 'emerald_matrix');
                      document.body?.setAttribute('data-cursor', 'emerald_matrix');
                      await saveProfileFields({ customCursorStyle: 'emerald_matrix' as any });
                      if (showToast) showToast('Cursor Emerald Matrix ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'emerald_matrix'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                        <span>🟢 Emerald Matrix (Verde Hacker)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Ponteiro verde menta minimalista</p>
                    </div>
                    {currentCursor === 'emerald_matrix' && (
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 7: Solar Gold (Dourado Executivo) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('solar_gold');
                      document.documentElement.setAttribute('data-cursor', 'solar_gold');
                      document.body?.setAttribute('data-cursor', 'solar_gold');
                      await saveProfileFields({ customCursorStyle: 'solar_gold' as any });
                      if (showToast) showToast('Cursor Solar Gold ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'solar_gold'
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                        <span>🟠 Solar Gold (Dourado Executivo)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Ponteiro metálico polido de alta elegância</p>
                    </div>
                    {currentCursor === 'solar_gold' && (
                      <CheckCircle size={16} className="text-amber-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 8: Stealth Ops (Mira Tática) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('stealth_ops');
                      document.documentElement.setAttribute('data-cursor', 'stealth_ops');
                      document.body?.setAttribute('data-cursor', 'stealth_ops');
                      await saveProfileFields({ customCursorStyle: 'stealth_ops' as any });
                      if (showToast) showToast('Cursor Stealth Ops ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'stealth_ops'
                        ? 'bg-rose-500/10 border-rose-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
                        <span>🔴 Stealth Ops (Mira Tática)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Mira de alta precisão com laser vermelho</p>
                    </div>
                    {currentCursor === 'stealth_ops' && (
                      <CheckCircle size={16} className="text-rose-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 9: Diamond Crystal (Cristal Diamond) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('diamond_crystal');
                      document.documentElement.setAttribute('data-cursor', 'diamond_crystal');
                      document.body?.setAttribute('data-cursor', 'diamond_crystal');
                      await saveProfileFields({ customCursorStyle: 'diamond_crystal' as any });
                      if (showToast) showToast('Cursor Diamond Crystal ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'diamond_crystal'
                        ? 'bg-sky-500/10 border-sky-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-sky-300">
                        <span>💎 Diamond Crystal (Cristal Diamond)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Diamante lapidado translúcido futurista</p>
                    </div>
                    {currentCursor === 'diamond_crystal' && (
                      <CheckCircle size={16} className="text-sky-300 shrink-0" />
                    )}
                  </button>

                  {/* Opção 10: Plasma Fire (Cyberpunk) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('plasma_fire');
                      document.documentElement.setAttribute('data-cursor', 'plasma_fire');
                      document.body?.setAttribute('data-cursor', 'plasma_fire');
                      await saveProfileFields({ customCursorStyle: 'plasma_fire' as any });
                      if (showToast) showToast('Cursor Plasma Fire Cyberpunk ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'plasma_fire'
                        ? 'bg-rose-500/10 border-rose-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
                        <span>🔥 Plasma Fire (Cyberpunk)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Vetor vermelho neon com auréola de plasma</p>
                    </div>
                    {currentCursor === 'plasma_fire' && (
                      <CheckCircle size={16} className="text-rose-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 11: Quantum Laser (Mira Quântica) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('quantum_laser');
                      document.documentElement.setAttribute('data-cursor', 'quantum_laser');
                      document.body?.setAttribute('data-cursor', 'quantum_laser');
                      await saveProfileFields({ customCursorStyle: 'quantum_laser' as any });
                      if (showToast) showToast('Cursor Mira Quântica ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'quantum_laser'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                        <span>⚡ Mira Quântica (Cyan)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Retícula tática laser com indicador circular</p>
                    </div>
                    {currentCursor === 'quantum_laser' && (
                      <CheckCircle size={16} className="text-cyan-400 shrink-0" />
                    )}
                  </button>

                  {/* Opção 12: Galaxy Void (Vórtice Cósmico) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setCurrentCursor('galaxy_void');
                      document.documentElement.setAttribute('data-cursor', 'galaxy_void');
                      document.body?.setAttribute('data-cursor', 'galaxy_void');
                      await saveProfileFields({ customCursorStyle: 'galaxy_void' as any });
                      if (showToast) showToast('Cursor Vórtice Cósmico ativado', 'success');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentCursor === 'galaxy_void'
                        ? 'bg-purple-500/10 border-purple-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-purple-400">
                        <span>🌌 Vórtice Cósmico (Starlight)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Estrela cósmica roxa com brilho galáctico</p>
                    </div>
                    {currentCursor === 'galaxy_void' && (
                      <CheckCircle size={16} className="text-purple-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: CONCILIAÇÃO DE ACORDOS (Apenas Operador e Supervisor) */}
          {activeTab === 'reconciliation' && (profile.role === 'member' || profile.role === 'supervisor') && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calculator size={22} className="text-sky-400" />
                  Conciliação de Acordos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Painel de conferência e conciliação manual de liquidações financeiras.
                </p>
              </div>

              <div className="border border-sky-500/30 bg-sky-500/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-sky-500/20 rounded-2xl text-sky-400 border border-sky-500/30 shrink-0">
                    <Calculator size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Central de Conciliação Operacional</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      A conciliação permite validar pagamentos com relatórios bancários importados e checar divergências de extratos no sistema.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-sky-500/20 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-sky-300 font-medium">
                    ✓ Acesso restrito a Operadores e Supervisores.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenReconciliation) onOpenReconciliation();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <Calculator size={16} />
                    <span>Abrir Painel de Conciliação</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: SONS DE ALERTA & EFEITOS SONOROS */}
          {activeTab === 'sound' && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <SpeakerHigh size={22} className="text-amber-400" />
                  Sons de Alerta & Efeitos Sonoros
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Personalize os alertas áudios sintetizados disparados nas liquidações de acordos e conquistas.
                </p>
              </div>

              <div className="border border-white/10 bg-slate-900/40 rounded-3xl p-5 space-y-5">
                {/* Ativar/Desativar Som */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      {soundEnabled ? <SpeakerHigh size={16} className="text-amber-400" /> : <SpeakerSlash size={16} className="text-slate-500" />}
                      <span>Efeitos Sonoros do Sistema</span>
                    </p>
                    <p className="text-[10px] text-slate-400">Ativar efeitos de áudio em tempo real na plataforma</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      await saveProfileFields({ soundEnabled: next });
                      if (showToast) showToast(next ? 'Efeitos sonoros ativados' : 'Sons do sistema silenciados', 'info');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      soundEnabled
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {soundEnabled ? 'Ativado' : 'Silenciado'}
                  </button>
                </div>

                {/* Volume de Áudio */}
                {soundEnabled && (
                  <div className="space-y-2 p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Volume dos Efeitos ({soundVolume}%)</span>
                      <span className="text-[10px] text-amber-400 font-mono">{soundVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundVolume}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        setSoundVolume(val);
                        await saveProfileFields({ soundVolume: val });
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                )}

                {/* Escolha do Som do Acordo */}
                {soundEnabled && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Som para Acordo Pago / Meta Batida
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opção 1: Moeda de Ouro */}
                      <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        dealSoundEffect === 'coin' ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-slate-950/60 border-white/10 text-slate-400'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-amber-400">🪙 Moeda de Ouro (Chime)</p>
                          <p className="text-[10px] text-slate-400">Som brilhante de conquista financeira</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playDealSound('coin', soundVolume)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ▶ Testar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setDealSoundEffect('coin');
                              await saveProfileFields({ dealSoundEffect: 'coin' });
                              playDealSound('coin', soundVolume);
                              if (showToast) showToast('Efeito Moeda selecionado', 'success');
                            }}
                            className={`p-1.5 rounded-lg border ${dealSoundEffect === 'coin' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Opção 2: Laser Sci-Fi */}
                      <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        dealSoundEffect === 'laser' ? 'bg-cyan-500/10 border-cyan-500/40 text-white' : 'bg-slate-950/60 border-white/10 text-slate-400'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-cyan-400">⚡ Laser Sci-Fi</p>
                          <p className="text-[10px] text-slate-400">Efeito eletrônico dinâmico High-Tech</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playDealSound('laser', soundVolume)}
                            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ▶ Testar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setDealSoundEffect('laser');
                              await saveProfileFields({ dealSoundEffect: 'laser' });
                              playDealSound('laser', soundVolume);
                              if (showToast) showToast('Efeito Laser selecionado', 'success');
                            }}
                            className={`p-1.5 rounded-lg border ${dealSoundEffect === 'laser' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Opção 3: Marimba Suave */}
                      <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        dealSoundEffect === 'marimba' ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-slate-950/60 border-white/10 text-slate-400'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-emerald-400">🎹 Marimba Suave</p>
                          <p className="text-[10px] text-slate-400">Acorde harmônico orgânico relaxante</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playDealSound('marimba', soundVolume)}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ▶ Testar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setDealSoundEffect('marimba');
                              await saveProfileFields({ dealSoundEffect: 'marimba' });
                              playDealSound('marimba', soundVolume);
                              if (showToast) showToast('Efeito Marimba selecionado', 'success');
                            }}
                            className={`p-1.5 rounded-lg border ${dealSoundEffect === 'marimba' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: MINHAS METAS PESSOAIS */}
          {activeTab === 'personal_goals' && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy size={22} className="text-emerald-400" />
                  Minhas Metas Pessoais Motivacionais
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Defina os seus próprios alvos individuais do mês e do dia para impulsionar seus resultados.
                </p>
              </div>

              <div className="border border-white/10 bg-slate-900/40 rounded-3xl p-5 space-y-5">
                {/* Toggle Ativar/Desativar Meta Pessoal no Dashboard */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/10">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-200 block">Exibir Meta Pessoal no Dashboard</label>
                    <p className="text-[10px] text-slate-400">Ative ou desative a visualização do card de meta pessoal para enxugar a tela principal</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextState = !showPersonalGoal;
                      setShowPersonalGoal(nextState);
                      await saveProfileFields({ showPersonalGoal: nextState });
                      if (showToast) {
                        showToast(nextState ? '🟢 Card de Meta Pessoal ativado no Dashboard!' : '⚪ Card de Meta Pessoal ocultado do Dashboard!', 'info');
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      showPersonalGoal ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      showPersonalGoal ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Tipo de Meta */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200">Tipo de Meta Preferida</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setPersonalGoalType('value');
                        await saveProfileFields({ personalGoalType: 'value' });
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        personalGoalType === 'value'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      💵 Valor Recuperado (R$)
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setPersonalGoalType('count');
                        await saveProfileFields({ personalGoalType: 'count' });
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        personalGoalType === 'count'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      🔢 Quantidade de Acordos
                    </button>
                  </div>
                </div>

                {/* Meta Mensal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    {personalGoalType === 'value' ? 'Meta Pessoal Mensal (R$)' : 'Meta Pessoal Mensal (Nº de Acordos)'}
                  </label>
                  <input
                    type="number"
                    value={personalMonthlyGoal || ''}
                    onChange={(e) => setPersonalMonthlyGoal(Number(e.target.value))}
                    placeholder={personalGoalType === 'value' ? 'Ex: 50000' : 'Ex: 25'}
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400">Defina o valor alvo que você deseja atingir no mês</p>
                </div>

                {/* Meta Diária */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    {personalGoalType === 'value' ? 'Meta Pessoal Diária (R$)' : 'Meta Pessoal Diária (Nº de Acordos)'}
                  </label>
                  <input
                    type="number"
                    value={personalDailyGoal || ''}
                    onChange={(e) => setPersonalDailyGoal(Number(e.target.value))}
                    placeholder={personalGoalType === 'value' ? 'Ex: 2500' : 'Ex: 3'}
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400">Seu objetivo diário individual</p>
                </div>

                {/* Barra de Progresso Animada ao Salvar */}
                {isSavingPersonalGoals && (
                  <div className="space-y-1.5 pt-1 animate-fadeIn">
                    <div className="flex justify-between text-[10px] font-bold font-mono">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin text-emerald-400" />
                        Salvando metas e aplicando configurações...
                      </span>
                      <span className="text-emerald-300 font-black">{saveGoalsProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-emerald-500/30">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full transition-all duration-200"
                        style={{ width: `${saveGoalsProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Banner de Sucesso */}
                {saveGoalsSuccess && !isSavingPersonalGoals && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <span>Metas salvas com sucesso! Seu progresso no Dashboard já foi sincronizado.</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSavingPersonalGoals}
                    onClick={async () => {
                      setIsSavingPersonalGoals(true);
                      setSaveGoalsSuccess(false);
                      setSaveGoalsProgress(20);

                      const interval = setInterval(() => {
                        setSaveGoalsProgress((prev) => {
                          if (prev >= 90) {
                            clearInterval(interval);
                            return 90;
                          }
                          return prev + 25;
                        });
                      }, 100);

                      try {
                        await saveProfileFields({
                          personalMonthlyGoal,
                          personalDailyGoal,
                          personalGoalType,
                          showPersonalGoal
                        });

                        setSaveGoalsProgress(100);
                        clearInterval(interval);

                        if (soundEnabled) {
                          playDealSound(dealSoundEffect || 'coin', soundVolume ?? 80);
                        }

                        if (showToast) {
                          showToast('🎯 Metas pessoais salvas e atualizadas com sucesso!', 'success');
                        }

                        setTimeout(() => {
                          setIsSavingPersonalGoals(false);
                          setSaveGoalsSuccess(true);
                        }, 300);
                      } catch (err) {
                        clearInterval(interval);
                        setIsSavingPersonalGoals(false);
                        if (showToast) showToast('Erro ao salvar metas pessoais.', 'error');
                      }
                    }}
                    className={`w-full py-3.5 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 relative overflow-hidden ${
                      saveGoalsSuccess 
                        ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/30' 
                        : isSavingPersonalGoals 
                          ? 'bg-emerald-600/80 text-slate-900 cursor-not-allowed' 
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.99]'
                    }`}
                  >
                    {isSavingPersonalGoals ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-950" />
                        <span>Salvando no Servidor ({saveGoalsProgress}%)...</span>
                      </>
                    ) : saveGoalsSuccess ? (
                      <>
                        <CheckCircle size={16} className="text-slate-950" />
                        <span>Metas Atualizadas com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Salvar Minhas Metas Pessoais</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: PRIVACIDADE LGPD */}
          {activeTab === 'lgpd' && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={22} className="text-emerald-400" />
                  Privacidade & Direitos LGPD
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Exercício de direitos do titular dos dados conforme a Lei 13.709/2018 (LGPD).
                </p>
              </div>

              <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-3xl p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
                    Art. 18 da Lei 13.709/2018 (LGPD)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Você pode baixar a qualquer momento uma cópia estruturada de todos os seus dados cadastrais, históricos de acordos e registros de auditoria vinculados à sua conta na plataforma.
                  </p>
                </div>

                <div className="pt-3 border-t border-emerald-500/20">
                  <LgpdExportButton userId={profile.uid} userEmail={profile.email} />
                </div>
              </div>
            </div>
          )}

          {/* ABA: SIMULAÇÃO DE CARGOS (Apenas Sandbox) */}
          {activeTab === 'simulation' && profile.organizationId === 'sandbox-test' && (
            <div className="space-y-6 max-w-2xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users size={22} className="text-amber-400" />
                  Simulação de Cargos (Sandbox)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Alterne visões de cargos para testar a experiência do usuário na demonstração.
                </p>
              </div>
            </div>
          )}

          {/* ABA: CONVIDAR COLABORADORES */}
          {activeTab === 'invites' && showAdminTabs && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <PaperPlaneTilt size={22} className="text-primary" />
                  Convidar Novos Colaboradores
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Gere links de convite dinâmicos e individuais atrelados ao e-mail corporativo.
                </p>
              </div>

              {/* Linhas Dinâmicas de Convites */}
              <div className="space-y-4 bg-slate-950/20 p-5 border border-white/5 rounded-2xl">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  Colaboradores a Convidar
                </div>

                <div className="space-y-3">
                  {inviteRows.map((row, idx) => {
                    const showTeamSelector = ['member', 'supervisor', 'backoffice'].includes(row.role);
                    return (
                      <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl relative">
                        {/* E-mail */}
                        <div className="flex-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">E-mail</label>
                          <input
                            type="email"
                            placeholder="nome@empresa.com"
                            value={row.email}
                            onChange={(e) => handleInviteRowChange(idx, 'email', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all placeholder:text-white/10"
                          />
                        </div>

                        {/* Cargo (Role) */}
                        <div className="w-full md:w-44">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Cargo</label>
                          {profile.role === 'supervisor' ? (
                            <CustomSelect 
                              value={row.role}
                              onChange={(val) => handleInviteRowChange(idx, 'role', val as UserRole)}
                              className="py-2 text-xs"
                              options={[
                                { value: "member", label: "Operador" },
                                { value: "backoffice", label: "BackOffice" }
                              ]}
                            />
                          ) : (
                            <CustomSelect 
                              value={row.role}
                              onChange={(val) => handleInviteRowChange(idx, 'role', val as UserRole)}
                              className="py-2 text-xs"
                              options={[
                                { value: "member", label: "Operador" },
                                { value: "supervisor", label: "Supervisor" },
                                { value: "backoffice", label: "BackOffice" },
                                { value: "coordinator", label: "Coordenador" },
                                { value: "monitor", label: "Monitor/QA" },
                                { value: "manager", label: "Gerente" }
                              ]}
                            />
                          )}
                        </div>

                        {/* Equipe */}
                        <div className="w-full md:w-44">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Equipe</label>
                          <CustomSelect 
                            disabled={!showTeamSelector}
                            value={row.teamId || ''}
                            onChange={(val) => handleInviteRowChange(idx, 'teamId', val)}
                            className="py-2 text-xs"
                            placeholder="Sem equipe"
                            options={[
                              { value: "", label: "Sem equipe" },
                              ...managedTeamsData.map(team => ({ value: team.id, label: team.name }))
                            ]}
                          />
                        </div>

                        {/* Valor da Prestação PJ */}
                        {['member', 'backoffice', 'supervisor', 'monitor'].includes(row.role) && (
                          <div className="w-full md:w-36">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Prestação (R$)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="3000"
                              value={row.monthlyServiceValue || ''}
                              onChange={(e) => handleInviteRowChange(idx, 'monthlyServiceValue', e.target.value)}
                              className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all placeholder:text-white/10"
                            />
                          </div>
                        )}

                        {/* Ação de Remover */}
                        {inviteRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInviteRow(idx)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all self-end md:self-auto cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddInviteRow}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 border border-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    Adicionar outro
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateInvites}
                    disabled={isGeneratingInvites}
                    className="w-full sm:w-auto px-6 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isGeneratingInvites ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    Gerar Links de Convite
                  </button>
                </div>
              </div>

              {/* Tabela de Convites Pendentes */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  Convites Pendentes ({pendingInvites.length})
                </div>

                {loadingInvites ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    Nenhum convite pendente de aceitação.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-white/5 rounded-2xl bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/40 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3">E-mail</th>
                          <th className="p-3">Cargo</th>
                          <th className="p-3">Equipe</th>
                          <th className="p-3">Prestação PJ</th>
                          <th className="p-3">Expira em</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {pendingInvites.map(inv => {
                          const teamName = managedTeamsData.find(t => t.id === inv.teamId)?.name || 'Sem Equipe';
                          const inviteLink = `${window.location.origin}/register?invite=${inv.token}`;
                          const expirationDate = new Date(inv.expiresAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr key={inv.id} className="hover:bg-white/[0.01]">
                              <td className="p-3 font-semibold text-white font-mono">{inv.email}</td>
                              <td className="p-3 capitalize text-slate-400">
                                {inv.role === 'member' ? 'Operador' : inv.role}
                              </td>
                              <td className="p-3 text-slate-400">{teamName}</td>
                              <td className="p-3 text-slate-400">
                                {inv.monthlyServiceValue ? `R$ ${inv.monthlyServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="p-3 text-slate-500">{expirationDate}</td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(inviteLink);
                                      showToast('Link de convite copiado!', 'success');
                                    }}
                                    className="p-1.5 bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
                                    title="Copiar Link"
                                  >
                                    <Copy size={12} />
                                  </button>

                                  {profile.organizationId === 'sandbox-test' && (
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateAccept(inv.token, inv.email)}
                                      className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-[9px] font-black rounded-lg transition-all cursor-pointer"
                                      title="Simular Aceite"
                                    >
                                      Simular Aceite
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                                    title="Revogar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: SIMULAÇÃO SANDBOX */}
          {activeTab === 'sandbox' && profile.organizationId === 'sandbox-test' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse" />
                  Simulação de Times (Sandbox)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mude operadores e supervisores de time em tempo real. Nada será persistido no Firebase.
                </p>
              </div>

              {/* Link de Demonstração */}
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={14} className="text-primary" />
                    Visualizar Tela de Convite Aberto
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Copie o link de demonstração abaixo para visualizar exatamente a tela de cadastro que o colaborador convidado verá.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register?invite=demo`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?invite=demo`);
                      showToast('Link de demonstração copiado!', 'success');
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    Copiar
                  </button>
                </div>
              </div>

              {profile.role === 'supervisor' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Operadores das Minhas Equipes</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {sandboxService.getUsers(profile.organizationId)
                      .filter(u => u.role === 'member' && u.teamId && managedTeamsData.some(t => t.id === u.teamId))
                      .map(op => {
                        const currentTeam = managedTeamsData.find(t => t.id === op.teamId);
                        return (
                          <div key={op.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border border-slate-900 rounded-2xl gap-3">
                            <div className="flex items-center gap-3">
                            <Avatar
                              displayName={op.displayName}
                              email={op.email}
                              avatarStyle={op.avatarStyle}
                              avatarSeed={op.avatarSeed}
                              photoURL={op.photoURL}
                              avatarType={op.avatarType}
                              theme={op.theme}
                              size="sm"
                            />
                              <div>
                                <p className="text-sm font-bold text-white">{op.displayName}</p>
                                <p className="text-[10px] text-slate-400">{op.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Equipe:</span>
                                <span className="text-xs text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/25">
                                  {currentTeam ? currentTeam.name : 'Sem Time'}
                                </span>
                              </div>
                              
                              <div className="w-44">
                                <CustomSelect 
                                  value={op.teamId || ''}
                                  onChange={(val) => {
                                    const updatedUser = { ...op, teamId: val };
                                    sandboxService.setProfile(updatedUser);
                                    showToast(`Operador ${op.displayName} movido para ${managedTeamsData.find(t => t.id === val)?.name}!`, 'success');
                                  }}
                                  className="py-1.5 text-xs"
                                  options={managedTeamsData.map(t => ({ value: t.id, label: t.name }))}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {profile.role === 'manager' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Supervisores da Organização</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sandboxService.getUsers(profile.organizationId)
                      .filter(u => u.role === 'supervisor')
                      .map(sup => {
                        const supervisorTeams = managedTeamsData.filter(t => t.supervisorId === sup.uid);
                        const allTeams = managedTeamsData;
                        return (
                          <div key={sup.uid} className="flex flex-col p-5 bg-slate-950 border border-slate-900 rounded-3xl gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  displayName={sup.displayName}
                                  email={sup.email}
                                  avatarStyle={sup.avatarStyle}
                                  avatarSeed={sup.avatarSeed}
                                  theme={sup.theme}
                                  size="md"
                                />
                                <div>
                                  <p className="text-sm font-bold text-white">{sup.displayName}</p>
                                  <p className="text-[10px] text-slate-400">{sup.email}</p>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400">
                                <span className="font-bold">Equipes: </span>
                                {supervisorTeams.length > 0 
                                  ? supervisorTeams.map(t => t.name).join(', ') 
                                  : 'Nenhuma'}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vincular a Equipes:</span>
                              <div className="flex flex-wrap gap-2">
                                {allTeams.map(t => {
                                  const isLinked = t.supervisorId === sup.uid;
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        const updatedTeam = { ...t, supervisorId: isLinked ? '' : sup.uid };
                                        sandboxService.setTeam(updatedTeam);
                                        showToast(
                                          isLinked 
                                            ? `Supervisor desvinculado da equipe ${t.name}!` 
                                            : `Equipe ${t.name} agora está sob supervisão de ${sup.displayName}!`,
                                          'success'
                                        );
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                        isLinked 
                                          ? 'bg-primary/20 text-primary border-primary/30' 
                                          : 'bg-slate-900 text-slate-400 border-slate-850 hover:border-slate-700 hover:text-white'
                                      }`}
                                    >
                                      {t.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA: CONFIGURAR METAS */}
          {activeTab === 'goals' && (profile.role === 'manager' || profile.role === 'supervisor') && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target size={20} className="text-sky-400" />
                  Configurar Metas das Equipes
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure a meta mensal de recuperação financeira e a meta de efetividade de acordos da equipe selecionada.
                </p>
              </div>

              {managedTeamsData.length > 0 ? (
                <form onSubmit={handleSaveGoals} className="space-y-6">
                  <div className="space-y-4 bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                    {/* Seletor de Equipe */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Selecione a Equipe</label>
                      <CustomSelect 
                        value={selectedGoalTeamId}
                        onChange={(val) => handleGoalTeamChange(val)}
                        placeholder="Selecione a equipe..."
                        options={managedTeamsData.map(team => ({ value: team.id, label: team.name }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cota Mensal */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cota Mensal de Recuperação (R$)</label>
                        <input
                          required
                          type="number"
                          value={monthlyGoalInput}
                          onChange={(e) => setMonthlyGoalInput(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white font-bold"
                        />
                      </div>

                      {/* Meta Efetividade */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Meta de Efetividade de Acordos (%)</label>
                        <input
                          required
                          type="number"
                          value={effectivenessGoalInput}
                          onChange={(e) => setEffectivenessGoalInput(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingGoals}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 text-xs shadow-lg shadow-sky-500/15 cursor-pointer"
                  >
                    <Save size={16} />
                    {isSavingGoals ? 'Salvando...' : 'Salvar Metas da Equipe'}
                  </button>
                </form>
              ) : (
                <div className="glass-card p-8 text-center border border-white/5 rounded-2xl">
                  <p className="text-sm text-slate-400">Você não possui nenhuma equipe sob sua gerência direta para configurar metas.</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: ORGANOGRAMA / ÁRVORE */}
          {activeTab === 'org_tree' && (profile.role === 'manager' || profile.role === 'coordinator') && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Folder size={20} className="text-primary" />
                  Estrutura Organizacional
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Visualize a árvore de gerência, supervisores e equipes. Gerentes podem solicitar a transferência de supervisores.
                </p>
              </div>

              <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
                {/* Lista de Gerentes (Nível 1) */}
                {allUsers.filter(u => u.role === 'manager').map(manager => {
                  const managerId = manager.uid;
                  const isExpanded = !!expandedNodes[managerId];
                  const managedSups = allUsers.filter(u => u.role === 'supervisor' && u.managerId === managerId);
                  
                  return (
                    <div key={managerId} className="border border-white/5 rounded-xl bg-slate-950/40 overflow-hidden">
                      <div 
                        onClick={() => toggleNode(managerId)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-slate-400">
                            {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                          </button>
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {manager.displayName ? manager.displayName[0].toUpperCase() : 'G'}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">{manager.displayName}</span>
                            <span className="text-[10px] text-slate-500 ml-2 uppercase font-black tracking-wider">Gerente</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{manager.email}</span>
                      </div>

                      {isExpanded && (
                        <div className="pl-8 pr-4 pb-4 space-y-3 border-t border-white/5 bg-slate-950/20 pt-3">
                          {managedSups.length === 0 ? (
                            <p className="text-xs text-slate-500 italic pl-6">Nenhum supervisor sob esta gerência.</p>
                          ) : (
                            managedSups.map(sup => {
                              const supId = sup.uid;
                              const isSupExpanded = !!expandedNodes[supId];
                              const supTeams = allTeams.filter(t => t.supervisorId === supId);

                              return (
                                <div key={supId} className="border border-white/5 rounded-xl bg-slate-900/20 overflow-hidden">
                                  <div 
                                    onClick={() => toggleNode(supId)}
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <button type="button" className="text-slate-400">
                                        {isSupExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
                                      </button>
                                      <div className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                                        {sup.displayName ? sup.displayName[0].toUpperCase() : 'S'}
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-slate-200">{sup.displayName}</span>
                                        <span className="text-[9px] text-slate-500 ml-2 uppercase font-black tracking-wider">Supervisor</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                      {profile.role === 'manager' && managerId !== profile.uid && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowTransferModal(sup);
                                            setTargetManagerId(managerId);
                                          }}
                                          className="px-2.5 py-1 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                          Solicitar Transferência
                                        </button>
                                      )}
                                      <span className="text-[10px] text-slate-500">{sup.email}</span>
                                    </div>
                                  </div>

                                  {isSupExpanded && (
                                    <div className="pl-8 pr-3 pb-3 space-y-2 border-t border-white/5 bg-slate-900/10 pt-2">
                                      {supTeams.length === 0 ? (
                                        <p className="text-[11px] text-slate-500 italic pl-5">Nenhuma equipe sob este supervisor.</p>
                                      ) : (
                                        supTeams.map(team => {
                                          const teamId = team.id;
                                          const isTeamExpanded = !!expandedNodes[teamId];
                                          const teamOperators = allUsers.filter(u => u.role === 'member' && u.teamId === teamId);

                                          return (
                                            <div key={teamId} className="border border-white/5 rounded-lg bg-slate-950/20 overflow-hidden">
                                              <div 
                                                onClick={() => toggleNode(teamId)}
                                                className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-all"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <button type="button" className="text-slate-400">
                                                    {isTeamExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
                                                  </button>
                                                  <Users size={14} className="text-emerald-400" />
                                                  <span className="text-[11px] font-semibold text-slate-300">Equipe: {team.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500">{teamOperators.length} operadores</span>
                                              </div>

                                              {isTeamExpanded && (
                                                <div className="pl-6 pr-2 pb-2 space-y-1.5 border-t border-white/5 bg-slate-950/40 pt-1.5">
                                                  {teamOperators.length === 0 ? (
                                                    <p className="text-[10px] text-slate-500 italic pl-4">Nenhum operador nesta equipe.</p>
                                                  ) : (
                                                    teamOperators.map(op => (
                                                      <div key={op.uid} className="flex items-center justify-between p-1.5 bg-slate-900/10 rounded border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                          <div className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-400 font-bold">
                                                            {op.displayName ? op.displayName[0].toUpperCase() : 'O'}
                                                          </div>
                                                          <span className="text-[10px] font-medium text-slate-400">{op.displayName}</span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-500">{op.email}</span>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Supervisores não vinculados a nenhum gerente */}
                {allUsers.filter(u => u.role === 'supervisor' && !u.managerId).length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider ml-1">Supervisores Sem Gerente</h4>
                    <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-3">
                      {allUsers.filter(u => u.role === 'supervisor' && !u.managerId).map(sup => {
                        const supId = sup.uid;
                        const isSupExpanded = !!expandedNodes[supId];
                        const supTeams = allTeams.filter(t => t.supervisorId === supId);

                        return (
                          <div key={supId} className="border border-white/5 rounded-xl bg-slate-950/40 overflow-hidden">
                            <div 
                              onClick={() => toggleNode(supId)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <button type="button" className="text-slate-400">
                                  {isSupExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
                                </button>
                                <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                                  {sup.displayName ? sup.displayName[0].toUpperCase() : 'S'}
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-slate-200">{sup.displayName}</span>
                                  <span className="text-[9px] text-slate-500 ml-2 uppercase font-black tracking-wider">Supervisor</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                {profile.role === 'manager' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowTransferModal(sup);
                                      setTargetManagerId(profile.uid);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Assumir Supervisão
                                  </button>
                                )}
                                <span className="text-[10px] text-slate-500">{sup.email}</span>
                              </div>
                            </div>

                            {isSupExpanded && (
                              <div className="pl-8 pr-3 pb-3 space-y-2 border-t border-white/5 bg-slate-900/10 pt-2">
                                {supTeams.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 italic pl-5">Nenhuma equipe sob este supervisor.</p>
                                ) : (
                                  supTeams.map(team => (
                                    <div key={team.id} className="p-2.5 bg-slate-950/20 rounded-lg text-[11px] text-slate-300">
                                      Equipe: {team.name}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: FECHAMENTO PJ */}
          {activeTab === 'closing_pj' && (
            <ClosingPjSection 
              profile={profile}
              theme={theme}
              showToast={showToast}
            />
          )}

          {/* ABA: NOTIFICAÇÕES / TRANSFERÊNCIAS */}
          {activeTab === 'transfers' && profile.role === 'manager' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bell size={20} className="text-primary" />
                  Notificações de Transferência
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Aprove ou rejeite solicitações de outros gerentes querendo assumir a supervisão de colaboradores atualmente sob sua gestão.
                </p>
              </div>

              {transferRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-500 text-sm">
                  Nenhuma notificação pendente no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {transferRequests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="p-5 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            O gerente <span className="text-primary font-bold">{req.fromManagerName}</span> solicitou a transferência do supervisor <span className="text-sky-400 font-bold">{req.supervisorName}</span> para a gerência dele.
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">Solicitado em: {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-xl text-primary shrink-0">
                          <Bell size={20} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-end pt-2 border-t border-white/5">
                        <button
                          type="button"
                          disabled={isProcessingTransfer}
                          onClick={() => handleRejectRequest(req)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-rose-400 font-bold rounded-xl transition-all disabled:opacity-50 text-xs border border-rose-500/10 cursor-pointer"
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingTransfer}
                          onClick={() => handleAcceptRequest(req)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer"
                        >
                          Aceitar Transferência
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal de confirmação da Transferência */}
          {showTransferModal && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setShowTransferModal(null)}
            >
              <div 
                className="w-full max-w-md rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl bg-[#090d16] text-white cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="text-base font-black flex items-center gap-1.5">
                    <Globe size={18} className="text-primary" />
                    Confirmar Transferência
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(null)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Você está solicitando transferir o supervisor <span className="font-bold text-primary">{showTransferModal.displayName || showTransferModal.email.split('@')[0]}</span> para a sua gerência.
                  </p>
                  {targetManagerId === profile.uid ? (
                    <p className="text-xs text-slate-400">
                      Como este supervisor não possui gerente atualmente, a vinculação será efetuada imediatamente.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Uma solicitação de aprovação será enviada para o gerente atual. A transferência ocorrerá assim que ele aprovar.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(null)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingTransfer}
                    onClick={async () => {
                      if (targetManagerId === profile.uid) {
                        setIsProcessingTransfer(true);
                        if (profile.organizationId === 'sandbox-test') {
                          const supervisor = sandboxService.getUser(showTransferModal.uid);
                          if (supervisor) {
                            sandboxService.setProfile({
                              ...supervisor,
                              managerId: profile.uid
                            });
                          }
                          const teams = sandboxService.getTeams(profile.organizationId);
                          teams.forEach(team => {
                            if (team.supervisorId === showTransferModal.uid) {
                              sandboxService.setTeam({
                                ...team,
                                managerId: profile.uid
                              });
                            }
                          });
                          showToast('Supervisor assumido com sucesso!', 'success');
                        } else {
                          try {
                            await updateDoc(doc(db, 'users', showTransferModal.uid), {
                              managerId: profile.uid
                            });
                            const teamsRef = collection(db, 'teams');
                            const teamsSnap = await getDocs(query(teamsRef, where('supervisorId', '==', showTransferModal.uid)));
                            const updatePromises = teamsSnap.docs.map(d => updateDoc(d.ref, { managerId: profile.uid }));
                            await Promise.all(updatePromises);
                            showToast('Supervisor assumido com sucesso no Firestore!', 'success');
                          } catch (err) {
                            console.error(err);
                            showToast('Erro ao assumir supervisor.', 'error');
                          }
                        }
                        setIsProcessingTransfer(false);
                        setSandboxVersion(prev => prev + 1);
                        setShowTransferModal(null);
                      } else {
                        const requestData: Omit<TransferRequest, 'id'> = {
                          fromManagerId: profile.uid,
                          fromManagerName: profile.displayName || profile.email.split('@')[0],
                          toManagerId: targetManagerId,
                          supervisorId: showTransferModal.uid,
                          supervisorName: showTransferModal.displayName || showTransferModal.email.split('@')[0],
                          status: 'pending',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };

                        setIsProcessingTransfer(true);
                        const isSandbox = profile.organizationId === 'sandbox-test';
                        if (isSandbox) {
                          const sandboxReq = {
                            id: `sandbox-req-${Date.now()}`,
                            ...requestData
                          };
                          sandboxService.createTransferRequest(sandboxReq);
                          createNotification({
                            userId: targetManagerId,
                            title: 'Solicitação de Transferência',
                            message: `${profile.displayName || profile.email.split('@')[0]} solicitou a transferência do supervisor ${requestData.supervisorName}.`,
                            type: 'transfer_requested',
                            referenceId: sandboxReq.id
                          }, true);
                          showToast('Solicitação enviada com sucesso na simulação!', 'success');
                        } else {
                          try {
                            const reqRef = doc(collection(db, 'transfer_requests'));
                            await setDoc(reqRef, requestData);
                            await createNotification({
                              userId: targetManagerId,
                              title: 'Solicitação de Transferência',
                              message: `${profile.displayName || profile.email.split('@')[0]} solicitou a transferência do supervisor ${requestData.supervisorName}.`,
                              type: 'transfer_requested',
                              referenceId: reqRef.id
                            }, false);
                            showToast('Solicitação de transferência enviada com sucesso!', 'success');
                          } catch (err) {
                            console.error(err);
                            showToast('Erro ao enviar solicitação.', 'error');
                          }
                        }
                        setIsProcessingTransfer(false);
                        setSandboxVersion(prev => prev + 1);
                        setShowTransferModal(null);
                      }
                    }}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/15 cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Exibição dos Links Gerados */}
      {generatedInvites && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl bg-[#090d16] text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-black flex items-center gap-1.5">
                <Check size={18} className="text-emerald-400" />
                Convites Gerados com Sucesso!
              </h4>
              <button
                type="button"
                onClick={() => setGeneratedInvites(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copie os links individuais abaixo e envie para os colaboradores correspondentes para que possam se registrar:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {generatedInvites.map(inv => {
                const inviteLink = `${window.location.origin}/register?invite=${inv.token}`;
                return (
                  <div key={inv.id} className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                      <span>{inv.email}</span>
                      <span className="text-primary capitalize">{inv.role === 'member' ? 'Operador' : inv.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          showToast(`Link de ${inv.email} copiado!`, 'success');
                        }}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={12} />
                        Copiar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setGeneratedInvites(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-850 cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      )}
      {/* Modal de Simulação de E-mail Enviado no Sandbox */}
      {sandboxEmailPreview && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-white text-left">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Envelope size={18} />
                <span>Simulador Sandbox: E-mail Enviado</span>
              </span>
              <button onClick={() => setSandboxEmailPreview(null)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-950/80 p-3 rounded-xl border border-white/5">
              <p><strong>Para:</strong> {sandboxEmailPreview.to}</p>
              <p><strong>Assunto:</strong> {sandboxEmailPreview.subject}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 text-center space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-amber-400 font-bold">🔑 Códigos de Contingência (Emergência):</p>
              <div className="grid grid-cols-1 gap-1.5 font-mono text-sm font-black text-emerald-400 tracking-wider">
                {sandboxEmailPreview.backupCodes.map((code, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white/5 border border-white/5">{code}</div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSandboxEmailPreview(null)}
                className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs cursor-pointer"
              >
                Entendido
              </button>
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
    </div>
  );
}
