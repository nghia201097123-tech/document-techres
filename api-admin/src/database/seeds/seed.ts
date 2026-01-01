import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminRole } from '../entities';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Starting database seed...');

  // Check if admin user already exists
  const adminRepo = dataSource.getRepository(AdminUser);
  const existingAdmin = await adminRepo.findOne({ where: { email: 'admin@techres.vn' } });

  if (existingAdmin) {
    console.log('⚠️  Demo admin user already exists');
  } else {
    // Create demo admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = adminRepo.create({
      email: 'admin@techres.vn',
      passwordHash: hashedPassword,
      name: 'Super Admin',
      phone: '0901234567',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });

    await adminRepo.save(adminUser);
    console.log('✅ Demo admin user created successfully');
  }

  console.log('\n📋 Demo Account Credentials:');
  console.log('   Email: admin@techres.vn');
  console.log('   Password: Admin@123');
  console.log('');

  await app.close();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
