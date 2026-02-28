module.exports = {
  apps: [
    {
      name: 'absenin-backend',
      cwd: '/var/www/absenin/backend',
      script: 'src/app.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/absenin/backend-error.log',
      out_file: '/var/log/absenin/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: 'absenin-frontend',
      cwd: '/var/www/absenin/frontend',
      script: '.next/standalone/server.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/absenin/frontend-error.log',
      out_file: '/var/log/absenin/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
