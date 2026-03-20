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
    origin: '*',
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
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      await this.jwtService.verifyAsync(token);
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
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
}
