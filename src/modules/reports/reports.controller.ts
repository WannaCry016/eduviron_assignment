import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { PendingPaymentsQueryDto } from './dto/pending-payments-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/dto/authenticated-user.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Permissions('reports:read')
  dashboard(
    @Query() filters: DashboardFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getDashboard(filters, user);
  }

  @Get('pending-payments')
  @Permissions('reports:pending:view')
  pendingPayments(
    @Query() query: PendingPaymentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getPendingPayments(query, user);
  }

  @Get('pending-payments/export')
  @Permissions('reports:pending:view')
  async exportPending(
    @Query() query: PendingPaymentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reportsService.exportPendingPayments(query, user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pending-payments.csv');
    return csv;
  }

  @Get('transactions/failures')
  @Permissions('reports:monitoring')
  transactionFailures(
    @Query('lastHours') lastHours?: number,
    @Query('gateways') gateways?: string | string[],
  ) {
    const gatewayList = Array.isArray(gateways)
      ? gateways
      : gateways?.split(',').filter(Boolean);

    return this.reportsService.getTransactionFailures({
      lastHours: lastHours ? Number(lastHours) : undefined,
      gateways: gatewayList,
    });
  }
}
