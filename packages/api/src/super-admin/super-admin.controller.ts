import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/login.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto.email, dto.password);
  }
}
