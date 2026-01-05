import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UploadsService, FileType } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hình ảnh' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Thư mục lưu trữ (tùy chọn)',
        },
      },
    },
  })
  async uploadImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadImage(file, folder, req.user?.tenantId, req.user?.id);
  }

  @Post('video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Thư mục lưu trữ (tùy chọn)',
        },
      },
    },
  })
  async uploadVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadVideo(file, folder, req.user?.tenantId, req.user?.id);
  }

  @Post('document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tài liệu (PDF, Word, Excel...)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Thư mục lưu trữ (tùy chọn)',
        },
      },
    },
  })
  async uploadDocument(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadDocument(file, folder, req.user?.tenantId, req.user?.id);
  }

  @Post('file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file bất kỳ' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    return this.uploadsService.uploadFile(file, folder, undefined, req.user?.tenantId, req.user?.id);
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload nhiều file (tối đa 10 file)' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMultiple(
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 file để upload');
    }
    return this.uploadsService.uploadMultiple(files, folder, undefined, req.user?.tenantId, req.user?.id);
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload nhiều hình ảnh (tối đa 10 file)' })
  @ApiQuery({ name: 'folder', required: false, description: 'Thư mục lưu trữ' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMultipleImages(
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 file để upload');
    }
    return this.uploadsService.uploadMultiple(files, folder || 'images', [FileType.IMAGE], req.user?.tenantId, req.user?.id);
  }

  @Get('s/:shortCode')
  @ApiOperation({ summary: 'Redirect từ short URL đến URL gốc' })
  async resolveShortUrl(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
  ) {
    const fullUrl = await this.uploadsService.getFullUrl(shortCode);
    if (!fullUrl) {
      throw new NotFoundException('Không tìm thấy file');
    }
    return res.redirect(fullUrl);
  }

  @Get('info/:shortCode')
  @ApiOperation({ summary: 'Lấy thông tin file từ short code' })
  async getFileInfo(@Param('shortCode') shortCode: string) {
    const file = await this.uploadsService.getFileByShortCode(shortCode);
    if (!file) {
      throw new NotFoundException('Không tìm thấy file');
    }
    return {
      id: file.id,
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileType: file.fileType,
      url: file.fullUrl,
      shortUrl: `/api/uploads/s/${file.shortCode}`,
      shortCode: file.shortCode,
      createdAt: file.createdAt,
    };
  }

  @Delete('short/:shortCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa file theo short code' })
  async deleteByShortCode(@Param('shortCode') shortCode: string) {
    const success = await this.uploadsService.deleteByShortCode(shortCode);
    if (!success) {
      throw new NotFoundException('Không thể xóa file');
    }
    return { success: true, message: 'Đã xóa file thành công' };
  }

  @Delete(':objectName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa file theo object name' })
  async deleteFile(@Param('objectName') objectName: string) {
    const success = await this.uploadsService.deleteFile(decodeURIComponent(objectName));
    if (!success) {
      throw new NotFoundException('Không thể xóa file');
    }
    return { success: true, message: 'Đã xóa file thành công' };
  }

  @Get('presigned/:objectName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy URL truy cập có thời hạn' })
  @ApiQuery({ name: 'expiry', required: false, description: 'Thời gian hết hạn (giây)', type: Number })
  async getPresignedUrl(
    @Param('objectName') objectName: string,
    @Query('expiry') expiry?: number,
  ) {
    const url = await this.uploadsService.getPresignedUrl(
      decodeURIComponent(objectName),
      expiry || 3600,
    );
    return { url, expiresIn: expiry || 3600 };
  }
}
