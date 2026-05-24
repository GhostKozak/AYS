import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

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

  constructor(private readonly jwtService: JwtService) { }

  async handleConnection(client: Socket) {
    try {
      let token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.split(' ')[1] as string);

      if (!token) {
        const cookieHeader = client.handshake.headers?.cookie || '';
        const match = cookieHeader.match(/access_token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      await this.jwtService.verifyAsync(token);
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      this.logger.warn(`Client ${client.id} disconnected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitTripCreated(trip: any) {
    this.server.emit('trip_created', trip);
  }

  emitTripUpdated(trip: any) {
    this.server.emit('trip_updated', trip);
  }

  emitTripDeleted(tripId: string) {
    this.server.emit('trip_deleted', tripId);
  }

  emitVehicleUpdated(vehicle: any) {
    this.server.emit('vehicle_updated', vehicle);
  }

  emitDriverUpdated(driver: any) {
    this.server.emit('driver_updated', driver);
  }

  emitCompanyUpdated(company: any) {
    this.server.emit('company_updated', company);
  }

  emitSearchResult(payload: {
    jobId: string;
    module: string;
    data: any[];
    count: number;
    cached: boolean;
    durationMs: number;
  }): void {
    this.server.emit('search_result', payload);
  }

  emitSearchError(payload: {
    jobId: string;
    module: string;
    error: string;
  }): void {
    this.server.emit('search_error', payload);
  }
}
