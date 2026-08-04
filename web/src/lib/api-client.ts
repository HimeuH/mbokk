import { getAuthToken } from "./auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  // Omit Content-Type for FormData — the browser must set its own boundary.
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Every endpoint responds with the same envelope (App\Http\Responses\ApiResponse):
  // {success, data?, message?} on success, {success: false, message, errors?} on error.
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "Une erreur est survenue.",
      response.status,
      body?.errors,
    );
  }

  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
}

/**
 * `ApiError.message` is only ever the generic envelope message ("Les
 * données envoyées sont invalides.") — the actual reason lives in `errors`
 * (App\Http\Responses\ApiResponse::error()'s per-field validation map).
 * Surface that instead wherever a form shows a single error string, so
 * "numéro déjà associé à un compte" doesn't get swallowed by "données
 * invalides".
 */
export function firstErrorMessage(err: ApiError): string {
  if (err.errors) {
    for (const messages of Object.values(err.errors)) {
      if (messages?.[0]) return messages[0];
    }
  }
  return err.message;
}
