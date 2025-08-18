import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import { SendEmailDto } from '../dto/send-email.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';

// Use require for FormData as it works better with mailgun.js
const formData = require('form-data');

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgunClient: any;
  private domain: string; // Removed readonly
  private fromEmail: string; // Removed readonly

  constructor(private configService: ConfigService) {
    this.initializeMailgun();
  }

  private initializeMailgun() {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const fromEmail = this.configService.get<string>('MAILGUN_FROM_EMAIL');
    const region = this.configService.get<string>('MAILGUN_REGION') || 'US'; // US or EU

    if (!apiKey || !domain || !fromEmail) {
      this.logger.warn(
        'Mailgun configuration missing. Email service will not work properly.',
      );
      this.logger.warn(
        'Required env variables: MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL',
      );
      this.logger.warn('Example values:');
      this.logger.warn('MAILGUN_API_KEY=your-mailgun-api-key');
      this.logger.warn('MAILGUN_DOMAIN=your-domain.com');
      this.logger.warn('MAILGUN_FROM_EMAIL=noreply@your-domain.com');
      return;
    }

    this.domain = domain;
    this.fromEmail = fromEmail;

    try {
      // Initialize Mailgun with form-data using require() - this approach works better
      const mailgun = new Mailgun(formData);

      // Configure for EU region if specified
      const clientOptions: any = {
        username: 'api',
        key: apiKey,
      };

      if (region.toUpperCase() === 'EU') {
        clientOptions.url = 'https://api.eu.mailgun.net';
        this.logger.log('Using EU region for Mailgun');
      }

      this.mailgunClient = mailgun.client(clientOptions);
      this.logger.log(
        `Mailgun initialized successfully for domain: ${domain} (${region} region)`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Mailgun client:', error.message);
      this.logger.error('Stack trace:', error.stack);
      this.logger.error('Make sure you have: npm install mailgun.js form-data');
    }
  }

  /**
   * Send a single email using Mailgun
   */
  async sendEmail(emailDto: SendEmailDto): Promise<NotificationResponseDto> {
    if (!this.mailgunClient) {
      throw new BadRequestException('Email service is not properly configured');
    }

    try {
      this.logger.log(`Sending email to: ${emailDto.to}`);
      this.logger.log(`Subject: ${emailDto.subject}`);

      // Prepare email data for Mailgun
      const emailData: any = {
        from: this.fromEmail,
        to: Array.isArray(emailDto.to) ? emailDto.to : [emailDto.to],
        subject: emailDto.subject,
      };

      // Add content
      if (emailDto.text) {
        emailData.text = emailDto.text;
      }
      if (emailDto.html) {
        emailData.html = emailDto.html;
      }

      // Add CC and BCC if provided
      if (emailDto.cc && emailDto.cc.length > 0) {
        emailData.cc = emailDto.cc;
      }
      if (emailDto.bcc && emailDto.bcc.length > 0) {
        emailData.bcc = emailDto.bcc;
      }

      // Send email via Mailgun
      const response = await this.mailgunClient.messages.create(
        this.domain,
        emailData,
      );

      const notificationResponse: NotificationResponseDto = {
        id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        type: 'email',
        recipient: emailDto.to,
        subject: emailDto.subject,
        status: 'sent',
        sentAt: new Date().toISOString(),
        message: 'Email sent successfully via Mailgun',
        mailgunId: response.id,
      };

      this.logger.log(`Email sent successfully: ${response.id}`);
      return notificationResponse;
    } catch (error) {
      this.logger.error(`Failed to send email via Mailgun: ${error.message}`);

      const errorResponse: NotificationResponseDto = {
        id: `email_failed_${Date.now()}`,
        type: 'email',
        recipient: emailDto.to,
        subject: emailDto.subject,
        status: 'failed',
        sentAt: new Date().toISOString(),
        message: `Failed to send email: ${error.message}`,
      };

      return errorResponse;
    }
  }

  /**
   * Send multiple emails
   */
  async sendBulkEmails(
    emails: SendEmailDto[],
  ): Promise<NotificationResponseDto[]> {
    const results: NotificationResponseDto[] = [];

    for (const emailDto of emails) {
      const result = await this.sendEmail(emailDto);
      results.push(result);

      // Add small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Send template-based email using Mailgun templates
   */
  async sendTemplateEmail(
    to: string,
    templateName: string,
    templateVariables: Record<string, any>,
    subject?: string,
  ): Promise<NotificationResponseDto> {
    if (!this.mailgunClient) {
      throw new BadRequestException('Email service is not properly configured');
    }

    try {
      this.logger.log(
        `Sending template email to: ${to} using template: ${templateName}`,
      );

      const emailData: any = {
        from: this.fromEmail,
        to: [to],
        template: templateName,
        'h:X-Mailgun-Variables': JSON.stringify(templateVariables),
      };

      // Override subject if provided
      if (subject) {
        emailData.subject = subject;
      }

      const response = await this.mailgunClient.messages.create(
        this.domain,
        emailData,
      );

      const notificationResponse: NotificationResponseDto = {
        id: `template_email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        type: 'template_email',
        recipient: to,
        subject: subject || `Template: ${templateName}`,
        status: 'sent',
        sentAt: new Date().toISOString(),
        message: 'Template email sent successfully via Mailgun',
        mailgunId: response.id,
      };

      this.logger.log(`Template email sent successfully: ${response.id}`);
      return notificationResponse;
    } catch (error) {
      this.logger.error(
        `Failed to send template email via Mailgun: ${error.message}`,
      );

      const errorResponse: NotificationResponseDto = {
        id: `template_email_failed_${Date.now()}`,
        type: 'template_email',
        recipient: to,
        subject: subject || `Template: ${templateName}`,
        status: 'failed',
        sentAt: new Date().toISOString(),
        message: `Failed to send template email: ${error.message}`,
      };

      return errorResponse;
    }
  }

  /**
   * Get email sending statistics from Mailgun
   */
  async getEmailStats(days: number = 7): Promise<any> {
    if (!this.mailgunClient) {
      throw new BadRequestException('Email service is not properly configured');
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const stats = await this.mailgunClient.stats.getDomain(this.domain, {
        event: ['delivered', 'failed', 'opened', 'clicked'],
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        resolution: 'day',
      });

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get email stats: ${error.message}`);
      throw new BadRequestException(
        `Failed to get email stats: ${error.message}`,
      );
    }
  }
}
