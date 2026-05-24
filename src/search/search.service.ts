import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { AsyncSearchDto, SearchModuleEnum } from './dto/async-search.dto';
import { EventsGateway } from '../events/events.gateway';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly eventsGateway: EventsGateway,
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
    private readonly tripsService: TripsService,
  ) {}

  async createSearchJob(dto: AsyncSearchDto) {
    const jobId = randomUUID();
    
    // Non-blocking async execution
    setImmediate(() => {
      this.executeSearch(jobId, dto).catch((err) => {
        this.logger.error(`Search job ${jobId} failed: ${err.message}`, err.stack);
        this.eventsGateway.emitSearchError({
          jobId,
          module: dto.module,
          error: 'search.error', // i18n key or simple message
        });
      });
    });

    return {
      jobId,
      status: 'pending',
      module: dto.module,
      query: dto.search,
    };
  }

  private async executeSearch(jobId: string, dto: AsyncSearchDto) {
    const startTime = Date.now();
    
    // Sort and clean filters to create a deterministic cache key
    const { module, limit, offset, ...filters } = dto;
    const cacheKey = `search:${module}:l:${limit}:o:${offset}:${Buffer.from(JSON.stringify(filters)).toString('base64')}`;

    // Check cache
    const cachedData = await this.cacheManager.get<{ data: any[]; count: number }>(cacheKey);
    if (cachedData) {
      this.eventsGateway.emitSearchResult({
        jobId,
        module,
        data: cachedData.data,
        count: cachedData.count,
        cached: true,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // Execute actual search
    let result: { data: any[]; count: number };
    const pagination = { limit, offset };

    switch (module) {
      case SearchModuleEnum.COMPANIES:
        result = await this.companiesService.findAll(pagination, { search: dto.search });
        break;
      case SearchModuleEnum.DRIVERS:
        result = await this.driversService.findAll(pagination, {
          companyId: dto.companyId,
          search: dto.search,
        });
        break;
      case SearchModuleEnum.VEHICLES:
        result = await this.vehiclesService.findAll(pagination, {
          vehicle_type: dto.vehicle_type,
          search: dto.search,
        });
        break;
      case SearchModuleEnum.TRIPS:
        result = await this.tripsService.findAll(
          pagination,
          {
            companyId: dto.companyId,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            status: dto.status,
            unload_status: dto.unload_status,
            search: dto.search,
          },
          false, // showDeleted (assuming false)
        );
        break;
      default:
        throw new Error(`Invalid search module: ${module}`);
    }

    // Cache the result. TTL uses the CACHE_MANAGER global config.
    await this.cacheManager.set(cacheKey, result);

    // Emit result
    this.eventsGateway.emitSearchResult({
      jobId,
      module,
      data: result.data,
      count: result.count,
      cached: false,
      durationMs: Date.now() - startTime,
    });
  }
}
