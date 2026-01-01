import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class ProxyService {
  private readonly apiAdminClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiAdminUrl = this.configService.get<string>('API_ADMIN_URL') || 'http://localhost:3002';

    this.apiAdminClient = axios.create({
      baseURL: apiAdminUrl,
      timeout: 30000,
    });
  }

  async forward(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
    query?: Record<string, any>,
  ): Promise<any> {
    try {
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

      const response = await this.apiAdminClient.request(config);
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
}
