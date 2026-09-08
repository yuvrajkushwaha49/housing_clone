module.exports = {
  apps: [
    {
      name: 'hous-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
