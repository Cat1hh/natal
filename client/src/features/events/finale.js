// O Rank provisório libera em 25/12/2026 às 00:00, horário de Brasília (UTC-3),
// encerrando a tela exclusiva de créditos (até 24/12 às 23h59).
// A conferência final e contestações ocorrem de 26/12 a 28/12, consolidando em 29/12 às 00:00.
// Usa instantes fixos com fuso UTC-3, sem depender do relógio/fuso do dispositivo.
// Isto é apenas para a interface: o servidor continua validando envios e permissões.

export const FINALE_AT = new Date('2026-12-25T00:00:00-03:00').getTime();
export const FINAL_CONFIRMED_AT = new Date('2026-12-29T00:00:00-03:00').getTime();

export const isFinaleNow = () => Date.now() >= FINALE_AT;
export const isFinalConfirmedNow = () => Date.now() >= FINAL_CONFIRMED_AT;