export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const getMonthName = (monthIndex: number) => MONTHS[monthIndex];

export const getYearRange = (startYear = 2024) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
};

export const isSameMonth = (date1: Date, date2: Date) => {
  return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
};

export const getMonthBoundaries = (month: number, year: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const getWorkingDaysInMonth = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Ignorar Domingo (0) e Sábado (6)
      workingDays++;
    }
  }
  return workingDays;
};
