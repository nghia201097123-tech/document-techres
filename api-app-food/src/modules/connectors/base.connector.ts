import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { FoodPlatformAccount, FoodPlatformType } from '../../database/entities';
import {
  IPlatformConnector,
  LoginCredentials,
  LoginResult,
  OtpRequestResult,
  MerchantStore,
  RawFoodOrder,
  OrderActionResult,
} from './interfaces/connector.interface';

/**
 * Base Platform Connector
 * Provides common functionality for all platform connectors
 */
export abstract class BasePlatformConnector implements IPlatformConnector {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected readonly configService: ConfigService;

  abstract readonly platform: FoodPlatformType;

  constructor(configService: ConfigService, baseUrl: string, timeout = 10000) {
    this.configService = configService;
    this.logger = new Logger(this.constructor.name);

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`[${config.method?.toUpperCase()}] ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Handle API errors
   */
  protected handleApiError(error: AxiosError): void {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown>;

    this.logger.error(
      `API Error: ${status} - ${JSON.stringify(data)}`,
      error.stack,
    );

    if (status === 401) {
      throw new Error('UNAUTHORIZED: Token expired or invalid');
    }
    if (status === 403) {
      throw new Error('FORBIDDEN: Access denied');
    }
    if (status === 429) {
      throw new Error('RATE_LIMITED: Too many requests');
    }
  }

  /**
   * Set authorization header
   */
  protected setAuthHeader(token: string): void {
    this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Make authenticated request
   */
  protected async authenticatedRequest<T>(
    account: FoodPlatformAccount,
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    this.setAuthHeader(account.accessToken);
    const response = await this.httpClient.request<T>({
      method,
      url,
      data,
      params,
    });
    return response.data;
  }

  // Abstract methods to be implemented by each platform connector
  abstract login(credentials: LoginCredentials): Promise<LoginResult>;
  abstract requestOtp(phoneNumber: string): Promise<OtpRequestResult>;
  abstract verifyOtp(sessionId: string, otp: string): Promise<LoginResult>;
  abstract refreshToken(refreshToken: string): Promise<LoginResult>;
  abstract getStores(account: FoodPlatformAccount): Promise<MerchantStore[]>;
  abstract pollOrders(
    account: FoodPlatformAccount,
    storeId: string,
    since?: Date,
  ): Promise<RawFoodOrder[]>;
  abstract acceptOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult>;
  abstract markReady(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult>;
  abstract completeOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult>;
  abstract cancelOrder(
    account: FoodPlatformAccount,
    orderId: string,
    reason: string,
  ): Promise<OrderActionResult>;
}
