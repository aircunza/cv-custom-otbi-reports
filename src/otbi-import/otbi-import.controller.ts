import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { OtbiImportService } from './otbi-import.service';

@Controller('otbi-import')
export class OtbiImportController {
  private readonly logger = new Logger(OtbiImportController.name);

  constructor(private readonly otbiImportService: OtbiImportService) {}

  @MessagePattern('otbi.import.run')
  run() {
    this.logger.log('Mensaje NATS otbi.import.run recibido');
    return this.otbiImportService.startImport('manual');
  }
}
