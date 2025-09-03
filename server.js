const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://localhost:5176', 
    'http://localhost:5177', 
    'http://localhost:5178', 
    'http://localhost:5179', 
    'http://localhost:5180', 
    'http://localhost:5181', 
    'http://localhost:5182', 
    'https://designforge360.in', 
    'https://www.designforge360.in',
    'https://designforge360.netlify.app',
    'https://designforge360.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID,
  key_secret: process.env.VITE_RAZORPAY_KEY_SECRET,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DesignForge360 Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
  try {
    console.log('📦 Creating new order...', req.body);
    
    const { amount, currency = 'INR', receipt, notes = {} } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Amount must be greater than 0'
      });
    }

    // Ensure amount is in paise (smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Create order with Razorpay
    const orderOptions = {
      amount: amountInPaise, // amount in paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        service: notes.service || 'DesignForge360 Service',
        customer_name: notes.customer_name || '',
        customer_email: notes.customer_email || '',
        ...notes
      }
    };

    console.log('🔧 Order options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);
    
    console.log('✅ Order created successfully:', order.id);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at,
        notes: order.notes
      }
    });

  } catch (error) {
    console.error('❌ Order creation failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      details: error.message,
      code: error.error?.code || 'UNKNOWN_ERROR'
    });
  }
});

// Verify Payment
app.post('/api/verify-payment', (req, res) => {
  try {
    console.log('🔍 Verifying payment...', req.body);
    
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters'
      });
    }

    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.VITE_RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('✅ Payment verified successfully');
      
      // Here you can:
      // 1. Update database with payment status
      // 2. Send confirmation email
      // 3. Generate download links
      // 4. Update user account
      
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          verified: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Payment verification failed - Invalid signature');
      
      res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        message: 'Invalid payment signature'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message
    });
  }
});

// Get Payment Details
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log('🔍 Fetching payment details for:', paymentId);
    
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        created_at: payment.created_at,
        email: payment.email,
        contact: payment.contact
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch payment details:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details',
      details: error.message
    });
  }
});

// Capture Payment (for payments that are only authorized)
app.post('/api/capture-payment', async (req, res) => {
  try {
    const { payment_id, amount } = req.body;
    
    console.log('💰 Capturing payment:', payment_id);
    
    const payment = await razorpay.payments.capture(payment_id, amount);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        captured: payment.captured
      }
    });

  } catch (error) {
    console.error('❌ Failed to capture payment:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to capture payment',
      details: error.message
    });
  }
});

// Refund Payment
app.post('/api/refund-payment', async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;
    
    console.log('🔄 Processing refund for payment:', payment_id);
    
    const refund = await razorpay.payments.refund(payment_id, {
      amount: amount,
      notes: {
        reason: reason || 'Requested by customer',
        refund_date: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        created_at: refund.created_at
      }
    });

  } catch (error) {
    console.error('❌ Failed to process refund:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process refund',
      details: error.message
    });
  }
});

// Webhook handler for Razorpay events
app.post('/api/webhook', (req, res) => {
  try {
    const webhookSignature = req.get('X-Razorpay-Signature');
    const webhookBody = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature === expectedSignature) {
      console.log('📨 Webhook received:', req.body.event);
      
      // Handle different webhook events
      switch (req.body.event) {
        case 'payment.captured':
          console.log('✅ Payment captured:', req.body.payload.payment.entity.id);
          // Handle successful payment
          break;
          
        case 'payment.failed':
          console.log('❌ Payment failed:', req.body.payload.payment.entity.id);
          // Handle failed payment
          break;
          
        case 'order.paid':
          console.log('💰 Order paid:', req.body.payload.order.entity.id);
          // Handle order completion
          break;
      }
      
      res.status(200).json({ status: 'ok' });
    } else {
      console.log('⚠️ Invalid webhook signature');
      res.status(400).json({ error: 'Invalid signature' });
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DesignForge360 Backend Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Razorpay Key: ${process.env.VITE_RAZORPAY_KEY_ID ? `${process.env.VITE_RAZORPAY_KEY_ID.substring(0, 15)}...` : 'Not configured'}`);
});

module.exports = app;
