const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ApiErrorShape = {
  erro?: string;
  mensagem?: string;
  message?: string;
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    ...init,
  });

  const data = await parseJsonSafe<T | ApiErrorShape>(response);

  if (!response.ok) {
    const errorMessage =
      (data as ApiErrorShape | null)?.erro ||
      (data as ApiErrorShape | null)?.mensagem ||
      (data as ApiErrorShape | null)?.message ||
      `Erro HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}
