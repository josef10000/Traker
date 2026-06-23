import React from 'react';
import { Agreement, UserProfile, Reconciliation, CollaborationNote } from '../../types';

// Modais do sistema
import { AgreementModal } from '../modals/AgreementModal';
import { GoalModal } from '../modals/GoalModal';
import { HistoryModal } from '../modals/HistoryModal';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { TermsModal } from '../modals/TermsModal';
import { ImportCsvModal } from '../modals/ImportCsvModal';
import { WebhookSettingsModal } from '../modals/WebhookSettingsModal';
import { DashboardPreferencesModal } from '../modals/DashboardPreferencesModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ReconciliationModal } from '../modals/ReconciliationModal';
import { CollaboratorHistoryModal } from '../modals/CollaboratorHistoryModal';
import { PeopleReportModal } from '../modals/PeopleReportModal';

export interface DashboardModalsProps {
  profile: UserProfile;
  selectedTeamId: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

  // AgreementModal
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingAgreement: Agreement | null;
  setEditingAgreement: (a: Agreement | null) => void;
  handleAddOrEditAgreement: (data: any) => Promise<void>;

  // GoalModal
  isGoalModalOpen: boolean;
  setIsGoalModalOpen: (open: boolean) => void;
  handleUpdateGoal: (goal: number, effectiveness: number) => Promise<void>;
  monthlyGoal: number;
  effectivenessGoal: number;

  // HistoryModal
  selectedClientCpf: string | null;
  setSelectedClientCpf: (cpf: string | null) => void;
  clientHistory: Agreement[];
  isLoadingHistory: boolean;
  handleAnonimizeClient: (cpf: string) => Promise<void>;

  // ExportCpfModal
  isExportCpfModalOpen: boolean;
  setIsExportCpfModalOpen: (open: boolean) => void;
  executeExport: (complete: boolean) => Promise<void>;

  // TermsModal
  isTermsModalOpen: boolean;
  handleAcceptTerms: () => Promise<void>;

  // ImportCsvModal
  isImportCsvOpen: boolean;
  setIsImportCsvOpen: (open: boolean) => void;

  // WebhookSettingsModal
  isWebhookSettingsOpen: boolean;
  setIsWebhookSettingsOpen: (open: boolean) => void;
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;

  // DashboardPreferencesModal
  isPreferencesModalOpen: boolean;
  setIsPreferencesModalOpen: (open: boolean) => void;
  localHiddenCards: string[];
  handleToggleCard: (cardId: string) => Promise<void>;

  // Collision ConfirmModal
  isCollisionModalOpen: boolean;
  setIsCollisionModalOpen: (open: boolean) => void;
  collisionData: { data: any; targetTeamId: string | null } | null;
  setCollisionData: (data: { data: any; targetTeamId: string | null } | null) => void;
  saveAgreement: (data: any, targetTeamId: string | null, force: boolean) => Promise<void>;

  // Logout ConfirmModal
  isConfirmLogoutOpen: boolean;
  setIsConfirmLogoutOpen: (open: boolean) => void;
  handleLogout: () => void;

  // ReconciliationModal
  isReconciliationModalOpen: boolean;
  setIsReconciliationModalOpen: (open: boolean) => void;
  stats: { totalPaid: number; totalProjected: number };
  reconciliation: Reconciliation | null;
  handleSaveReconciliation: (officialValue: number | null, officialEffectiveness: number | null) => Promise<void>;
  handleNormalizeSaldo: () => Promise<void>;
  handleDeleteReconciliation: () => Promise<void>;
  monthAdjustments: any[];
  handleDeleteAdjustment: (id: string) => Promise<void>;

  // CollaboratorHistoryModal
  selectedCollabForHistory: any | null;
  setSelectedCollabForHistory: (collab: any | null) => void;
  collabNotesHistory: CollaborationNote[];
  isLoadingCollabHistory: boolean;

  // PeopleReportModal
  isPeopleReportOpen: boolean;
  setIsPeopleReportOpen: (open: boolean) => void;
  currentTeamMembers: any[];
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  profile,
  selectedTeamId,
  showToast,

  isModalOpen,
  setIsModalOpen,
  editingAgreement,
  setEditingAgreement,
  handleAddOrEditAgreement,

  isGoalModalOpen,
  setIsGoalModalOpen,
  handleUpdateGoal,
  monthlyGoal,
  effectivenessGoal,

  selectedClientCpf,
  setSelectedClientCpf,
  clientHistory,
  isLoadingHistory,
  handleAnonimizeClient,

  isExportCpfModalOpen,
  setIsExportCpfModalOpen,
  executeExport,

  isTermsModalOpen,
  handleAcceptTerms,

  isImportCsvOpen,
  setIsImportCsvOpen,

  isWebhookSettingsOpen,
  setIsWebhookSettingsOpen,
  webhookUrl,
  setWebhookUrl,

  isPreferencesModalOpen,
  setIsPreferencesModalOpen,
  localHiddenCards,
  handleToggleCard,

  isCollisionModalOpen,
  setIsCollisionModalOpen,
  collisionData,
  setCollisionData,
  saveAgreement,

  isConfirmLogoutOpen,
  setIsConfirmLogoutOpen,
  handleLogout,

  isReconciliationModalOpen,
  setIsReconciliationModalOpen,
  stats,
  reconciliation,
  handleSaveReconciliation,
  handleNormalizeSaldo,
  handleDeleteReconciliation,
  monthAdjustments,
  handleDeleteAdjustment,

  selectedCollabForHistory,
  setSelectedCollabForHistory,
  collabNotesHistory,
  isLoadingCollabHistory,

  isPeopleReportOpen,
  setIsPeopleReportOpen,
  currentTeamMembers
}) => {
  return (
    <>
      <AgreementModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgreement(null);
        }}
        onSubmit={handleAddOrEditAgreement}
        editingAgreement={editingAgreement}
        currentUserProfile={profile}
      />

      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSubmit={handleUpdateGoal}
        monthlyGoal={monthlyGoal}
        effectivenessGoal={effectivenessGoal}
      />

      <HistoryModal 
        isOpen={!!selectedClientCpf}
        onClose={() => setSelectedClientCpf(null)}
        clientCpf={selectedClientCpf}
        history={clientHistory}
        isLoading={isLoadingHistory}
        userName={profile.displayName}
        isSupervisor={profile.role === 'supervisor'}
        onAnonimize={handleAnonimizeClient}
        organizationId={profile.organizationId || undefined}
      />

      <ExportCpfModal
        isOpen={isExportCpfModalOpen}
        onClose={() => setIsExportCpfModalOpen(false)}
        onExport={executeExport}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onAccept={handleAcceptTerms}
      />

      <ImportCsvModal 
        isOpen={isImportCsvOpen} 
        onClose={() => setIsImportCsvOpen(false)} 
        profile={profile} 
        selectedTeamId={selectedTeamId} 
        onImportSuccess={() => setIsImportCsvOpen(false)} 
        showToast={showToast} 
      />

      {profile.role === 'super_admin' && (
        <WebhookSettingsModal 
          isOpen={isWebhookSettingsOpen} 
          onClose={() => setIsWebhookSettingsOpen(false)} 
          organizationId={profile.organizationId || ''} 
          currentWebhookUrl={webhookUrl} 
          onSaveSuccess={setWebhookUrl} 
          showToast={showToast} 
        />
      )}

      <DashboardPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        hiddenCards={localHiddenCards}
        onToggleCard={handleToggleCard}
      />

      <ConfirmModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        onConfirm={async () => {
          if (collisionData) {
            await saveAgreement(collisionData.data, collisionData.targetTeamId, true);
            setIsCollisionModalOpen(false);
            setCollisionData(null);
          }
        }}
        title="Colisão de CPF Detectada"
        message="Este cliente possui outra negociação ativa (Pendente ou Retorno Agendado). Deseja forçar a criação deste acordo? Esta ação será registrada no histórico de auditoria."
        variant="warning"
        confirmText="Forçar Criação"
        cancelText="Voltar"
      />

      <ConfirmModal
        isOpen={isConfirmLogoutOpen}
        onClose={() => setIsConfirmLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Encerrar Sessão"
        message="Tem certeza que deseja sair do sistema? Suas alterações salvas não serão perdidas."
        variant="danger"
      />

      <ReconciliationModal 
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        trackerValue={stats.totalPaid}
        trackerProjected={stats.totalProjected}
        currentOfficialValue={reconciliation?.officialValue || 0}
        currentOfficialEffectiveness={reconciliation?.officialEffectiveness || 0}
        onSave={handleSaveReconciliation}
        onNormalize={handleNormalizeSaldo}
        onClear={handleDeleteReconciliation}
        adjustments={monthAdjustments}
        onDeleteAdjustment={handleDeleteAdjustment}
      />

      <CollaboratorHistoryModal 
        isOpen={selectedCollabForHistory !== null}
        onClose={() => setSelectedCollabForHistory(null)}
        collaboratorName={selectedCollabForHistory ? (selectedCollabForHistory.displayName || selectedCollabForHistory.email.split('@')[0]) : ''}
        notes={collabNotesHistory}
        isLoading={isLoadingCollabHistory}
      />

      <PeopleReportModal 
        isOpen={isPeopleReportOpen}
        onClose={() => setIsPeopleReportOpen(false)}
        orgId={profile.organizationId || ''}
        collaborators={currentTeamMembers}
      />
    </>
  );
};
