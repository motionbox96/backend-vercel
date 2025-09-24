const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const BackendContentFetcher = require('./services/contentFetcher');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize content fetcher
const contentFetcher = new BackendContentFetcher();

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

// Simple visitor tracking (in-memory storage for now)
let visitorStats = {
  totalUniqueVisitors: 0,
  totalVisits: 0,
  lastUpdated: Date.now(),
  uniqueVisitorIds: new Set()
};

// Track visitor endpoint
app.post('/api/track-visitor', (req, res) => {
  try {
    const { visitorId, sessionId } = req.body;
    
    if (!visitorId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId and sessionId are required'
      });
    }

    // Count total visits
    visitorStats.totalVisits++;
    
    // Count unique visitors
    if (!visitorStats.uniqueVisitorIds.has(visitorId)) {
      visitorStats.uniqueVisitorIds.add(visitorId);
      visitorStats.totalUniqueVisitors++;
    }
    
    visitorStats.lastUpdated = Date.now();
    
    console.log(`👤 Visitor tracked: ${visitorId} | Total: ${visitorStats.totalUniqueVisitors} unique, ${visitorStats.totalVisits} visits`);
    
    res.json({
      success: true,
      stats: {
        totalUniqueVisitors: visitorStats.totalUniqueVisitors,
        totalVisits: visitorStats.totalVisits,
        lastUpdated: visitorStats.lastUpdated
      }
    });

  } catch (error) {
    console.error('❌ Visitor tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track visitor'
    });
  }
});

// Get visitor stats endpoint
app.get('/api/visitor-stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalUniqueVisitors: visitorStats.totalUniqueVisitors,
      totalVisits: visitorStats.totalVisits,
      lastUpdated: visitorStats.lastUpdated
    }
  });
});

// ========== AUTOMATED CONTENT FETCHING ENDPOINTS ==========

// Get trending articles
app.get('/api/trending-articles', async (req, res) => {
  try {
    console.log('📰 Fetching trending articles...');
    const articles = await contentFetcher.fetchTrendingContent();
    
    console.log(`✅ Retrieved ${articles.length} trending articles`);
    res.json({
      success: true,
      articles: articles,
      count: articles.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching trending articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending articles',
      message: error.message
    });
  }
});

// Get articles by category
app.get('/api/trending-articles/:category', async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`📰 Fetching articles for category: ${category}`);
    
    const allArticles = await contentFetcher.fetchTrendingContent();
    const filteredArticles = category === 'all' 
      ? allArticles 
      : allArticles.filter(article => 
          article.category.toLowerCase() === category.toLowerCase()
        );
    
    console.log(`✅ Retrieved ${filteredArticles.length} articles for category: ${category}`);
    res.json({
      success: true,
      articles: filteredArticles,
      category: category,
      count: filteredArticles.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error fetching articles for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles by category',
      message: error.message
    });
  }
});

// Force refresh trending content
app.post('/api/refresh-trending-content', async (req, res) => {
  try {
    console.log('🔄 Force refreshing trending content...');
    const articles = await contentFetcher.forceRefresh();
    
    console.log(`✅ Force refresh completed - ${articles.length} articles updated`);
    res.json({
      success: true,
      message: 'Content refreshed successfully',
      articles: articles,
      count: articles.length,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error force refreshing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh trending content',
      message: error.message
    });
  }
});

// Get content fetcher status
app.get('/api/content-status', async (req, res) => {
  try {
    const articles = contentFetcher.getArticles();
    const lastFetch = articles.length > 0 ? articles[0].fetchDate : null;
    
    res.json({
      success: true,
      status: {
        totalArticles: articles.length,
        lastFetchDate: lastFetch,
        isScheduled: true,
        nextCheckIn: '24 hours',
        sources: ['DevTo', 'HackerNews', 'GitHub', 'ProductHunt', 'Generated'],
        categories: [...new Set(articles.map(a => a.category))],
        tags: [...new Set(articles.flatMap(a => a.tags))].slice(0, 20)
      }
    });
  } catch (error) {
    console.error('❌ Error getting content status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content status',
      message: error.message
    });
  }
});

// Search articles
app.get('/api/search-articles', async (req, res) => {
  try {
    const { q, category, source, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    console.log(`🔍 Searching articles for: ${q}`);
    const allArticles = contentFetcher.getArticles();
    
    let filteredArticles = allArticles.filter(article => {
      const searchText = (article.title + ' ' + article.excerpt + ' ' + article.tags.join(' ')).toLowerCase();
      return searchText.includes(q.toLowerCase());
    });
    
    // Apply additional filters
    if (category && category !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (source && source !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.source.toLowerCase() === source.toLowerCase()
      );
    }
    
    // Limit results
    filteredArticles = filteredArticles.slice(0, parseInt(limit));
    
    console.log(`✅ Found ${filteredArticles.length} articles matching search`);
    res.json({
      success: true,
      articles: filteredArticles,
      query: q,
      filters: { category, source, limit },
      count: filteredArticles.length
    });
  } catch (error) {
    console.error('❌ Error searching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search articles',
      message: error.message
    });
  }
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

// Email configuration using your domain's SMTP server
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.designforge360.in',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

console.log('📧 Email transporter initialized with domain SMTP:', process.env.SMTP_HOST);

// Simplified test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('🔍 Testing email configuration...');
    await emailTransporter.verify();
    
    console.log('✅ Email configuration verified successfully');
    res.json({
      success: true,
      message: 'Email configuration is working correctly',
      emailUser: process.env.EMAIL_USER,
      smtpService: 'Gmail'
    });
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Email configuration failed',
      details: error.message,
      suggestion: 'Check your email credentials or enable app passwords for Gmail'
    });
  }
});

// Contact form endpoint with detailed logging
app.post('/api/contact', async (req, res) => {
  try {
    console.log('📧 Processing contact form submission...', {
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject
    });
    
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'info@designforge360.in',
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        
        <hr>
        <p><small>This email was sent from the DesignForge360 contact form.</small></p>
      `,
      replyTo: email
    };

    console.log('📤 Attempting to send email...');
    
    // Send email
    const result = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Contact form email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      message: 'Thank you! Your message has been sent successfully.',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ Contact form error:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to send message. Please try again later.';
    let suggestion = 'You can reach us directly at info@designforge360.in';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed.';
      suggestion = 'Please contact us directly at info@designforge360.in. The email service may need configuration.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection failed.';
      suggestion = 'Please contact us directly at info@designforge360.in or try again later.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email configuration.';
      suggestion = 'Please contact us directly at info@designforge360.in';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      fallback: suggestion,
      technicalDetails: `Error code: ${error.code || 'Unknown'}`
    });
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
