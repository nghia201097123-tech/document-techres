import {
  Controller,
  All,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProxyService, BackendService } from './proxy.service';

@ApiTags('proxy')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  @ApiOperation({ summary: 'Proxy all requests to backend services' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-svc-id',
    description: 'Service ID for routing (1502=admin, 1503=dashboard, 1504=master-data, 1506=oauth, 1507=socket, 1509=app-food)',
    required: false,
  })
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, x-svc-id');
      return res.status(204).send();
    }

    try {
      // Extract path (keep /api prefix, remove query string)
      const fullPath = req.originalUrl;
      const path = fullPath.split('?')[0]; // Remove query string from path

      // Check for x-svc-id header (APISIX-style routing)
      const svcId = req.headers['x-svc-id'] as string | undefined;
      let service: BackendService;
      let adjustedPath: string;

      if (svcId) {
        // Use x-svc-id header for routing (like APISIX)
        const svcService = this.proxyService.getServiceFromSvcId(svcId);
        if (svcService) {
          service = svcService;
          adjustedPath = path; // Keep original path when using x-svc-id
          console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${service} ${adjustedPath} (x-svc-id: ${svcId})`);
        } else {
          console.warn(`[Gateway] Invalid x-svc-id: ${svcId}, falling back to path-based routing`);
          const result = this.proxyService.determineService(path);
          service = result.service;
          adjustedPath = result.adjustedPath;
          console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${service} ${adjustedPath}`);
        }
      } else {
        // Fall back to path-based routing
        const result = this.proxyService.determineService(path);
        service = result.service;
        adjustedPath = result.adjustedPath;
        console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${service} ${adjustedPath}`);
      }

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
