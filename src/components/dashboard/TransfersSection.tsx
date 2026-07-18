import React, { useState, useEffect } from 'react';
import { 
  Bell 
} from '@phosphor-icons/react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, TransferRequest } from '../../types';
import { sandboxService } from '../../lib/sandboxService';

interface TransfersSectionProps {
  profile: UserProfile;
  theme: 'dark' | 'light';
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TransfersSection: React.FC<TransfersSectionProps> = ({
  profile,
  theme,
  showToast
}) => {
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const requests = sandboxService.getTransferRequests ? sandboxService.getTransferRequests() : [];
        setTransferRequests(requests.filter((r: any) => r.status === 'pending') as TransferRequest[]);
        return;
      }

      const q = query(
        collection(db, 'transfer_requests'), 
        where('toManagerId', '==', profile.uid), 
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransferRequest));
      setTransferRequests(reqs);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar solicitações de transferência.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile.uid) {
      loadRequests();
    }
  }, [profile.uid]);

  const handleAcceptRequest = async (req: TransferRequest) => {
    setIsProcessingTransfer(true);
    try {
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
      }
      loadRequests();
    } catch (err) {
      console.error(err);
      showToast('Erro ao aceitar transferência.', 'error');
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  const handleRejectRequest = async (req: TransferRequest) => {
    setIsProcessingTransfer(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateTransferRequest(req.id, { status: 'rejected', updatedAt: new Date().toISOString() });
        showToast('Transferência rejeitada!', 'info');
      } else {
        await updateDoc(doc(db, 'transfer_requests', req.id), {
          status: 'rejected',
          updatedAt: new Date().toISOString()
        });
        showToast('Transferência rejeitada!', 'info');
      }
      loadRequests();
    } catch (err) {
      console.error(err);
      showToast('Erro ao rejeitar transferência.', 'error');
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  const pendingRequests = transferRequests.filter(r => r.status === 'pending');

  return (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 w-full max-w-2xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={22} className="text-sky-400" />
          Solicitações de Transferência
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Aprove ou rejeite solicitações de outros gerentes querendo assumir a supervisão de supervisores atualmente sob sua gestão.
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-500 text-sm">
          Nenhuma notificação de transferência pendente no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(req => (
            <div key={req.id} className="p-5 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O gerente <span className="text-primary font-bold">{req.fromManagerName}</span> solicitou a transferência do supervisor <span className="text-sky-400 font-bold">{req.supervisorName}</span> para a gerência dele.
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1.5">Solicitado em: {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary shrink-0">
                  <Bell size={18} />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isProcessingTransfer}
                  onClick={() => handleRejectRequest(req)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-rose-400 font-bold rounded-xl transition-all disabled:opacity-50 text-[10px] uppercase tracking-wider border border-rose-500/10 cursor-pointer"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  disabled={isProcessingTransfer}
                  onClick={() => handleAcceptRequest(req)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Aceitar Transferência
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
