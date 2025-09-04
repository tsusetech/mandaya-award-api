import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { SendEmailDto, WelcomeEmailDto } from './dto/send-email.dto';
import {
  NotificationResponseDto,
  BulkEmailResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private emailService: EmailService) {}

  /**
   * Send a single email notification
   */
  async sendEmailNotification(
    emailDto: SendEmailDto,
  ): Promise<NotificationResponseDto> {
    this.logger.log(`Processing email notification for: ${emailDto.to}`);
    return await this.emailService.sendEmail(emailDto);
  }

  /**
   * Send bulk email notifications
   */
  async sendBulkEmailNotifications(
    emails: SendEmailDto[],
  ): Promise<BulkEmailResponseDto> {
    this.logger.log(
      `Processing bulk email notifications for ${emails.length} recipients`,
    );

    const results = await this.emailService.sendBulkEmails(emails);

    const totalSent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return {
      message: 'Bulk email operation completed',
      totalSent,
      failed,
      results,
    };
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName?: string,
  ): Promise<NotificationResponseDto> {
    const emailDto: SendEmailDto = {
      to: userEmail,
      subject: 'Selamat Datang di Platform Mandaya Awards',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Selamat Datang di Mandaya Awards!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Halo ${userName || 'Saudara/i'},
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Terima kasih telah bergabung dengan platform Mandaya Awards! Kami sangat senang Anda bergabung dengan kami.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0;">
              Sekarang Anda dapat mengakses semua fitur dan berpartisipasi dalam penghargaan dan kompetisi.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Salam hormat,<br>
              <strong>Tim Mandaya Awards</strong>
            </p>
          </div>
        </div>
      `,
      text: `Selamat Datang di Mandaya Awards! Halo ${userName || 'Saudara/i'}, terima kasih telah bergabung dengan platform kami. Sekarang Anda dapat mengakses semua fitur dan berpartisipasi dalam penghargaan dan kompetisi. Salam hormat, Tim Mandaya Awards`,
    };

    return this.sendEmailNotification(emailDto);
  }

  /**
   * Send welcome email with credentials to new user
   */
  async sendWelcomeEmailWithCredentials(
    welcomeEmailDto: WelcomeEmailDto,
  ): Promise<NotificationResponseDto> {
    const loginUrl =
      welcomeEmailDto.loginUrl ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const emailDto: SendEmailDto = {
      to: welcomeEmailDto.to,
      subject: 'Selamat Datang di Platform Mandaya Awards - Detail Akun Anda',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Selamat Datang di Mandaya Awards!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Halo ${welcomeEmailDto.username},
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Terima kasih telah bergabung dengan platform Mandaya Awards! Kami sangat senang Anda bergabung dengan kami.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Berikut adalah detail akun Anda:
            </p>
            
            <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #495057;">Nama Pengguna:</strong> 
                <span style="color: #6c757d; margin-left: 10px;">${welcomeEmailDto.username}</span>
              </div>
              <div style="margin-bottom: 10px;">
                <strong style="color: #495057;">Email:</strong> 
                <span style="color: #6c757d; margin-left: 10px;">${welcomeEmailDto.email}</span>
              </div>
              <div>
                <strong style="color: #495057;">Kata Sandi:</strong> 
                <span style="color: #6c757d; margin-left: 10px;">${welcomeEmailDto.password}</span>
              </div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Klik tombol di bawah untuk mengakses akun Anda:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}/login" 
                 style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block;">
                Masuk ke Akun Anda
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              Atau salin dan tempel link ini ke browser Anda:
            </p>
            <p style="font-size: 14px; color: #007bff; word-break: break-all;">
              ${loginUrl}/login
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #856404; margin: 0;">
              <strong>Pemberitahuan Keamanan:</strong> Harap jaga kerahasiaan kredensial login Anda dan pertimbangkan untuk mengubah kata sandi setelah login pertama.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Salam hormat,<br>
              <strong>Tim Mandaya Awards</strong>
            </p>
          </div>
        </div>
      `,
      text: `Selamat Datang di Mandaya Awards! Halo ${welcomeEmailDto.username}, terima kasih telah bergabung dengan platform kami. Detail akun Anda: Nama Pengguna: ${welcomeEmailDto.username}, Email: ${welcomeEmailDto.email}, Kata Sandi: ${welcomeEmailDto.password}. Masuk di: ${loginUrl}/login. Harap jaga kerahasiaan kredensial Anda dan pertimbangkan untuk mengubah kata sandi setelah login pertama. Salam hormat, Tim Mandaya Awards`,
    };

    return this.sendEmailNotification(emailDto);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
  ): Promise<NotificationResponseDto> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailDto: SendEmailDto = {
      to: userEmail,
      subject: 'Permintaan Reset Kata Sandi - Mandaya Awards',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e74c3c; margin-bottom: 10px;">Permintaan Reset Kata Sandi</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Anda meminta reset kata sandi untuk akun Mandaya Awards Anda.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Klik tombol di bawah untuk mereset kata sandi Anda:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block;">
                Reset Kata Sandi
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              Jika tombol tidak berfungsi, salin dan tempel link ini ke browser Anda:
            </p>
            <p style="font-size: 14px; color: #007bff; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #856404; margin: 0;">
              <strong>Pemberitahuan Keamanan:</strong> Jika Anda tidak meminta reset kata sandi ini, harap abaikan email ini. Link ini akan kedaluwarsa dalam 1 jam.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Salam hormat,<br>
              <strong>Tim Mandaya Awards</strong>
            </p>
          </div>
        </div>
      `,
      text: `Permintaan reset kata sandi untuk akun Mandaya Awards Anda. Kunjungi: ${resetUrl} - Link ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak meminta ini, harap abaikan email ini.`,
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
    subject?: string,
  ): Promise<NotificationResponseDto> {
    this.logger.log(`Sending template email: ${templateName} to: ${to}`);
    return await this.emailService.sendTemplateEmail(
      to,
      templateName,
      templateData,
      subject,
    );
  }

  /**
   * Get email statistics
   */
  async getEmailStats(days: number = 7): Promise<any> {
    this.logger.log(`Getting email stats for last ${days} days`);
    return await this.emailService.getEmailStats(days);
  }
}
