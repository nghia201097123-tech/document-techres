import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export enum BackendService {
  ADMIN = 'admin',
  DASHBOARD = 'dashboard',
}

@Injectable()
export class ProxyService {
  private readonly apiAdminClient: AxiosInstance;
  private readonly apiDashboardClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiAdminUrl = this.configService.get<string>('API_ADMIN_URL') || 'http://localhost:3002';
    const apiDashboardUrl = this.configService.get<string>('API_DASHBOARD_URL') || 'http://localhost:4002';

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
  }

  private getClient(service: BackendService): AxiosInstance {
    return service === BackendService.DASHBOARD ? this.apiDashboardClient : this.apiAdminClient;
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

  determineService(path: string): { service: BackendService; adjustedPath: string } {
    // Routes for tenant dashboard (api-dashboard)
    if (path.startsWith('/tenant/') || path.startsWith('/api/tenant/')) {
      const adjustedPath = path.replace(/^\/api\/tenant/, '/api').replace(/^\/tenant/, '/api');
      return { service: BackendService.DASHBOARD, adjustedPath };
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
