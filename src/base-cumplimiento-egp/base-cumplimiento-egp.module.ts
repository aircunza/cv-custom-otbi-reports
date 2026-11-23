import { Module } from '@nestjs/common';
import { BaseCumplimientoEgpController } from './base-cumplimiento-egp.controller';
import { BaseCumplimientoEgpService } from './base-cumplimiento-egp.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [BaseCumplimientoEgpController],
  providers: [BaseCumplimientoEgpService, PrismaService],
  exports: [BaseCumplimientoEgpService],
})
export class BaseCumplimientoEgpModule {}
