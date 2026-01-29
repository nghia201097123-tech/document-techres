import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export enum BackendService {
  ADMIN = 'admin',
  DASHBOARD = 'dashboard',
  OAUTH = 'oauth',
  MASTER_DATA = 'master-data',
  WEBHOOK = 'webhook',
  SOCKET = 'socket',
  APP_FOOD = 'app-food',
}

// Service ID mapping (same as APISIX x-svc-id)
export const SERVICE_ID_MAP: Record<string, BackendService> = {
  '1502': BackendService.ADMIN,
  '1503': BackendService.DASHBOARD,
  '1504': BackendService.MASTER_DATA,
  '1505': BackendService.ADMIN, // media/upload -> admin
  '1506': BackendService.OAUTH,
  '1507': BackendService.SOCKET,
  '1509': BackendService.APP_FOOD,
};

@Injectable()
export class ProxyService {
  private readonly apiAdminClient: AxiosInstance;
  private readonly apiDashboardClient: AxiosInstance;
  private readonly apiOAuthClient: AxiosInstance;
  private readonly apiMasterDataClient: AxiosInstance;
  private readonly webhookServiceClient: AxiosInstance;
  private readonly socketServiceClient: AxiosInstance;
  private readonly apiAppFoodClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiAdminUrl = this.configService.get<string>('API_ADMIN_URL') || 'http://localhost:3002';
    const apiDashboardUrl = this.configService.get<string>('API_DASHBOARD_URL') || 'http://localhost:4002';
    const apiOAuthUrl = this.configService.get<string>('API_OAUTH_URL') || 'http://localhost:3005';
    const apiMasterDataUrl = this.configService.get<string>('API_MASTER_DATA_URL') || 'http://localhost:3004';
    const webhookServiceUrl = this.configService.get<string>('WEBHOOK_SERVICE_URL') || 'http://localhost:3006';
    const socketServiceUrl = this.configService.get<string>('SOCKET_SERVICE_URL') || 'http://localhost:3007';
    const appFoodServiceId = this.configService.get<string>('CONFIG_NODEJS_APP_FOOD_SERVICE_ID') || '3010';
    const apiAppFoodUrl = `http://localhost:${appFoodServiceId}`;

    this.apiAdminClient = axios.create({
      baseURL: apiAdminUrl,
      timeout: 120000, // 2 minutes for large operations
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      maxContentLength: 50 * 1024 * 1024, // 50MB
    });

    this.apiDashboardClient = axios.create({
      baseURL: apiDashboardUrl,
      timeout: 120000, // 2 minutes for large operations
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      maxContentLength: 50 * 1024 * 1024, // 50MB
    });

    this.apiOAuthClient = axios.create({
      baseURL: apiOAuthUrl,
      timeout: 30000, // 30 seconds for auth operations
    });

    this.apiMasterDataClient = axios.create({
      baseURL: apiMasterDataUrl,
      timeout: 60000, // 1 minute for sync operations
      maxBodyLength: 10 * 1024 * 1024, // 10MB
      maxContentLength: 10 * 1024 * 1024, // 10MB
    });

    this.webhookServiceClient = axios.create({
      baseURL: webhookServiceUrl,
      timeout: 30000, // 30 seconds for webhook processing
    });

    this.socketServiceClient = axios.create({
      baseURL: socketServiceUrl,
      timeout: 30000, // 30 seconds for socket events
    });

    this.apiAppFoodClient = axios.create({
      baseURL: apiAppFoodUrl,
      timeout: 60000, // 1 minute for food platform operations
      maxBodyLength: 10 * 1024 * 1024, // 10MB
      maxContentLength: 10 * 1024 * 1024, // 10MB
    });
  }

  private getClient(service: BackendService): AxiosInstance {
    switch (service) {
      case BackendService.DASHBOARD:
        return this.apiDashboardClient;
      case BackendService.OAUTH:
        return this.apiOAuthClient;
      case BackendService.MASTER_DATA:
        return this.apiMasterDataClient;
      case BackendService.WEBHOOK:
        return this.webhookServiceClient;
      case BackendService.SOCKET:
        return this.socketServiceClient;
      case BackendService.APP_FOOD:
        return this.apiAppFoodClient;
      default:
        return this.apiAdminClient;
    }
  }

  async forward(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
    query?: Record<string, any>,
    service: BackendService = BackendService.ADMIN,
  ): Promise<any> {
    try {
      const client = this.getClient(service);
      const config: AxiosRequestConfig = {
        method: method as any,
        url: path,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        params: query,
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await client.request(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          error.response.data || 'Backend service error',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Gateway error: Unable to reach backend service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  getApiAdminUrl(): string {
    return this.configService.get<string>('API_ADMIN_URL') || 'http://localhost:3002';
  }

  getApiDashboardUrl(): string {
    return this.configService.get<string>('API_DASHBOARD_URL') || 'http://localhost:4002';
  }

  getApiOAuthUrl(): string {
    return this.configService.get<string>('API_OAUTH_URL') || 'http://localhost:3005';
  }

  getWebhookServiceUrl(): string {
    return this.configService.get<string>('WEBHOOK_SERVICE_URL') || 'http://localhost:3006';
  }

  getSocketServiceUrl(): string {
    return this.configService.get<string>('SOCKET_SERVICE_URL') || 'http://localhost:3007';
  }

  getApiAppFoodUrl(): string {
    const serviceId = this.configService.get<string>('CONFIG_NODEJS_APP_FOOD_SERVICE_ID') || '3010';
    return `http://localhost:${serviceId}`;
  }

  /**
   * Get service from x-svc-id header (APISIX-style routing)
   * Returns null if svcId is not provided or invalid
   */
  getServiceFromSvcId(svcId: string | undefined): BackendService | null {
    if (!svcId) return null;
    return SERVICE_ID_MAP[svcId] || null;
  }

  determineService(path: string): { service: BackendService; adjustedPath: string } {
    // Routes for Food Platform API (api-app-food)
    // /api/food/* -> api-app-food /api/*
    // /api/public/* -> api-app-food /api/public/*
    if (path.startsWith('/api/food/') || path.startsWith('/food/')) {
      const foodPath = path.replace(/^\/api\/food/, '/api').replace(/^\/food/, '/api');
      return { service: BackendService.APP_FOOD, adjustedPath: foodPath };
    }

    // Public food platform routes (poll-orders, confirm-order, etc.)
    // /api/public/poll-orders/* -> api-app-food /api/public/poll-orders/*
    // /api/public/confirm-order/* -> api-app-food /api/public/confirm-order/*
    // /api/public/cancel-order/* -> api-app-food /api/public/cancel-order/*
    // /api/public/complete-order/* -> api-app-food /api/public/complete-order/*
    // /api/public/sync/food-platform/* -> api-app-food /api/public/sync/food-platform/*
    if (
      path.startsWith('/api/public/poll-orders') ||
      path.startsWith('/api/public/confirm-order') ||
      path.startsWith('/api/public/cancel-order') ||
      path.startsWith('/api/public/complete-order') ||
      path.startsWith('/api/public/sync/food-platform') ||
      path.startsWith('/api/public/reconnect') ||
      path.startsWith('/api/public/disconnected-accounts')
    ) {
      return { service: BackendService.APP_FOOD, adjustedPath: path };
    }

    // Routes for Socket.IO events -> socket-service
    // /api/socket/* -> socket-service /*
    if (path.startsWith('/api/socket/') || path.startsWith('/socket/')) {
      const socketPath = path.replace(/^\/api\/socket/, '').replace(/^\/socket/, '');
      return { service: BackendService.SOCKET, adjustedPath: socketPath };
    }

    // Routes for PayOS webhooks -> webhook-service
    // /api/webhook/payos/* -> webhook-service /webhook/payos/*
    if (path.startsWith('/api/webhook/payos') || path.startsWith('/webhook/payos') || path.startsWith('/payos/webhook')) {
      const webhookPath = path.replace(/^\/api/, '').replace(/^\/payos\/webhook/, '/webhook/payos');
      return { service: BackendService.WEBHOOK, adjustedPath: webhookPath };
    }

    // Routes for PayOS payments (api-dashboard)
    // /api/v1/payos/* or /api/payos/* -> api-dashboard /payos/*
    if (path.startsWith('/api/v1/payos') || path.startsWith('/api/payos') || path.startsWith('/v1/payos') || path.startsWith('/payos')) {
      const payosPath = path.replace(/^\/api\/v1\/payos/, '/payos').replace(/^\/api\/payos/, '/payos').replace(/^\/v1\/payos/, '/payos');
      return { service: BackendService.DASHBOARD, adjustedPath: payosPath };
    }

    // POS app PayOS requests: /api/pos/payos/* -> api-dashboard /payos/*
    if (path.startsWith('/api/pos/payos') || path.startsWith('/pos/payos')) {
      const payosPath = path.replace(/^\/api\/pos\/payos/, '/payos').replace(/^\/pos\/payos/, '/payos');
      return { service: BackendService.DASHBOARD, adjustedPath: payosPath };
    }

    // Routes for OAuth authentication (api-oauth)
    // /api/auth/* -> api-oauth /api/v1/auth/*
    if (path.startsWith('/api/auth/') || path.startsWith('/auth/')) {
      const authPath = path.replace(/^\/api\/auth/, '/api/v1/auth').replace(/^\/auth/, '/api/v1/auth');
      return { service: BackendService.OAUTH, adjustedPath: authPath };
    }

    // Routes for tenant dashboard (api-dashboard)
    // /api/tenant/auth/* -> api-oauth (tenant authentication)
    if (path.startsWith('/api/tenant/auth/') || path.startsWith('/tenant/auth/')) {
      const authPath = path.replace(/^\/api\/tenant\/auth/, '/api/v1/auth').replace(/^\/tenant\/auth/, '/api/v1/auth');
      return { service: BackendService.OAUTH, adjustedPath: authPath };
    }

    // /api/tenant/* -> api-dashboard /api/*
    if (path.startsWith('/api/tenant/') || path.startsWith('/tenant/')) {
      const adjustedPath = path.replace(/^\/api\/tenant/, '/api').replace(/^\/tenant/, '/api');
      return { service: BackendService.DASHBOARD, adjustedPath };
    }

    // Routes for POS/CCB app (api-master-data)
    // /api/pos/* -> api-master-data /api/v1/*
    if (path.startsWith('/api/pos/') || path.startsWith('/pos/')) {
      const adjustedPath = path.replace(/^\/api\/pos/, '/api/v1').replace(/^\/pos/, '/api/v1');
      return { service: BackendService.MASTER_DATA, adjustedPath };
    }

    // Routes for admin (api-admin) - explicit /api/admin/* prefix
    if (path.startsWith('/api/admin/') || path.startsWith('/admin/')) {
      const adjustedPath = path.replace(/^\/api\/admin/, '/api').replace(/^\/admin/, '/api');
      return { service: BackendService.ADMIN, adjustedPath };
    }

    // Default to admin for /api/* routes (api-admin has /api prefix)
    // /api/companies -> api-admin /api/companies
    if (path.startsWith('/api/')) {
      return { service: BackendService.ADMIN, adjustedPath: path };
    }

    // Fallback: add /api prefix for backward compatibility
    return { service: BackendService.ADMIN, adjustedPath: `/api${path}` };
  }
}
