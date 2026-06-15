/**
 * Máscaras para formatação de campos
 */

export const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Mascara o CPF para exibição segura conforme LGPD.
 * Exibe apenas os últimos 4 dígitos significativos.
 * Ex: "123.456.789-01" → "***.***.*89-01"
 * Ex: "12345678901"    → "***.***.*89-01"
 */
export const maskCPF = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 11) return cpf; // CPF incompleto, retorna como está
  return `***.***.*${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
};

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
