import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferAndDeleteDto {
  @ApiProperty({
    description: 'ID bộ phận đích để chuyển nhân viên sang',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID bộ phận đích không được để trống' })
  @IsString()
  @IsUUID('4', { message: 'ID bộ phận đích không hợp lệ' })
  targetDepartmentId: string;
}
