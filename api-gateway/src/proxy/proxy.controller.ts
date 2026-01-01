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
    try {
      // Extract path after /api prefix
      const path = req.originalUrl.replace(/^\/api/, '');

      // Forward authorization header if present
      const headers: Record<string, string> = {};
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      const result = await this.proxyService.forward(
        req.method,
        `/api${path}`,
        req.body,
        headers,
        req.query as Record<string, any>,
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response || error.message || 'Internal server error';
      return res.status(status).json(message);
    }
  }
}
