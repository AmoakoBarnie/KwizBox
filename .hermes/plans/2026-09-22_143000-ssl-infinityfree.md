# Plan: SSL Certificates on Custom Domains — InfinityFree for KwizBox

## Goal
Get SSL certificates working on custom domains hosted on InfinityFree for the KwizBox web app, ensuring HTTPS is enforced and all API traffic flows securely.

## Current Context
- KwizBox is hosted on InfinityFree at `kwizbox.infinityfree.io` (free tier, PHP)
- The current Python/React version (`/home/stephen/Desktop/MY APP/`) runs locally and is pushed to GitHub Pages
- InfinityFree provides free Let's Encrypt SSL, but it must be enabled per-domain in the control panel
- The old PHP backup at `_backup/php-backend/` has a `.htaccess` file that routes API calls to `php-backend/index.php` and sets CORS for `https://kwizbox.infinityfree.io`
- Current backend CORS is set to `allow_origins=["*"]` — insecure and doesn't support custom domains
- The frontend `api.js` uses `VITE_API_URL` environment variable for production API calls
- No `.htaccess` exists in the current project root to force HTTPS

## Architecture / Approach
InfinityFree handles SSL at the Apache/Nginx level via Let's Encrypt. The fix requires:
1. **Enable SSL in InfinityFree control panel** (Dashboard → Domains → SSL)
2. **Create a `.htaccess` file** at the web root to force HTTPS redirects and set security headers
3. **Configure FastAPI backend** to trust `X-Forwarded-Proto` proxy headers so it generates correct HTTPS URLs
4. **Update CORS** from `["*"]` to the specific custom domain
5. **Rebuild and deploy** the frontend with the correct production API URL

## Step-by-Step Tasks

### Task 1: Enable SSL in InfinityFree Dashboard
**Action:** Log into `InfinityFree → Control Panel → Domains → kwizbox.infinityfree.io → Manage → SSL` and enable Let's Encrypt SSL.

**Expected result:** SSL status changes from "Not enabled" to "Enabled" or "Pending" (can take up to 24 hours for issuance).

**Verification:** After issuance, `curl -I https://kwizbox.infinityfree.io` should return `HTTP/2 200` and the response headers should include `certificate: valid`.

### Task 2: Create `.htaccess` to Force HTTPS
**File:** `/home/stephen/Desktop/MY APP/.htaccess`

Create a `.htaccess` file that redirects all HTTP traffic to HTTPS, sets security headers, and configures CORS. Based on the existing `_backup/php-backend/.htaccess` pattern:

```apache
# KwizBox .htaccess — Force HTTPS on InfinityFree
RewriteEngine On

# ── Force HTTPS ──
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# ── Security headers ──
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "no-referrer"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://kwizbox.infinityfree.io; frame-ancestors 'none';"

# ── CORS headers ──
Header always set Access-Control-Allow-Origin "https://kwizbox.infinityfree.io"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
Header always set Access-Control-Allow-Credentials "true"

# ── OPTIONS preflight → 204 ──
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^ - [R=204,L]

# ── PHP backend routes (if applicable) ──
RewriteRule ^(auth|quiz|admin|curriculum|media)/(.*)$ php-backend/index.php [QSA,L]

# ── Frontend static files ──
RewriteCond %{DOCUMENT_ROOT}/frontend/dist%{REQUEST_URI} -f
RewriteRule ^ frontend/dist%{REQUEST_URI} [L]

# ── SPA fallback ──
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ frontend/dist/index.html [L]

# ── PHP settings ──
php_value display_errors 0
php_value upload_max_filesize 10M
php_value post_max_size 10M
```

**Verification:** `curl -I http://kwizbox.infinityfree.io` should return `301 Moved Permanently` → `Location: https://kwizbox.infinityfree.io/`. `curl -I https://kwizbox.infinityfree.io` should return `200 OK` with `strict-transport-security` header.

### Task 3: Configure FastAPI to Trust Proxy Headers
**File:** `/home/stephen/Desktop/MY APP/backend/src/main.py`

Update the FastAPI app to trust `X-Forwarded-Proto` and `X-Forwarded-Host` headers so it generates correct HTTPS URLs behind InfinityFree's reverse proxy. Add the `ProxyHeadersMiddleware`:

```python
from fastapi.middleware.proxy_headers import ProxyHeadersMiddleware

# After the CORS middleware setup, add:
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts=["*"],  # InfinityFree's proxy
    num_proxies=1,
)
```

Also update CORS to use the specific custom domain instead of wildcard:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kwizbox.infinityfree.io", "https://www.kwizbox.infinityfree.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Verification:** Restart backend with `bash -c 'cd /home/stephen/Desktop/MY\ APP/backend && nohup ./venv/bin/python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8001 > /tmp/uvicorn.log 2>&1 & echo "Backend PID: $!"'`. Then `curl -s http://127.0.0.1:8001/health` should return 200.

### Task 4: Update Frontend Production API URL
**File:** `/home/stephen/Desktop/MY APP/frontend/src/api.js`

Ensure the production `VITE_API_URL` points to the HTTPS endpoint:

```javascript
// Production: use HTTPS
const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : ''
```

Create `.env.production` in the frontend root:

```
VITE_API_URL=https://kwizbox.infinityfree.io
```

**Verification:** `grep "VITE_API_URL" /home/stephen/Desktop/MY\ APP/frontend/.env.production` should return `VITE_API_URL=https://kwizbox.infinityfree.io`.

### Task 5: Rebuild Frontend and Push gh-pages
Rebuild the frontend with the HTTPS API URL and push to the gh-pages branch:

```bash
cd /home/stephen/Desktop/MY\ APP/frontend
npm run build
cd ..
git subtree push --prefix frontend/dist origin gh-pages
```

**Verification:** `curl -s https://AmoakoBarnie.github.io/kwizbox/ | grep "title"` should return `<title>KwizBoz</title>`.

### Task 6: Verify SSL End-to-End
After InfinityFree SSL issuance completes (may take up to 24 hours):

```bash
# Check SSL certificate
curl -sI https://kwizbox.infinityfree.io | grep -i "strict-transport\|ssl\|certificate"

# Check HTTP→HTTPS redirect works
curl -sI http://kwizbox.infinityfree.io | grep -i "location\|301"

# Check HSTS header
curl -sI https://kwizbox.infinityfree.io | grep -i "strict-transport"

# Check API over HTTPS (if backend is also on InfinityFree)
curl -sI https://kwizbox.infinityfree.io/auth/register
```

**Expected results:**
- `HTTP/2 200` for HTTPS requests
- `301 Moved Permanently` → `https://` for HTTP requests
- `strict-transport-security` header present
- `x-content-type-options: nosniff` header present

## Tests / Validation

| Check | Command | Expected Output |
|-------|---------|-----------------|
| HTTP→HTTPS redirect | `curl -sI http://kwizbox.infinityfree.io` | `301` → `Location: https://` |
| SSL certificate | `curl -sI https://kwizbox.infinityfree.io` | `200 OK` |
| HSTS header | `curl -sI https://kwizbox.infinityfree.io` | `strict-transport-security: max-age=31536000` |
| CORS header | `curl -sI -H "Origin: https://kwizbox.infinityfree.io" -X OPTIONS https://kwizbox.infinityfree.io/auth/register` | `access-control-allow-origin: https://kwizbox.infinityfree.io` |
| Frontend loads | `curl -s https://AmoakoBarnie.github.io/kwizbox/` | `<title>KwizBoz</title>` |
| Backend health | `curl -s http://127.0.0.1:8001/health` | `200 OK` |

## Risks, Tradeoffs, and Open Questions

1. **InfinityFree Python support**: InfinityFree's free tier primarily supports PHP. The current FastAPI backend may not run on InfinityFree directly. The SSL fix applies to the Apache level, but if Python isn't supported, the backend would need to stay on GitHub Pages + a separate PaaS.
2. **SSL issuance time**: Let's Encrypt on InfinityFree can take up to 24 hours. The `.htaccess` force-HTTPS rule might cause issues during this window if visitors hit HTTP and get redirected to HTTPS before the cert is ready.
3. **Custom domain DNS**: If using a custom domain (not `infinityfree.io`), DNS must point to InfinityFree's nameservers (`ns1.infinityfree.io`, `ns2.infinityfree.io`) before SSL can be issued.
4. **`.htaccess` conflicts**: If InfinityFree uses Nginx instead of Apache, `.htaccess` directives won't work. Need to verify InfinityFree's web server type.
5. **CORS `trusted_hosts=["*"]`**: Setting `ProxyHeadersMiddleware` with `trusted_hosts=["*"]` accepts any proxy header. In production behind InfinityFree, this is acceptable since the infrastructure is trusted, but it's less secure than pinning specific IPs.
