import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { parse as parseCookies } from 'cookie';

const AUTHENTICATED_ROOM = 'authenticated';
const OPERATIONS_ROOM = 'operations';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      let token: string | undefined =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.split(' ')[1] as string);

      if (!token) {
        const cookieHeader = client.handshake.headers?.cookie || '';
        const cookies = parseCookies(cookieHeader);
        token = cookies['access_token'] as string | undefined;
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role?: string;
      }>(token);
      await client.join(`user:${payload.sub}`);
      await client.join(AUTHENTICATED_ROOM);
      if (payload.role && ['admin', 'editor'].includes(payload.role)) {
        await client.join(OPERATIONS_ROOM);
      }
      this.logger.log(
        `Client connected: ${client.id} (user:${payload.sub}, role:${payload.role ?? 'unknown'})`,
      );
    } catch (err) {
      this.logger.warn(
        `Client ${client.id} disconnected: ${err instanceof Error ? err.message : 'Invalid token'}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitTripCreated(trip: any) {
    this.server.to(OPERATIONS_ROOM).emit('trip_created', trip);
  }

  emitTripUpdated(trip: any) {
    this.server.to(OPERATIONS_ROOM).emit('trip_updated', trip);
  }

  emitTripDeleted(tripId: string) {
    this.server.to(OPERATIONS_ROOM).emit('trip_deleted', tripId);
  }

  emitVehicleUpdated(vehicle: any) {
    this.server.to(OPERATIONS_ROOM).emit('vehicle_updated', vehicle);
  }

  emitDriverUpdated(driver: any) {
    this.server.to(OPERATIONS_ROOM).emit('driver_updated', driver);
  }

  emitCompanyUpdated(company: any) {
    this.server.to(OPERATIONS_ROOM).emit('company_updated', company);
  }

  emitSearchResult(payload: {
    jobId: string;
    module: string;
    data: any[];
    count: number;
    cached: boolean;
    durationMs: number;
  }): void {
    this.server.to(AUTHENTICATED_ROOM).emit('search_result', payload);
  }

  emitSearchResultToUser(
    userId: string,
    payload: {
      jobId: string;
      module: string;
      data: any[];
      count: number;
      cached: boolean;
      durationMs: number;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('search_result', payload);
  }

  emitSearchError(payload: {
    jobId: string;
    module: string;
    error: string;
  }): void {
    this.server.to(AUTHENTICATED_ROOM).emit('search_error', payload);
  }

  emitSearchErrorToUser(
    userId: string,
    payload: {
      jobId: string;
      module: string;
      error: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('search_error', payload);
  }
}
