# Workians — Architecture Overview

## Product
Enterprise real estate SaaS (Housing.com / MagicBricks / 99acres class).

## Locked Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19, React Router, **Redux Toolkit**, Bootstrap 5, Axios, Chart.js |
| Backend | Node.js, Express.js, Socket.io |
| Database | MySQL 8, **mysql2**, raw SQL only (no ORM) |
| Auth | JWT + Refresh Token + RBAC |
| Uploads | Multer + Sharp |
| Email | Nodemailer |
| SMS | Twilio |
| Push | Firebase Cloud Messaging |
| Maps | Google Maps |
| PDF | PDF generator service |
| Storage | Local (dev) → S3-ready adapter |
| Deploy | Ubuntu VPS, PM2, Nginx |

## Foundation Batch (in progress)
1. Folder structure  
2. Database schema  
3. Authentication  
4. RBAC  
5. Base Layout  
6. Dashboard  

Then **stop and ask** before the next module.

## Panels
Super Admin · Admin · Builder · Agent · Owner · Buyer · Support · CMS Manager  

Future (architecture only): Tenant · CRM · Sales · Marketing · Finance · Legal
