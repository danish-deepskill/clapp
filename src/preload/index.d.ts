import type { ClappAPI } from './index';

declare global {
  interface Window {
    clapp: ClappAPI;
  }
}

export {};
