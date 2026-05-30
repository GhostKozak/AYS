/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { FilterCompanyDto } from './dto/filter-company.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GetUser, AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('companies')
@AuthenticatedController()
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 istek / 60sn
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Search companies by name' })
  @ApiQuery({ name: 'name', description: 'Company name search term' })
  @ApiResponse({ status: 200, description: 'Return matching companies' })
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
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for company name' })
  @ApiResponse({ status: 200, description: 'Return paged companies' })
  findAll(@Query() filterCompanyDto: FilterCompanyDto, @GetUser() user: AuthenticatedUser) {
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
  findOne(@Param('id', ParseMongoIdPipe) id: string, @GetUser() user: AuthenticatedUser) {
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
    @GetUser() user: AuthenticatedUser,
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
