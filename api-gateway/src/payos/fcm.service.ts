import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PaymentNotificationData {
  type: 'PAYMENT_SUCCESS' | 'PAYMENT_CANCELLED' | 'PAYMENT_EXPIRED';
  orderId: string;
  orderCode: string;
  amount: string;
  transactionRef?: string;
  transactionDateTime?: string;
  counterAccountName?: string;
  counterAccountNumber?: string;
  counterAccountBankName?: string;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

      if (serviceAccountPath) {
        // Initialize with service account file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK initialized with service account');
      } else {
        // Try to initialize with environment variables
        const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

        if (clientEmail && privateKey && projectId) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          this.isInitialized = true;
          this.logger.log('Firebase Admin SDK initialized with env credentials');
        } else {
          this.logger.warn('Firebase credentials not configured. FCM notifications will be disabled.');
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendPaymentNotification(
    fcmToken: string,
    data: PaymentNotificationData,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized, skipping FCM notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        data: {
          ...data,
          // Ensure all values are strings for FCM data payload
          click_action: 'PAYMENT_NOTIFICATION',
        },
        notification: {
          title: this.getNotificationTitle(data.type),
          body: this.getNotificationBody(data),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'payment_channel',
            priority: 'max',
            sound: 'payment_success',
            defaultVibrateTimings: true,
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`FCM notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send FCM notification to ${fcmToken}`, error);
      return false;
    }
  }

  async sendToMultipleDevices(
    fcmTokens: string[],
    data: PaymentNotificationData,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized, skipping FCM notifications');
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        data: {
          ...data,
          click_action: 'PAYMENT_NOTIFICATION',
        },
        notification: {
          title: this.getNotificationTitle(data.type),
          body: this.getNotificationBody(data),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'payment_channel',
            priority: 'max',
            sound: 'payment_success',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `FCM multicast: ${response.successCount} success, ${response.failureCount} failed`,
      );
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error('Failed to send FCM multicast', error);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  private getNotificationTitle(type: PaymentNotificationData['type']): string {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return 'Thanh toan thanh cong';
      case 'PAYMENT_CANCELLED':
        return 'Thanh toan da huy';
      case 'PAYMENT_EXPIRED':
        return 'Thanh toan het han';
      default:
        return 'Thong bao thanh toan';
    }
  }

  private getNotificationBody(data: PaymentNotificationData): string {
    const amount = new Intl.NumberFormat('vi-VN').format(Number(data.amount));
    switch (data.type) {
      case 'PAYMENT_SUCCESS':
        return `Da nhan ${amount}d cho don hang #${data.orderCode}`;
      case 'PAYMENT_CANCELLED':
        return `Don hang #${data.orderCode} da huy thanh toan`;
      case 'PAYMENT_EXPIRED':
        return `Thanh toan don hang #${data.orderCode} da het han`;
      default:
        return `Don hang #${data.orderCode}`;
    }
  }
}
