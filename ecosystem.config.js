// Configuración de PM2 para producción (Hostinger VPS).
// Uso:  pm2 start ecosystem.config.js  &&  pm2 save
// Las variables secretas (ADMIN_CODE, ACCESS_SECRET, IZIPAY_*, etc.) van en
// .env.local — Next.js las carga solo; NO las pongas aquí ni en git.
module.exports = {
  apps: [
    {
      name: "met",
      cwd: "/var/www/simulador_met",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
