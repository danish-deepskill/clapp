#!/usr/bin/env node
// Tiny launcher used by `dev` / `preview` scripts. Some environments preset
// ELECTRON_RUN_AS_NODE=1 (notably automated agent shells), which makes the
// `electron` binary behave like plain Node and breaks GUI startup. We delete
// the variable from the inherited environment before spawning the child so
// the project works regardless of where it's launched from.
import { spawn } from 'node:child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

const [, , cmd, ...args] = process.argv;
if (!cmd) {
  console.error('run-electron: missing command');
  process.exit(2);
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
