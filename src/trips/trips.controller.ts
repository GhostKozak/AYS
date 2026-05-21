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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { FilterTripDto } from './dto/filter-trip.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';

@ApiTags('trips')
@AuthenticatedController()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new logistics trip' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  create(@Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all trips (paged)' })
  @ApiResponse({ status: 200, description: 'Return paged trips' })
  findAll(@Query() filterTripDto: FilterTripDto, @GetUser() user: User) {
    const { limit, offset, ...filters } = filterTripDto;
    const paginationQuery = { limit, offset };
    const showDeleted = user.role === UserRole.ADMIN;
    return this.tripsService.findAll(paginationQuery, filters, showDeleted);
  }

  @Get('pending-verification')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all pending field verification trips' })
  @ApiResponse({ status: 200, description: 'Return pending trips' })
  getPendingVerification() {
    return this.tripsService.findPendingVerification();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Return trip details' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findOne(@Param('id', ParseMongoIdPipe) id: string, @GetUser() user: User) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.tripsService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @SkipAudit()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update trip details' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateTripDto: UpdateTripDto,
    @GetUser() user: User,
  ) {
    return this.tripsService.update(id, updateTripDto, user as any);
  }

  @Post(':id/field-verify')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/field-photos',
        filename: (req, file, callback) => {
          const uniqueSuffix = randomUUID();
          const ext = extname(file.originalname);
          callback(null, `photo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException(
              'Only image/jpeg and image/png files are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Physically verify trip in the field' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Trip verified successfully' })
  fieldVerify(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body('seal_number') sealNumber: string,
    @UploadedFile() file: any,
    @GetUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('Vehicle/plate photo is required.');
    }
    const photoPath = `/uploads/field-photos/${file.filename}`;
    return this.tripsService.fieldVerify(
      id,
      sealNumber,
      photoPath,
      user as any,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a trip (Admin only)' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Trip deleted successfully' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.tripsService.remove(id);
  }
}
