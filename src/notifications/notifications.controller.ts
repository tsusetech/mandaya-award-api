import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  SendEmailDto,
  BulkEmailDto,
  WelcomeEmailDto,
} from './dto/send-email.dto';
import {
  NotificationResponseDto,
  BulkEmailResponseDto,
} from './dto/notification-response.dto';
import { ResponseService } from '../common/services/response.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private responseService: ResponseService,
  ) {}

  @Post('email/send')
  @ApiOperation({ summary: 'Send a single email notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email sent successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email data or service not configured',
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendEmail(@Body() emailDto: SendEmailDto, @Req() request: any) {
    const result =
      await this.notificationsService.sendEmailNotification(emailDto);

    return this.responseService.success(
      result,
      'Email notification sent successfully',
      request.url,
    );
  }

  @Post('email/bulk')
  @ApiOperation({
    summary: 'Send bulk email notifications (Admin/SuperAdmin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk emails sent successfully',
    type: BulkEmailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email data or service not configured',
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendBulkEmails(
    @Body() bulkEmailDto: BulkEmailDto,
    @Req() request: any,
  ) {
    const result = await this.notificationsService.sendBulkEmailNotifications(
      bulkEmailDto.emails,
    );

    return this.responseService.success(
      result,
      'Bulk email notifications processed successfully',
      request.url,
    );
  }

  @Post('email/welcome')
  @ApiOperation({ summary: 'Send welcome email to user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Welcome email sent successfully',
    type: NotificationResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendWelcomeEmail(
    @Body() body: { email: string; name?: string },
    @Req() request: any,
  ) {
    const result = await this.notificationsService.sendWelcomeEmail(
      body.email,
      body.name,
    );

    return this.responseService.success(
      result,
      'Welcome email sent successfully',
      request.url,
    );
  }

  @Post('email/welcome-with-credentials')
  @ApiOperation({
    summary: 'Send welcome email with account credentials to new user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Welcome email with credentials sent successfully',
    type: NotificationResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendWelcomeEmailWithCredentials(
    @Body() welcomeEmailDto: WelcomeEmailDto,
    @Req() request: any,
  ) {
    const result =
      await this.notificationsService.sendWelcomeEmailWithCredentials(
        welcomeEmailDto,
      );

    return this.responseService.success(
      result,
      'Welcome email with credentials sent successfully',
      request.url,
    );
  }

  @Post('email/password-reset')
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent successfully',
    type: NotificationResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendPasswordResetEmail(
    @Body() body: { email: string; resetToken: string },
    @Req() request: any,
  ) {
    const result = await this.notificationsService.sendPasswordResetEmail(
      body.email,
      body.resetToken,
    );

    return this.responseService.success(
      result,
      'Password reset email sent successfully',
      request.url,
    );
  }

  @Post('email/template')
  @ApiOperation({
    summary: 'Send template-based email using Mailgun templates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template email sent successfully',
    type: NotificationResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async sendTemplateEmail(
    @Body()
    body: {
      to: string;
      templateName: string;
      templateData: Record<string, any>;
      subject?: string;
    },
    @Req() request: any,
  ) {
    const result = await this.notificationsService.sendTemplateEmail(
      body.to,
      body.templateName,
      body.templateData,
      body.subject,
    );

    return this.responseService.success(
      result,
      'Template email sent successfully',
      request.url,
    );
  }

  @Get('email/stats')
  @ApiOperation({ summary: 'Get email sending statistics from Mailgun' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to get stats for (default: 7)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email statistics retrieved successfully',
  })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async getEmailStats(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
    @Req() request: any,
  ) {
    const result = await this.notificationsService.getEmailStats(days);

    return this.responseService.success(
      result,
      'Email statistics retrieved successfully',
      request.url,
    );
  }
}
