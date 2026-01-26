import { Module } from '@nestjs/common';

/**
 * Connectors Module for Order Worker Service
 *
 * Note: In the microservices architecture, connectors are embedded
 * directly in the Piscina workers for parallel processing.
 *
 * This module is kept for potential future use cases where
 * we might need synchronous connector access from the main thread.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class ConnectorsModule {}
