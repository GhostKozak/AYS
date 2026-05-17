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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';

@ApiTags('companies')
@AuthenticatedController()
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
  @ApiResponse({ status: 200, description: 'Return paged companies' })
  findAll(@Query() filterCompanyDto: FilterCompanyDto, @GetUser() user: User) {
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
  findOne(@Param('id', ParseMongoIdPipe) id: string, @GetUser() user: User) {
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
    @GetUser() user: User,
  ) {
    return this.companiesService.update(id, updateCompanyDto, user as any);
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
