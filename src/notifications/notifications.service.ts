import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { NotificationResponseDto, BulkEmailResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private emailService: EmailService) {}

  /**
   * Send a single email notification
   */
  async sendEmailNotification(emailDto: SendEmailDto): Promise<NotificationResponseDto> {
    this.logger.log(`Processing email notification for: ${emailDto.to}`);
    return await this.emailService.sendEmail(emailDto);
  }

  /**
   * Send bulk email notifications
   */
  async sendBulkEmailNotifications(emails: SendEmailDto[]): Promise<BulkEmailResponseDto> {
    this.logger.log(`Processing bulk email notifications for ${emails.length} recipients`);
    
    const results = await this.emailService.sendBulkEmails(emails);
    
    const totalSent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      message: 'Bulk email operation completed',
      totalSent,
      failed,
      results
    };
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<NotificationResponseDto> {
    const emailDto: SendEmailDto = {
      to: userEmail,
      subject: 'Welcome to Mandaya Awards Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Welcome to Mandaya Awards!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello ${userName || 'there'},
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Thank you for joining the Mandaya Awards platform! We're excited to have you on board.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0;">
              You can now access all the features and participate in awards and competitions.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              <strong>The Mandaya Awards Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Welcome to Mandaya Awards! Hello ${userName || 'there'}, thank you for joining our platform. You can now access all the features and participate in awards and competitions. Best regards, The Mandaya Awards Team`
    };

    return this.sendEmailNotification(emailDto);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<NotificationResponseDto> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailDto: SendEmailDto = {
      to: userEmail,
      subject: 'Password Reset Request - Mandaya Awards',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e74c3c; margin-bottom: 10px;">Password Reset Request</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              You requested a password reset for your Mandaya Awards account.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #007bff; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #856404; margin: 0;">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. This link will expire in 1 hour.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              <strong>The Mandaya Awards Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Password reset requested for your Mandaya Awards account. Visit: ${resetUrl} - This link will expire in 1 hour. If you didn't request this, please ignore this email.`
    };

    return this.sendEmailNotification(emailDto);
  }

  /**
   * Send template-based email
   */
  async sendTemplateEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>,
    subject?: string
  ): Promise<NotificationResponseDto> {
    this.logger.log(`Sending template email: ${templateName} to: ${to}`);
    return await this.emailService.sendTemplateEmail(to, templateName, templateData, subject);
  }

  /**
   * Get email statistics
   */
  async getEmailStats(days: number = 7): Promise<any> {
    this.logger.log(`Getting email stats for last ${days} days`);
    return await this.emailService.getEmailStats(days);
  }
} 