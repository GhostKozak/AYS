import { Global, Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchCacheRegistryService } from './search-cache-registry.service';
import { EventsModule } from '../events/events.module';
import { CompaniesModule } from '../companies/companies.module';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TripsModule } from '../trips/trips.module';

@Global()
@Module({
  imports: [
    EventsModule,
    CompaniesModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchCacheRegistryService],
  exports: [SearchService, SearchCacheRegistryService],
})
export class SearchModule {}
