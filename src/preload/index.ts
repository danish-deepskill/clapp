import { contextBridge } from 'electron';

/**
 * Typed bridge exposed to the renderer as `window.clapp`. Domain namespaces
 * land here as screen PRs add them — see HANDOFF.md §13.2 for the contract.
 * Each call should be `invoke('<domain>:<action>', input)`.
 */
const api = {
  // Filled in by screen PRs:
  //   member: { list, create, edit, ... },
  //   attendance: { list, save, ... },
  //   meeting: { ... },
  //   report: { ... },
  //   eventLog: { ... },
  //   settings: { ... },
  //   backup: { ... },
} as const;

contextBridge.exposeInMainWorld('clapp', api);

export type ClappAPI = typeof api;
