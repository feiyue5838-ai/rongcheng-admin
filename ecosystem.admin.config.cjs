module.exports = {
  apps: [{
    name: 'rongcheng-admin',
    script: 'node_modules/vite/bin/vite.js',
    args: '',
    cwd: 'D:/rongcheng-admin/admin',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
    },
    log_file: 'D:/temp/logs/admin.log',
    error_file: 'D:/temp/logs/admin-error.log',
    out_file: 'D:/temp/logs/admin-out.log',
    merge_logs: true,
  }]
};
