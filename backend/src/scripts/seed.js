import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multicurrency_payments';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const { default: User } = await import('../models/User.js');
    const { default: Merchant } = await import('../models/Merchant.js');
    const { default: Payment } = await import('../models/Payment.js');
    const { default: ExchangeRate } = await import('../models/ExchangeRate.js');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Merchant.deleteMany({}),
      Payment.deleteMany({}),
      ExchangeRate.deleteMany({})
    ]);

    // Create users
    const adminUser = await User.create({
      email: 'admin@payflow.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active'
    });

    const managerUser = await User.create({
      email: 'manager@payflow.com',
      password: 'Manager123!',
      firstName: 'Sarah',
      lastName: 'Manager',
      role: 'manager',
      status: 'active'
    });

    // Create merchants
    const merchants = await Merchant.insertMany([
      {
        businessName: 'TechFlow Inc',
        businessType: 'corporation',
        contactEmail: 'contact@techflow.com',
        contactPhone: '+1-555-0100',
        address: { street: '123 Tech Blvd', city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'US' },
        tier: 'enterprise',
        status: 'active',
        onboardingStatus: 'approved',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        totalVolume: 1250000,
        monthlyVolume: 320000
      },
      {
        businessName: 'Global Retail Co',
        businessType: 'corporation',
        contactEmail: 'info@globalretail.com',
        contactPhone: '+44-20-1234-5678',
        address: { street: '456 Commerce St', city: 'London', postalCode: 'EC1A 1BB', country: 'GB' },
        tier: 'growth',
        status: 'active',
        onboardingStatus: 'approved',
        supportedCurrencies: ['GBP', 'EUR', 'USD'],
        totalVolume: 450000,
        monthlyVolume: 85000
      }
    ]);

    // Link merchant user
    const merchantUser = await User.create({
      email: 'merchant@techflow.com',
      password: 'Merchant123!',
      firstName: 'John',
      lastName: 'Merchant',
      role: 'merchant',
      merchantId: merchants[0]._id,
      status: 'active'
    });

    // Create exchange rates
    const rates = [
      { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92, inverseRate: 1.087 },
      { baseCurrency: 'USD', targetCurrency: 'GBP', rate: 0.79, inverseRate: 1.266 },
      { baseCurrency: 'USD', targetCurrency: 'JPY', rate: 148.5, inverseRate: 0.00674 },
      { baseCurrency: 'USD', targetCurrency: 'CAD', rate: 1.35, inverseRate: 0.741 },
      { baseCurrency: 'USD', targetCurrency: 'CHF', rate: 0.87, inverseRate: 1.149 },
      { baseCurrency: 'EUR', targetCurrency: 'GBP', rate: 0.86, inverseRate: 1.163 },
      { baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.087, inverseRate: 0.92 }
    ];

    await ExchangeRate.insertMany(rates.map(r => ({
      ...r,
      fetchedAt: new Date(),
      validFrom: new Date(),
      source: 'seed',
      status: 'active'
    })));

    // Create sample payments
    const paymentData = [
      { sourceAmount: 5000, sourceCurrency: 'USD', targetCurrency: 'EUR', status: 'completed' },
      { sourceAmount: 3200, sourceCurrency: 'GBP', targetCurrency: 'JPY', status: 'processing' },
      { sourceAmount: 8500, sourceCurrency: 'EUR', targetCurrency: 'USD', status: 'completed' },
      { sourceAmount: 1200, sourceCurrency: 'USD', targetCurrency: 'CAD', status: 'initiated' },
      { sourceAmount: 15000, sourceCurrency: 'USD', targetCurrency: 'GBP', status: 'settled' }
    ];

    for (const data of paymentData) {
      await Payment.create({
        ...data,
        merchantId: merchants[0]._id,
        targetAmount: data.sourceAmount * 0.92,
        netAmount: data.sourceAmount * 0.89,
        fees: { percentageFee: 2.9, flatFee: 0.30, totalFee: data.sourceAmount * 0.029 + 0.30 }
      });
    }

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('Test credentials:');
    console.log('  Admin:    admin@payflow.com / Admin123!');
    console.log('  Manager:  manager@payflow.com / Manager123!');
    console.log('  Merchant: merchant@techflow.com / Merchant123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
