import { Controller, Get } from '@nestjs/common';

@Controller('api/public')
export class HealthController {
  /**
   * Public health check endpoint
   * GET /api/public/health-check
   *
   * Used by load balancers, monitoring systems, and APISIX gateway
   */
  @Get('health-check')
  healthCheck() {
    return {
      status: 'ok',
      service: 'api-order-worker',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
