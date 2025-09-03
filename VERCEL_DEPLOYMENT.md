# DesignForge360 Backend - Vercel Deployment Guide

## 🚀 Deploy to Vercel with GitHub Integration

### Step 1: Prepare Your Repository

1. **Create/Update .gitignore:**
```
node_modules/
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.log
```

2. **Environment Variables Setup:**
   - Create `.env.production` for production values
   - Keep `.env` for local development

### Step 2: GitHub Setup

1. **Initialize Git Repository:**
```bash
git init
git add .
git commit -m "Initial backend setup"
```

2. **Create GitHub Repository:**
   - Go to github.com → New Repository
   - Name: `designforge360-backend`
   - Set as Public/Private
   - Don't initialize with README (you already have files)

3. **Push to GitHub:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/designforge360-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Vercel Deployment

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your `designforge360-backend` repository

2. **Configure Environment Variables in Vercel:**
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add these variables:
   ```
   NODE_ENV=production
   VITE_RAZORPAY_KEY_ID=rzp_live_RCoWZKL5Oszs2w
   VITE_RAZORPAY_KEY_SECRET=Lcb73wbugUu60iByn7Ju68Ft
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your backend

### Step 4: Update Frontend Configuration

After deployment, update your frontend to use the Vercel URL:
```javascript
// Replace localhost with your Vercel URL
const API_BASE_URL = 'https://your-backend.vercel.app/api'
```

### Step 5: Configure Custom Domain (Optional)

1. In Vercel Dashboard → Domains
2. Add your custom domain (e.g., `api.designforge360.in`)
3. Update DNS records as instructed

## 🔄 Continuous Deployment

Once set up:
- Push to GitHub `main` branch → Auto-deploy to production
- Push to other branches → Deploy preview URLs
- Pull requests → Automatic preview deployments

## 📊 Benefits You'll Get:

- ✅ **Global Access**: Your API accessible worldwide
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **HTTPS**: Secure by default
- ✅ **Monitoring**: Built-in analytics and logs
- ✅ **Zero Downtime**: Automatic deployments
- ✅ **Version Control**: Easy rollbacks

## 🔧 Post-Deployment:

Your API will be available at:
- `https://your-backend.vercel.app/api/health`
- `https://your-backend.vercel.app/api/create-order`
- etc.

## 💡 Pro Tips:

1. **Environment Management**: Use different Vercel projects for staging/production
2. **Webhooks**: Configure Razorpay webhooks to use your Vercel URL
3. **Monitoring**: Set up Vercel Analytics for performance insights
4. **Branch Protection**: Protect main branch for stable deployments

## 🚨 Important Notes:

- **Live Keys**: You're using production Razorpay keys - real payments will be processed
- **CORS**: Your CORS configuration already includes Vercel domains
- **Serverless**: Vercel runs your backend as serverless functions
