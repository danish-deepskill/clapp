/**
 * Discriminated result type used by IPC handlers to surface known service
 * errors to the renderer without losing the error class across the IPC
 * boundary (Electron strips class info from thrown errors).
 */

export type IpcErrorCode = 'DUPLICATE' | 'EMPTY' | 'NOT_FOUND';

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: IpcErrorCode; message: string };
