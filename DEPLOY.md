# Despliegue en Hostinger VPS (Ubuntu)

Guía para publicar **Learning English** en un VPS de Hostinger con el dominio
`metsimulatorenglishlearning.com`.

> Esta app guarda datos en disco (base de datos `data/db.json`, imágenes y
> grabaciones en `data/uploads`). Por eso necesita un **VPS** (no serverless).

---

## 0. Antes de empezar
- ✅ **Verifica el email del dominio** (aviso en el panel de Hostinger) o se suspende.
- En el asistente del VPS elige **Ubuntu 24.04 (Sistema operativo simple)** y define
  la contraseña de `root`.
- Anota la **IP pública** del VPS (la ves en el panel del VPS).

## 1. Apuntar el dominio al VPS (DNS)
En Hostinger → tu dominio → **DNS / Nameservers** → zona DNS, crea/edita:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A    | `@`    | IP_DEL_VPS |
| A    | `www`  | IP_DEL_VPS |

> Si los nameservers están en `dns-parking`, cámbialos a los de Hostinger
> (`ns1.dns-parking.com`… ya sirven para editar la zona) o a los que indique tu
> panel. La propagación tarda de minutos a unas horas.

## 2. Conectarse por SSH
Desde tu PC (PowerShell o terminal):
```bash
ssh root@IP_DEL_VPS
```

## 3. Preparar el servidor (una sola vez)
```bash
# Actualizar
apt update && apt upgrade -y

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx

# PM2 (mantiene la app viva y la reinicia sola)
npm install -g pm2
```

## 4. Descargar y construir la app
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/agusniwo93/simulador_met.git
cd simulador_met
npm install
```

Crear el archivo de entorno de producción:
```bash
nano .env.local
```
Pega y ajusta (genera tu propio `ACCESS_SECRET`):
```
ADMIN_CODE=pon-un-codigo-fuerte
ACCESS_SECRET=pega-aqui-48-bytes-aleatorios
NEXT_PUBLIC_BASE_URL=https://metsimulatorenglishlearning.com
IZIPAY_SHOP_ID=tu-shop-id
IZIPAY_API_KEY=tu-api-key
IZIPAY_PUBLIC_KEY=tu-clave-publica
PAY_AMOUNT=15
PAY_CURRENCY=USD
```
Generar un `ACCESS_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Construir y arrancar con PM2:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # ejecuta la línea que imprima, para que arranque al reiniciar el VPS
```
La app queda escuchando en `http://127.0.0.1:3000`.

## 5. Nginx (reverse proxy)
```bash
cp deploy/nginx.conf /etc/nginx/sites-available/met
ln -s /etc/nginx/sites-available/met /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```
Ya deberías ver la web en `http://metsimulatorenglishlearning.com`.

## 6. HTTPS gratis (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d metsimulatorenglishlearning.com -d www.metsimulatorenglishlearning.com
```
Certbot configura el SSL y la renovación automática. Listo: `https://…` 🎉

---

## Actualizar la app (cuando haya cambios nuevos)
```bash
cd /var/www/simulador_met
git pull
npm install
npm run build
pm2 restart met
```

## Backups (IMPORTANTE)
La carpeta `data/` (base de datos + imágenes + grabaciones) **no está en git**.
Respáldala periódicamente, p. ej. un cron diario:
```bash
mkdir -p /root/backups
(crontab -l 2>/dev/null; echo "0 3 * * * tar -czf /root/backups/met-\$(date +\%F).tgz -C /var/www/simulador_met data") | crontab -
```

## Comandos útiles
```bash
pm2 status        # estado de la app
pm2 logs met      # ver logs en vivo
pm2 restart met   # reiniciar
```
