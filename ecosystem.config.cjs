// pm2 process file for the droplet. See docs/deploy.md.
// The API reads the rest of its config from the root .env.
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'apps/api/dist/index.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
    },
  ],
};
