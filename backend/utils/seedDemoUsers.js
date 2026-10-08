import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const seedDemoUsers = async () => {
  try {
    const demoAccounts = [
      {
        name: 'Demo Landlord (Test Account)',
        email: 'landlord.demo@rentease.com',
        phone: '9876543210',
        password: 'Landlord@123',
        role: 'landlord',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        about: 'Official Landlord Demo Account for testing property listings, 3D floor plans, and tenant inquiries.',
      },
      {
        name: 'Demo Tenant (Test Account)',
        email: 'tenant.demo@rentease.com',
        phone: '9876543211',
        password: 'Tenant@123',
        role: 'tenant',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        about: 'Official Tenant Demo Account for testing search, wishlist, expense calculator, and property viewing.',
      },
      {
        name: 'Rent Ease Administrator',
        email: 'admin@rentease.com',
        phone: '9876543200',
        password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123',
        role: 'admin',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        about: 'Rent Ease Platform Administrator Back-Office Account',
      },
    ];

    for (const demo of demoAccounts) {
      const normalizedEmail = demo.email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail }).select('+passwordHash +password');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(demo.password, salt);

      if (!existing) {
        await User.create({
          name: demo.name,
          email: normalizedEmail,
          phone: demo.phone,
          passwordHash,
          role: demo.role,
          city: demo.city,
          state: demo.state,
          country: demo.country,
          about: demo.about,
        });
        console.log(`✓ Seeded demo account: ${normalizedEmail} [role: ${demo.role}]`);
      } else {
        // Guarantee password matches the required demo credentials on each startup
        const isMatch = await bcrypt.compare(demo.password, existing.passwordHash || existing.password || '');
        if (!isMatch || existing.role !== demo.role) {
          existing.passwordHash = passwordHash;
          existing.role = demo.role;
          await existing.save();
          console.log(`✓ Refreshed credentials for demo account: ${normalizedEmail} [role: ${demo.role}]`);
        }
      }
    }
  } catch (error) {
    console.error('Error seeding demo accounts:', error.message);
  }
};
