# Workians — Production deployment

Target: Ubuntu 22.04+ VPS, Node 20+, MySQL 8, Nginx, PM2, SSL (Let’s Encrypt).

## 1. Checklist

- [ ] MySQL created (`hous_db`) with a dedicated user (not root in production)
- [ ] Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars each)
- [ ] `NODE_ENV=production`, `CORS_ORIGIN` = public frontend origin
- [ ] SMTP credentials for real mail (or keep Ethereal for staging)
- [ ] `UPLOAD_DIR` absolute path with write permissions (e.g. `/var/www/hous/uploads`)
- [ ] Firewall: 22, 80, 443 only (Node listens on localhost:5000)
- [ ] Backups: nightly `mysqldump` + uploads tarball
- [ ] Domain DNS A/AAAA → VPS

## 2. App layout on server

```text
/var/www/hous/
  client/          # Vite build → dist served by Nginx
  server/          # Express API (PM2)
  uploads/         # local media (swap to S3 later)
  deploy/          # nginx + pm2 samples
```

## 3. Build & migrate

```bash
cd /var/www/hous/server
cp .env.example .env   # edit production values
npm ci
npm run migrate
npm run seed

cd /var/www/hous/client
cp .env.example .env   # VITE_API_URL=https://api.yourdomain.com/api/v1
npm ci
npm run build
```

## 4. PM2

```bash
cd /var/www/hous/server
pm2 start ../deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Nginx

Copy `deploy/nginx.conf.example` to `/etc/nginx/sites-available/hous`, adjust hostnames, enable site, then:

```bash
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Storage (local → S3)

Current adapter: `server/src/helpers/storage.helper.js` writes under `UPLOAD_DIR` and serves via `/uploads`.

To cut over to S3 later:

1. Add AWS SDK / compatible client
2. Implement `storeUpload` / `deleteStoredFile` to put/delete objects
3. Return public CDN URLs instead of `/uploads/...`
4. Keep the same function signatures so property/ads controllers stay unchanged

## 7. Backups (example cron)

```bash
0 2 * * * mysqldump -u hous -p'$PASS' hous_db | gzip > /backups/hous-$(date +\%F).sql.gz
0 3 * * * tar -czf /backups/hous-uploads-$(date +\%F).tgz /var/www/hous/uploads
```

## 8. Hardening notes (MVP)

Already in place:

- Helmet, CORS credentials, rate limit, JWT access + httpOnly refresh cookie
- Parameterized SQL (mysql2 named placeholders)
- Soft deletes on domain tables
- Role + permission checks on sensitive routes
- Sharp image processing; upload size/type limits

Recommended before production traffic:

- Rotate JWT secrets; disable default Super Admin password after first login
- Enable HTTPS only cookies (`Secure` flag) when behind TLS
- DB backups + restore drill
- Review `CORS_ORIGIN` and Socket.io origin
- Cap compare/wishlist abuse via auth rate limits (already global)

## Out of scope (documented only)

Payment gateway · Twilio SMS · S3 production cutover · multi-tenant / CRM modules
