require('dotenv').config();
module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:4000',
  flutterwaveSecret: process.env.FLUTTERWAVE_SECRET || '',
  paystackSecret: process.env.PAYSTACK_SECRET || ''
};
