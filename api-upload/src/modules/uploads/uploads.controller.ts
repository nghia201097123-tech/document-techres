import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UploadsService, FileType } from './uploads.service';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // ==================== Single File Upload ====================

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hình ảnh', description: 'Upload 1 hình ảnh (jpeg, png, gif, webp, svg). Max 10MB' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadImage(file, folder);
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video', description: 'Upload 1 video (mp4, webm, ogg...). Max 100MB' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadVideo(file, folder);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tài liệu', description: 'Upload tài liệu (PDF, Word, Excel...). Max 50MB' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadDocument(file, folder);
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file bất kỳ', description: 'Upload bất kỳ loại file nào' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadFile(file, folder);
  }

  // ==================== Multiple Files Upload ====================

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload nhiều hình ảnh', description: 'Upload tối đa 10 hình ảnh cùng lúc' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 file để upload');
    }
    return this.uploadsService.uploadMultiple(files, folder || 'images', [FileType.IMAGE]);
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload nhiều file', description: 'Upload tối đa 10 file bất kỳ cùng lúc' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 file để upload');
    }
    return this.uploadsService.uploadMultiple(files, folder);
  }

  // ==================== Short URL & File Access ====================

  @Get('s/:shortCode')
  @ApiOperation({ summary: 'Redirect từ short URL', description: 'Chuyển hướng từ short URL đến file gốc' })
  async resolveShortUrl(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
  ) {
    const fullUrl = this.uploadsService.getFullUrl(shortCode);
    if (!fullUrl) {
      throw new NotFoundException('Không tìm thấy file');
    }
    return res.redirect(fullUrl);
  }

  @Get('info/:shortCode')
  @ApiOperation({ summary: 'Lấy thông tin file', description: 'Lấy thông tin chi tiết của file từ short code' })
  async getFileInfo(@Param('shortCode') shortCode: string) {
    const info = this.uploadsService.getFileInfo(shortCode);
    if (!info) {
      throw new NotFoundException('Không tìm thấy file');
    }
    return {
      shortCode,
      url: info.url,
      objectName: info.objectName,
      shortUrl: `/api/uploads/s/${shortCode}`,
      createdAt: info.createdAt,
    };
  }

  @Get('presigned/:objectName')
  @ApiOperation({ summary: 'Lấy URL có thời hạn', description: 'Tạo URL truy cập tạm thời (presigned URL)' })
  @ApiQuery({ name: 'expiry', required: false, description: 'Thời gian hết hạn (giây)', type: Number })
  async getPresignedUrl(
    @Param('objectName') objectName: string,
    @Query('expiry') expiry?: number,
  ) {
    const url = await this.uploadsService.getPresignedUrl(
      decodeURIComponent(objectName),
      expiry,
    );
    return {
      url,
      expiresIn: expiry || 3600,
      objectName: decodeURIComponent(objectName),
    };
  }

  // ==================== Delete Operations ====================

  @Delete('s/:shortCode')
  @ApiOperation({ summary: 'Xóa file theo short code' })
  async deleteByShortCode(@Param('shortCode') shortCode: string) {
    await this.uploadsService.deleteByShortCode(shortCode);
    return { success: true, message: 'Đã xóa file thành công' };
  }

  @Delete('file/:objectName')
  @ApiOperation({ summary: 'Xóa file theo object name' })
  async deleteByObjectName(@Param('objectName') objectName: string) {
    await this.uploadsService.deleteByObjectName(decodeURIComponent(objectName));
    return { success: true, message: 'Đã xóa file thành công' };
  }

  // ==================== Health Check ====================

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái service' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'api-upload',
      timestamp: new Date().toISOString(),
    };
  }
}
