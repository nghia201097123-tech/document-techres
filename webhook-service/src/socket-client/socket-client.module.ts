import { Module, Global } from '@nestjs/common';
import { SocketClientService } from './socket-client.service';

@Global()
@Module({
  providers: [SocketClientService],
  exports: [SocketClientService],
})
export class SocketClientModule {}
