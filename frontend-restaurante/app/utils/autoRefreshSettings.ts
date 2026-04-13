const STORAGE_KEY = 'restaurante.autoRefreshSettings.v1';
const ALLOWED_INTERVALS = [10, 15, 30, 60] as const;

export interface AutoRefreshSettings {
  autoAtualizar: boolean;
  intervaloSegundos: number;
}

export const DEFAULT_AUTO_REFRESH_SETTINGS: AutoRefreshSettings = {
  autoAtualizar: true,
  intervaloSegundos: 15,
};

function normalizeInterval(value: number): number {
  return ALLOWED_INTERVALS.includes(value as (typeof ALLOWED_INTERVALS)[number])
    ? value
    : DEFAULT_AUTO_REFRESH_SETTINGS.intervaloSegundos;
}

export function readAutoRefreshSettings(): AutoRefreshSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_AUTO_REFRESH_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_AUTO_REFRESH_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AutoRefreshSettings>;
    return {
      autoAtualizar:
        typeof parsed.autoAtualizar === 'boolean'
          ? parsed.autoAtualizar
          : DEFAULT_AUTO_REFRESH_SETTINGS.autoAtualizar,
      intervaloSegundos: normalizeInterval(Number(parsed.intervaloSegundos)),
    };
  } catch {
    return DEFAULT_AUTO_REFRESH_SETTINGS;
  }
}

export function writeAutoRefreshSettings(settings: AutoRefreshSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  const safeSettings: AutoRefreshSettings = {
    autoAtualizar: Boolean(settings.autoAtualizar),
    intervaloSegundos: normalizeInterval(Number(settings.intervaloSegundos)),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
}

export function getAutoRefreshStorageKey(): string {
  return STORAGE_KEY;
}
