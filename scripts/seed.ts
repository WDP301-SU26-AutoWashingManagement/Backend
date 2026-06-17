import mongoose from 'mongoose';
import { connectDB } from '../src/configs/db.config';
import { User } from '../src/models/user.model';
import { Admin } from '../src/models/admin.model';
import { ADMIN_SEED } from '../src/common/constants/seeds';
import { logger } from '../src/common/utils/logger';
import { UserRole } from '../src/common/types';

async function seedAdmin() {
  try {
    logger.info('Connecting to database...');
    await connectDB();

    logger.info('Checking if admin exists...');
    const existingAdmin = await User.findOne({ email: ADMIN_SEED.email });

    if (existingAdmin) {
      logger.info(`Admin with email ${ADMIN_SEED.email} already exists.`);
    } else {
      logger.info(`Creating admin user: ${ADMIN_SEED.email}`);
      const adminUser = await User.create(ADMIN_SEED);

      logger.info('Creating admin profile record...');
      await Admin.create({ user_id: adminUser._id });

      logger.info('Admin user created successfully.');
    }

    logger.info('Seed process finished successfully.');
  } catch (err) {
    logger.error('Error seeding admin user:', err);
  } finally {
    await mongoose.disconnect();
    logger.info('Database disconnected.');
    process.exit(0);
  }
}

seedAdmin();
