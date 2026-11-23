import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BaseCumplimientoEgpService } from './base-cumplimiento-egp.service';
import { FindAllBaseCumplimientoEgpDto } from './dto';

@Controller('base-cumplimiento-egp')
export class BaseCumplimientoEgpController {
  constructor(
    private readonly baseCumplimientoEgpService: BaseCumplimientoEgpService,
  ) {}

  @MessagePattern('base.cumplimiento.egp.find.all')
  findAll(@Payload() dto: FindAllBaseCumplimientoEgpDto) {
    return this.baseCumplimientoEgpService.findAll(dto);
  }
}
