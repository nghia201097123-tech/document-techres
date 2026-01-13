import {
  Controller,
  All,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@ApiTags('proxy')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  @ApiOperation({ summary: 'Proxy all requests to backend services' })
  @ApiBearerAuth()
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
      return res.status(204).send();
    }

    try {
      // Extract path after /api prefix (without query string)
      const fullPath = req.originalUrl.replace(/^\/api/, '');
      const path = fullPath.split('?')[0]; // Remove query string from path

      // Determine which backend service to use based on path
      // /api/tenant/* -> api-dashboard
      // /api/admin/* or other -> api-admin
      const { service, adjustedPath } = this.proxyService.determineService(path);
      console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${service} ${adjustedPath}`);

      // Forward authorization header if present
      const headers: Record<string, string> = {};
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      const result = await this.proxyService.forward(
        req.method,
        adjustedPath,
        req.body,
        headers,
        req.query as Record<string, any>,
        service,
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response || error.message || 'Internal server error';
      return res.status(status).json(message);
    }
  }
}
