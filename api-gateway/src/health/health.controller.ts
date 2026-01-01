import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProxyService } from '../proxy/proxy.service';

@ApiTags('gateway')
@Controller('health')
export class HealthController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Gateway health check' })
  getHealth() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Check backend services status' })
  async getServicesHealth() {
    const apiAdminUrl = this.proxyService.getApiAdminUrl();

    let apiAdminStatus = 'unknown';
    try {
      await this.proxyService.forward('GET', '/api');
      apiAdminStatus = 'healthy';
    } catch {
      apiAdminStatus = 'unhealthy';
    }

    return {
      gateway: 'healthy',
      services: {
        'api-admin': {
          url: apiAdminUrl,
          status: apiAdminStatus,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
