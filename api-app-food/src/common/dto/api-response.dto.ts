import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard API Response DTO
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Thao tác thành công' })
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: null })
  error?: string;

  @ApiProperty({ example: 1706003400000 })
  timestamp: number;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = Date.now();
  }

  static success<T>(data?: T, message = 'Thao tác thành công'): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: true,
      message,
      data,
    });
  }

  static error(message: string, error?: string): ApiResponseDto {
    return new ApiResponseDto({
      success: false,
      message,
      error,
    });
  }
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}
