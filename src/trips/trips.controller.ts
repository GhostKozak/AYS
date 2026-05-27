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
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { FilterTripDto } from './dto/filter-trip.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('trips')
@AuthenticatedController()
@Throttle({ default: { limit: 200, ttl: 60000 } }) // 200 istek / 60sn
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
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filter by driver ID' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'unload_status', required: false, description: 'Filter by unload status', enum: ['WAITING', 'UNLOADING', 'UNLOADED', 'COMPLETED', 'CANCELED', 'UNKNOWN'] })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by verification status', enum: ['PENDING', 'CONFIRMED', 'CANCELED'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for notes, driver, company, or plate' })
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
  async getPendingVerification(
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.tripsService.findPendingVerification(limit, offset);
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
        destination: join(process.cwd(), 'uploads', 'field-photos'),
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
  async fieldVerify(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body('seal_number') sealNumber: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('Vehicle/plate photo is required.');
    }

    // Validate file content via magic bytes (not just MIME type)
    if (!isValidImageFile(file.path)) {
      fs.unlink(file.path, () => {});
      throw new BadRequestException(
        'Invalid file content: not a valid JPEG or PNG image.',
      );
    }

    const photoPath = `/uploads/field-photos/${file.filename}`;
    return this.tripsService.fieldVerify(
      id,
      sealNumber,
      photoPath,
      user as any,
    );
  }

  @Get('field-photos/:filename')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Serve a field photo (auth required)' })
  @ApiParam({ name: 'filename', description: 'Photo filename (photo-{uuid}.ext)' })
  @ApiResponse({ status: 200, description: 'Photo file' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @SkipAudit()
  serveFieldPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const uploadDir = join(process.cwd(), 'uploads', 'field-photos');
    res.sendFile(filename, { root: uploadDir });
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

/** JPEG: FF D8 FF — PNG: 89 50 4E 47 0D 0A 1A 0A */
function isValidImageFile(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  // JPEG: starts with FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buf.equals(pngSig);
}
