/**
 * Serviço de Feriados Nacionais (BrasilAPI)
 * Totalmente gratuito, sem necessidade de chave de API.
 */

export interface NationalHoliday {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: string;
}

const cache: Record<number, NationalHoliday[]> = {};

/**
 * Busca a lista de feriados nacionais do ano informado
 */
export async function getNationalHolidays(year: number = new Date().getFullYear()): Promise<NationalHoliday[]> {
  if (cache[year]) return cache[year];

  try {
    const cachedStr = localStorage.getItem(`traker_holidays_${year}`);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      cache[year] = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (!response.ok) return [];
    const list: NationalHoliday[] = await response.json();
    cache[year] = list;
    try {
      localStorage.setItem(`traker_holidays_${year}`, JSON.stringify(list));
    } catch (e) {
      console.warn(e);
    }
    return list;
  } catch (error) {
    console.warn('Alerta Feriados: Não foi possível carregar a lista da BrasilAPI:', error);
    return [];
  }
}

/**
 * Verifica se uma data específica (YYYY-MM-DD) é feriado nacional
 */
export function isNationalHoliday(dateStr: string, holidays: NationalHoliday[]): NationalHoliday | undefined {
  return holidays.find(h => h.date === dateStr);
}
