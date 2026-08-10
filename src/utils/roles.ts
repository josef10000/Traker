/**
 * @file src/utils/roles.ts
 * Utilitario centralizado de verificacao de papeis (RBAC).
 * SEGURANCA: Definicao unica de isSuperUser - elimina inconsistencias entre componentes.
 * Qualquer alteracao de regra de negocio de papel deve ocorrer SOMENTE aqui.
 */

import type { UserRole } from '../types';

/** Papeis com acesso elevado (supervisao, gestao ou admin). */
export const SUPER_USER_ROLES: ReadonlyArray<UserRole> = [
  'supervisor',
  'manager',
  'coordinator',
  'super_admin',
  'monitor',
] as const;

/**
 * Verifica se o papel dado tem nivel de acesso elevado (super usuario).
 * Use esta funcao em TODOS os componentes ao inves de comparacoes inline.
 */
export function checkIsSuperUser(role: string | undefined | null): boolean {
  if (!role) return false;
  return SUPER_USER_ROLES.includes(role as UserRole);
}

/**
 * Verifica se o papel dado e estritamente o de operador de linha de frente
 * (sem qualquer permissao de supervisao).
 */
export function isOperatorOnly(role: string | undefined | null): boolean {
  return role === 'operator' || role === 'backoffice';
}
