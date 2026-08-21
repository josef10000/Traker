import { describe, it, expect } from 'vitest';

describe('SaaS Architecture & Identity Validation Rules', () => {
  it('deve gerar URLs de convite contendo obrigatoriamente token e orgId', () => {
    const buildInviteUrl = (baseUrl: string, token: string, orgId: string, orgName: string, email: string, role: string) => {
      const encodedOrg = encodeURIComponent(orgName);
      const orgIdParam = `&orgId=${encodeURIComponent(orgId)}`;
      const emailParam = `&email=${encodeURIComponent(email.trim().toLowerCase())}`;
      const roleParam = `&role=${encodeURIComponent(role)}`;
      return `${baseUrl}/accept-invite?token=${token}${orgIdParam}&org=${encodedOrg}${emailParam}${roleParam}`;
    };

    const url = buildInviteUrl('https://app.traker.com.br', 'inv-123456', 'org-abc999', 'Empresa Alfa', 'joao@alfa.com', 'supervisor');

    expect(url).toContain('token=inv-123456');
    expect(url).toContain('orgId=org-abc999');
    expect(url).toContain('org=Empresa%20Alfa');
    expect(url).toContain('email=joao%40alfa.com');
    expect(url).toContain('role=supervisor');
  });

  it('deve rejeitar aceite de convite se o e-mail autenticado não for o mesmo do convite (Integridade de Identidade)', () => {
    const validateIdentity = (authEmail: string, inviteEmail: string) => {
      const normalizedAuth = authEmail.trim().toLowerCase();
      const normalizedInvite = inviteEmail.trim().toLowerCase();
      if (normalizedAuth !== normalizedInvite) {
        throw new Error(`INVITE_EMAIL_MISMATCH: O convite foi emitido para ${normalizedInvite}, mas você está autenticado como ${normalizedAuth}.`);
      }
      return true;
    };

    expect(() => validateIdentity('maria@empresa.com', 'joao@empresa.com')).toThrowError(/INVITE_EMAIL_MISMATCH/);
    expect(validateIdentity('joao@empresa.com', 'joao@empresa.com')).toBe(true);
  });

  it('deve rejeitar convite sem organização vinculada e NUNCA usar org-master como fallback', () => {
    const createProfileFromInvite = (inviteData: { organizationId?: string; email: string }) => {
      if (!inviteData.organizationId) {
        throw new Error('INVITE_INVALID: Convite sem organização associada.');
      }
      return {
        email: inviteData.email,
        organizationId: inviteData.organizationId
      };
    };

    expect(() => createProfileFromInvite({ email: 'joao@empresa.com' })).toThrowError(/INVITE_INVALID/);
    
    const valid = createProfileFromInvite({ email: 'joao@empresa.com', organizationId: 'org-real-123' });
    expect(valid.organizationId).toBe('org-real-123');
    expect(valid.organizationId).not.toBe('org-master');
  });

  it('deve estampar acceptedTermsAt na criação do perfil de usuário corporativo', () => {
    const createUserProfile = (uid: string, email: string, orgId: string, role: string) => {
      const now = new Date().toISOString();
      return {
        uid,
        email,
        displayName: email.split('@')[0],
        role,
        organizationId: orgId,
        acceptedTermsAt: now,
        createdAt: now
      };
    };

    const profile = createUserProfile('uid-123', 'colaborador@empresa.com', 'org-99', 'member');
    expect(profile.acceptedTermsAt).toBeDefined();
    expect(typeof profile.acceptedTermsAt).toBe('string');
    expect(profile.organizationId).toBe('org-99');
  });
});
