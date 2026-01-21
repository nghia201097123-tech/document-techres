import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Global() // Make SocketGateway available globally without importing
@Module({
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
