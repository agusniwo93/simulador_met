#!/usr/bin/env bash
# Despliegue de un solo comando en el VPS de Hostinger.
# Uso:  bash deploy/update.sh
# Baja los últimos cambios de GitHub, reconstruye y reinicia la app con PM2.

set -e  # aborta si algún paso falla

cd /var/www/simulador_met

echo "→ (1/4) Bajando últimos cambios de GitHub..."
git pull origin main

echo "→ (2/4) Instalando dependencias..."
npm install

echo "→ (3/4) Construyendo la app (npm run build)..."
npm run build

echo "→ (4/4) Reiniciando con PM2..."
pm2 restart met

echo ""
echo "✅ Despliegue completo. La web ya está actualizada."
