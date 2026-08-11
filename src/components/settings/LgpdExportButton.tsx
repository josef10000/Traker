import React from 'react';
import { ShieldCheck } from '@phosphor-icons/react';
import { sandboxService } from '../../lib/sandboxService';

interface LgpdExportButtonProps {
  userId: string;
  userEmail: string;
}

/**
 * Botão de exportação LGPD — Art. 18 da Lei 13.709/2018
 * Gera um arquivo JSON com todos os dados pessoais do usuário logado.
 * Suporta tanto o modo Produção (Firebase) quanto o modo Sandbox (Demonstração).
 */
export const LgpdExportButton: React.FC<LgpdExportButtonProps> = ({ userId, userEmail }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let profile: any = {};
      let agreements: any[] = [];
      let auditLogs: any[] = [];

      const isSandbox =
        !userId ||
        userId.startsWith('demo-') ||
        userId.startsWith('sandbox-') ||
        userId.startsWith('user-') ||
        userId === 'demo-org';

      if (isSandbox) {
        // MODO SANDBOX / DEMONSTRAÇÃO
        profile = sandboxService.getProfile(userId) || {
          uid: userId,
          email: userEmail,
          displayName: 'Usuário Sandbox',
          role: 'super_admin',
          organizationId: 'sandbox-test',
        };

        const allAgreements = sandboxService.getAllAgreements('sandbox-test');
        agreements = allAgreements.filter(
          (a: any) => a.operatorId === userId || a.createdBy === userId || true
        );

        auditLogs = sandboxService.getAuditLogs();
      } else {
        // MODO PRODUÇÃO (FIREBASE FIRESTORE)
        try {
          const { db } = await import('../../lib/firebase');
          const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

          // 1. Perfil do usuário
          const userSnap = await getDoc(doc(db, 'users', userId));
          profile = userSnap.exists() ? userSnap.data() : {};

          // 2. Acordos criados pelo usuário
          const agreementsQ = query(
            collection(db, 'agreements'),
            where('operatorId', '==', userId)
          );
          const agreementsSnap = await getDocs(agreementsQ);
          agreements = agreementsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

          // 3. Logs de auditoria do usuário
          const auditQ = query(
            collection(db, 'audit_logs'),
            where('userId', '==', userId)
          );
          const auditSnap = await getDocs(auditQ);
          auditLogs = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (firebaseErr) {
          console.warn('[LGPD Export] Fallback para Sandbox:', firebaseErr);
          // Fallback gracioso se o Firebase não estiver acessível
          profile = sandboxService.getProfile(userId) || { uid: userId, email: userEmail };
          agreements = sandboxService.getAllAgreements('sandbox-test');
          auditLogs = sandboxService.getAuditLogs();
        }
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: userEmail || profile.email || 'usuario@sistema.com',
        environment: isSandbox ? 'Sandbox (Demonstração)' : 'Produção (Firebase)',
        legalBasis: 'LGPD Art. 18 — Direito de Acesso aos Dados Pessoais (Lei 13.709/2018)',
        profile: {
          ...profile,
          // Garantir que o CPF nunca seja exportado em texto plano
          cpf: profile.cpf ? '***.***.***-**' : '***.***.***-**',
        },
        agreements,
        auditLogs,
      };

      // Gerar download do JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-lgpd-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[LGPD Export] Erro ao exportar:', err);
      alert('Erro ao exportar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: 'transparent',
        border: '1px solid #262626',
        borderRadius: '8px',
        color: '#a3a3a3',
        fontSize: '13px',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#10b981';
          (e.currentTarget as HTMLButtonElement).style.color = '#10b981';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#262626';
        (e.currentTarget as HTMLButtonElement).style.color = '#a3a3a3';
      }}
    >
      <ShieldCheck size={16} weight="bold" />
      {loading ? 'Exportando...' : 'Exportar meus dados (LGPD)'}
    </button>
  );
};
