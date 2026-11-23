import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BaseCumplimientoEgpModule } from './base-cumplimiento-egp/base-cumplimiento-egp.module';
import { OtbiImportModule } from './otbi-import/otbi-import.module';
import { MicroserviceRpcErrorCaptureLayer } from './common/microservice-error-layer/microservice-rpc-error-capture.layer';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BaseCumplimientoEgpModule,
    OtbiImportModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: MicroserviceRpcErrorCaptureLayer,
    },
  ],
})
export class AppModule {}
