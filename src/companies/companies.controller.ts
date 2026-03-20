import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  searchCompanies(@Query('name') name: string) {
    return this.companiesService.searchByName(name);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  findAll(
    @Query() paginationQuery: PaginationQueryDto, 
    @Query() filterCompanyDto: FilterCompanyDto,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.companiesService.findAll(paginationQuery, filterCompanyDto, showDeleted);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.companiesService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateCompanyDto: UpdateCompanyDto,
    @GetUser() user: User
  ) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.companiesService.remove(id);
  }
}
