# Deployment Instructions for designforge360.in

## Upload these files to your server:

### 1. Backend Files to Upload:
```
backend/
├── server.js
├── package.json
├── .env.production (rename to .env)
└── README.md
```

### 2. Commands to run on your server:

```bash
# Navigate to backend directory
cd /path/to/your/backend

# Install dependencies
npm install --production

# Start the server
npm start
```

### 3. Server Configuration:

#### For Apache (.htaccess in root directory):
```apache
RewriteEngine On

# Proxy API requests to Node.js backend
RewriteCond %{REQUEST_URI} ^/api/(.*)$
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# Serve static files normally
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

#### For Nginx:
```nginx
server {
    listen 80;
    server_name designforge360.in www.designforge360.in;
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location / {
        root /path/to/your/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Process Manager (Recommended):

#### Using PM2:
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
pm2 start server.js --name "designforge360-backend"

# Save PM2 configuration
pm2 save

# Setup auto-restart on server reboot
pm2 startup
```

### 5. Test Backend:
```bash
curl https://www.designforge360.in/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "DesignForge360 Backend Server is running"
}
```
