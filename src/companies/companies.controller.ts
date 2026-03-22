import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheInterceptor)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Search companies by name' })
  @ApiQuery({ name: 'name', description: 'Company name search term' })
  @ApiResponse({ status: 200, description: 'Return matching companies' })
  @CacheTTL(600) // 10 dakika cache
  searchCompanies(@Query('name') name: string) {
    return this.companiesService.searchByName(name);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all companies (paged)' })
  @ApiResponse({ status: 200, description: 'Return paged companies' })
  @CacheTTL(900) // 15 dakika cache
  findAll(
    @Query() filterCompanyDto: FilterCompanyDto,
    @GetUser() user: User
  ) {
    const { limit, offset, ...filters } = filterCompanyDto;
    const paginationQuery = { limit, offset };
    const showDeleted = user.role === UserRole.ADMIN;
    return this.companiesService.findAll(paginationQuery, filters, showDeleted);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Return company details' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @CacheTTL(1800) // 30 dakika cache
  findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.companiesService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @SkipAudit()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update company details' })
  @ApiParam({ name: 'id', description: 'Company MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateCompanyDto: UpdateCompanyDto,
    @GetUser() user: User
  ) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a company (Admin only)' })
  @ApiParam({ name: 'id', description: 'Company MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.companiesService.remove(id);
  }
}
