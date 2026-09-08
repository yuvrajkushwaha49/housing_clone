const path = require('path');

const appRoot = process.env.HOUS_APP_ROOT || path.resolve(__dirname, '..');
const serverDir = path.join(appRoot, 'server');
const logDir = process.env.HOUS_LOG_DIR || '/var/log/hous';

module.exports = {
  apps: [
    {
      name: 'hous-api',
      cwd: serverDir,
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      error_file: path.join(logDir, 'api-error.log'),
      out_file: path.join(logDir, 'api-out.log'),
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
