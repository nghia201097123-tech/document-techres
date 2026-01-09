import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export enum BackendService {
  ADMIN = 'admin',
  DASHBOARD = 'dashboard',
  OAUTH = 'oauth',
  MASTER_DATA = 'master-data',
}

@Injectable()
export class ProxyService {
  private readonly apiAdminClient: AxiosInstance;
  private readonly apiDashboardClient: AxiosInstance;
  private readonly apiOAuthClient: AxiosInstance;
  private readonly apiMasterDataClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiAdminUrl = this.configService.get<string>('API_ADMIN_URL') || 'http://localhost:3002';
    const apiDashboardUrl = this.configService.get<string>('API_DASHBOARD_URL') || 'http://localhost:4002';
    const apiOAuthUrl = this.configService.get<string>('API_OAUTH_URL') || 'http://localhost:3005';
    const apiMasterDataUrl = this.configService.get<string>('API_MASTER_DATA_URL') || 'http://localhost:3003';

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
  }

  private getClient(service: BackendService): AxiosInstance {
    switch (service) {
      case BackendService.DASHBOARD:
        return this.apiDashboardClient;
      case BackendService.OAUTH:
        return this.apiOAuthClient;
      case BackendService.MASTER_DATA:
        return this.apiMasterDataClient;
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

  determineService(path: string): { service: BackendService; adjustedPath: string } {
    // Routes for OAuth authentication (api-oauth)
    // /auth/* -> api-oauth /api/v1/auth/*
    if (path.startsWith('/auth/') || path.startsWith('/api/auth/')) {
      const authPath = path.replace(/^\/api\/auth/, '/auth').replace(/^\/auth/, '/api/v1/auth');
      return { service: BackendService.OAUTH, adjustedPath: authPath };
    }

    // Routes for tenant dashboard (api-dashboard)
    // /tenant/auth/* -> api-oauth (tenant authentication)
    if (path.startsWith('/tenant/auth/') || path.startsWith('/api/tenant/auth/')) {
      const authPath = path.replace(/^\/api\/tenant\/auth/, '/auth').replace(/^\/tenant\/auth/, '/api/v1/auth');
      return { service: BackendService.OAUTH, adjustedPath: authPath };
    }

    if (path.startsWith('/tenant/') || path.startsWith('/api/tenant/')) {
      const adjustedPath = path.replace(/^\/api\/tenant/, '/api').replace(/^\/tenant/, '/api');
      return { service: BackendService.DASHBOARD, adjustedPath };
    }

    // Routes for POS/CCB app (api-master-data)
    // /pos/* -> api-master-data /api/v1/*
    if (path.startsWith('/pos/') || path.startsWith('/api/pos/')) {
      const adjustedPath = path.replace(/^\/api\/pos/, '/api/v1').replace(/^\/pos/, '/api/v1');
      return { service: BackendService.MASTER_DATA, adjustedPath };
    }

    // Routes for admin (api-admin) - default
    if (path.startsWith('/admin/') || path.startsWith('/api/admin/')) {
      const adjustedPath = path.replace(/^\/api\/admin/, '/api').replace(/^\/admin/, '/api');
      return { service: BackendService.ADMIN, adjustedPath };
    }

    // Default to admin for backward compatibility
    return { service: BackendService.ADMIN, adjustedPath: path };
  }
}
