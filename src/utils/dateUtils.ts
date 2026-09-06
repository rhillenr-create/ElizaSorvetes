/**
 * Utilitários de Data e Hora com Fuso Horário de Brasília (America/Sao_Paulo, UTC-3).
 * 
 * Regra de Negócio Crítica:
 * - A partir de 21:00 (21 horas), continua estritamente sendo o mesmo dia (ex: dia 5).
 * - A data SÓ MUDA para o dia seguinte (ex: dia 6) às 00:00:00 (meia-noite em ponto).
 * - Elimina qualquer desvio de UTC causado por toISOString() sem compensação de fuso.
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data no formato YYYY-MM-DD considerando o fuso horário de Brasília.
 * Se nenhuma data for informada, utiliza o momento atual.
 */
export function getBrazilDateString(dateInput?: Date | string | number | null): string {
  if (!dateInput) {
    dateInput = new Date();
  }
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) {
    return '';
  }

  // O locale en-CA formata de maneira garantida como YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(date);
}

/**
 * Retorna o mês no formato YYYY-MM considerando o fuso horário de Brasília.
 */
export function getBrazilMonthString(dateInput?: Date | string | number | null): string {
  const dateStr = getBrazilDateString(dateInput);
  return dateStr.slice(0, 7);
}

/**
 * Retorna a data de ontem no formato YYYY-MM-DD no fuso de Brasília.
 */
export function getBrazilYesterdayDateString(todayInput?: string): string {
  const baseDateStr = todayInput || getBrazilDateString();
  const parts = baseDateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '';
  }
  // Subtrai exatamente 1 dia na data local
  const prev = new Date(parts[0], parts[1] - 1, parts[2] - 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  const d = String(prev.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata uma data no formato brasileiro DD/MM/YYYY
 */
export function formatBrazilDateDisplay(dateInput?: Date | string | number | null): string {
  const ymd = getBrazilDateString(dateInput);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Retorna o horário no formato HH:MM ou HH:MM:SS no fuso de Brasília.
 */
export function formatBrazilTime(
  dateInput?: Date | string | number | null,
  includeSeconds = true
): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '--:--:--';

  return date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {})
  });
}

/**
 * Formata data e hora no padrão brasileiro 'DD/MM/YYYY HH:MM' ou com segundos.
 */
export function formatBrazilDateTime(
  dateInput?: Date | string | number | null,
  options?: { includeSeconds?: boolean }
): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' } : {})
  });
}

/**
 * Gera um timestamp ISO com o offset do fuso de Brasília (-03:00)
 * para gravação em banco de dados e compatibilidade total.
 * Exemplo: '2026-09-05T21:45:30.123-03:00'
 */
export function getBrazilIsoTimestamp(dateInput?: Date | string | number | null): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return new Date().toISOString();

  const ymd = getBrazilDateString(date);
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  return `${ymd}T${timeStr}.${ms}-03:00`;
}

/**
 * Gera um identificador sequencial com base na data e hora de Brasília
 */
export function generateBrazilTimestampId(prefix = 'CX'): string {
  const date = new Date();
  const ymd = getBrazilDateString(date).replace(/-/g, '');
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/:/g, '');

  return `${prefix}-${ymd}${timeStr}`;
}
