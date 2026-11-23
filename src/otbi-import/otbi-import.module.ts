import { Module } from '@nestjs/common';
import { OtbiImportController } from './otbi-import.controller';
import { OtbiImportService } from './otbi-import.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [OtbiImportController],
  providers: [OtbiImportService, PrismaService],
  exports: [OtbiImportService],
})
export class OtbiImportModule {}
