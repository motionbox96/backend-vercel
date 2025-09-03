# DesignForge360 Backend Server

A Node.js/Express backend server for handling Razorpay payments and order processing.

## 🚀 Features

- **Secure Order Creation**: Real Razorpay order creation with proper API integration
- **Payment Verification**: Server-side signature verification for security
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Configured for both development and production environments
- **Webhook Support**: Ready for Razorpay webhook integration
- **Payment Management**: Order creation, payment capture, and refund processing

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Razorpay account with API keys

## 🛠️ Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Copy the `.env` file and configure your Razorpay keys:

```env
# Development
NODE_ENV=development
PORT=3001

# Razorpay Keys (Get from your Razorpay Dashboard)
VITE_RAZORPAY_KEY_ID=rzp_test_your_test_key_here
VITE_RAZORPAY_KEY_SECRET=your_test_secret_here

# For production:
# VITE_RAZORPAY_KEY_ID=rzp_live_your_live_key
# VITE_RAZORPAY_KEY_SECRET=your_live_secret

# Optional: Webhook secret for webhook verification
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 🌐 API Endpoints

### Health Check
- **GET** `/api/health` - Server health status

### Order Management
- **POST** `/api/create-order` - Create new Razorpay order
- **POST** `/api/verify-payment` - Verify payment signature

### Payment Operations
- **GET** `/api/payment/:paymentId` - Get payment details
- **POST** `/api/capture-payment` - Capture authorized payment
- **POST** `/api/refund-payment` - Process refund

### Webhooks
- **POST** `/api/webhook` - Razorpay webhook handler

## 📝 Usage Examples

### Create Order
```javascript
const response = await fetch('http://localhost:3001/api/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 499, // ₹4.99
    currency: 'INR',
    notes: {
      service: 'Resume Template',
      customer_name: 'John Doe',
      customer_email: 'john@example.com'
    }
  })
});
```

### Verify Payment
```javascript
const response = await fetch('http://localhost:3001/api/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    razorpay_order_id: 'order_xxx',
    razorpay_payment_id: 'pay_xxx',
    razorpay_signature: 'signature_xxx'
  })
});
```

## 🔒 Security Features

- **Signature Verification**: All payments are verified server-side
- **CORS Protection**: Configured for specific origins only
- **Input Validation**: All inputs are validated before processing
- **Error Handling**: Secure error messages without exposing sensitive data

## 🚀 Production Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3001
VITE_RAZORPAY_KEY_ID=rzp_live_your_live_key
VITE_RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Deploy to:
- **Heroku**: `git push heroku main`
- **Vercel**: `vercel --prod`
- **DigitalOcean**: Use App Platform
- **AWS**: Use Elastic Beanstalk or Lambda

## 🔧 Integration with Frontend

The frontend automatically connects to this backend when:
1. Backend is running on `http://localhost:3001`
2. Frontend `.env` has `VITE_API_URL=http://localhost:3001/api`

## 📊 Monitoring & Logs

The server provides detailed logging for:
- Order creation attempts
- Payment verifications
- Error occurrences
- Webhook events

## 🛠️ Development

### File Structure:
```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
└── README.md         # This file
```

### Adding New Features:
1. Add new routes in `server.js`
2. Update CORS origins if needed
3. Add appropriate error handling
4. Test with both test and live keys

## 🚨 Important Notes

1. **Test vs Live Keys**: Always test with test keys first
2. **HTTPS Required**: Live keys only work on HTTPS domains
3. **Domain Restrictions**: Configure allowed domains in Razorpay dashboard
4. **Webhook Verification**: Enable webhook signature verification for production
5. **Error Logging**: Monitor logs for payment failures and debugging

## 📞 Support

For issues related to:
- **Razorpay Integration**: Check Razorpay documentation
- **Server Issues**: Check console logs and error messages
- **Payment Failures**: Verify keys and domain settings

## 🔄 Testing

### Test Payment Flow:
1. Start backend: `npm start`
2. Start frontend: `npm run dev`
3. Use test card: `4111 1111 1111 1111`
4. Check console logs for detailed flow

### Production Testing:
1. Deploy with live keys
2. Test on HTTPS domain
3. Verify webhook integration
4. Test actual payment with small amount
