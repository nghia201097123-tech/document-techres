import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('public')
@Controller('api/public')
export class PublicController {
  @Get('health-check')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Ok' },
        data: { type: 'null', example: null },
      },
    },
  })
  healthCheck() {
    return {
      status: 200,
      message: 'Ok',
      data: null,
    };
  }
}
