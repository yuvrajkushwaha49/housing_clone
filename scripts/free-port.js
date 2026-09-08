/**
 * Free a TCP port before local dev (Windows-friendly).
 * Usage: node scripts/free-port.js [port]
 */
import { execSync } from 'child_process';

const port = Number(process.argv[2] || 5000);

function freePortWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-port] Stopped PID ${pid} on port ${targetPort}`);
      } catch {
        /* already gone */
      }
    }

    if (!pids.size) {
      console.log(`[free-port] Port ${targetPort} is already free`);
    }
  } catch {
    console.log(`[free-port] Port ${targetPort} is already free`);
  }
}

function freePortUnix(targetPort) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort}`, { encoding: 'utf8' }).trim();
    if (!output) {
      console.log(`[free-port] Port ${targetPort} is already free`);
      return;
    }
    for (const pid of output.split('\n').filter(Boolean)) {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`[free-port] Stopped PID ${pid} on port ${targetPort}`);
    }
  } catch {
    console.log(`[free-port] Port ${targetPort} is already free`);
  }
}

if (process.platform === 'win32') {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
