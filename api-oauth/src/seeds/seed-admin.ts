import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Session } from '../entities/session.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { AuditLog } from '../entities/audit-log.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'fnbpos_oauth',
  entities: [User, RefreshToken, Session, PasswordReset, AuditLog],
  synchronize: true, // Create tables if not exist
  logging: true,
});

async function seed() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected to database');

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin user exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@techres.vn', userType: UserType.ADMIN },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
    } else {
      // Create admin user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('Admin@123', saltRounds);

      const adminUser = userRepository.create({
        email: 'admin@techres.vn',
        passwordHash,
        name: 'Super Admin',
        phone: '0900000000',
        userType: UserType.ADMIN,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
      });

      await userRepository.save(adminUser);
      console.log('Admin user created successfully!');
      console.log('Email:', adminUser.email);
      console.log('Password: Admin@123');
    }

    // Create support user for testing
    const existingSupport = await userRepository.findOne({
      where: { email: 'support@techres.vn', userType: UserType.ADMIN },
    });

    if (existingSupport) {
      console.log('Support user already exists:', existingSupport.email);
    } else {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('Support@123', saltRounds);

      const supportUser = userRepository.create({
        email: 'support@techres.vn',
        passwordHash,
        name: 'Support User',
        phone: '0900000001',
        userType: UserType.ADMIN,
        role: UserRole.SUPPORT,
        isActive: true,
        isEmailVerified: true,
      });

      await userRepository.save(supportUser);
      console.log('Support user created successfully!');
      console.log('Email:', supportUser.email);
      console.log('Password: Support@123');
    }

    console.log('\n=== Seed completed successfully! ===');
    console.log('\nDefault accounts:');
    console.log('1. admin@techres.vn / Admin@123 (Super Admin)');
    console.log('2. support@techres.vn / Support@123 (Support)');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
