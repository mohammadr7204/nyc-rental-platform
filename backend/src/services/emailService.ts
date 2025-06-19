import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'sendgrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private async getTemplate(templateName: string, variables: Record<string, any>): Promise<EmailTemplate> {
    const templates: Record<string, (vars: Record<string, any>) => EmailTemplate> = {
      emailVerification: (vars) => ({
        subject: 'Verify Your Email - NYC Rental Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">NYC Rental Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Verify Your Email Address</h2>
              <p>Hi ${vars.firstName},</p>
              <p>Thank you for signing up for NYC Rental Platform! Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${vars.verificationLink}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
              </div>
              <p>This link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
              <p>Best regards,<br>NYC Rental Platform Team</p>
            </div>
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 NYC Rental Platform. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Hi ${vars.firstName},\n\nThank you for signing up for NYC Rental Platform! Please verify your email address by visiting:\n${vars.verificationLink}\n\nThis link will expire in 24 hours.\n\nBest regards,\nNYC Rental Platform Team`
      }),

      passwordReset: (vars) => ({
        subject: 'Reset Your Password - NYC Rental Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">NYC Rental Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Reset Your Password</h2>
              <p>Hi ${vars.firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${vars.resetLink}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              <p>This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
              <p>Best regards,<br>NYC Rental Platform Team</p>
            </div>
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 NYC Rental Platform. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Hi ${vars.firstName},\n\nWe received a request to reset your password. Please visit:\n${vars.resetLink}\n\nThis link will expire in 1 hour.\n\nBest regards,\nNYC Rental Platform Team`
      }),

      applicationSubmitted: (vars) => ({
        subject: 'Application Submitted - NYC Rental Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">NYC Rental Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Application Submitted Successfully</h2>
              <p>Hi ${vars.firstName},</p>
              <p>Your rental application for <strong>${vars.propertyTitle}</strong> has been submitted successfully.</p>
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Application Details:</h3>
                <p><strong>Property:</strong> ${vars.propertyTitle}</p>
                <p><strong>Address:</strong> ${vars.propertyAddress}</p>
                <p><strong>Rent:</strong> $${vars.rentAmount}/month</p>
                <p><strong>Application ID:</strong> ${vars.applicationId}</p>
              </div>
              <p>The landlord will review your application and get back to you soon. You can track your application status in your dashboard.</p>
              <p>Best regards,<br>NYC Rental Platform Team</p>
            </div>
          </div>
        `,
        text: `Hi ${vars.firstName},\n\nYour rental application for ${vars.propertyTitle} has been submitted successfully.\n\nApplication Details:\nProperty: ${vars.propertyTitle}\nAddress: ${vars.propertyAddress}\nRent: $${vars.rentAmount}/month\nApplication ID: ${vars.applicationId}\n\nBest regards,\nNYC Rental Platform Team`
      }),

      applicationStatusUpdate: (vars) => ({
        subject: `Application ${vars.status} - NYC Rental Platform`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">NYC Rental Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Application Update</h2>
              <p>Hi ${vars.firstName},</p>
              <p>Your application for <strong>${vars.propertyTitle}</strong> has been <strong>${vars.status.toLowerCase()}</strong>.</p>
              ${vars.status === 'APPROVED' ? `
                <div style="background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #15803d; margin: 0 0 10px 0;">🎉 Congratulations!</h3>
                  <p style="margin: 0;">Your application has been approved! The landlord will contact you soon with next steps.</p>
                </div>
              ` : vars.status === 'REJECTED' ? `
                <div style="background: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin: 0 0 10px 0;">Application Not Selected</h3>
                  <p style="margin: 0;">Unfortunately, your application was not selected for this property. Don't worry - there are many other great properties available!</p>
                </div>
              ` : ''}
              ${vars.notes ? `<p><strong>Landlord's Note:</strong> ${vars.notes}</p>` : ''}
              <p>You can view your application details in your dashboard.</p>
              <p>Best regards,<br>NYC Rental Platform Team</p>
            </div>
          </div>
        `,
        text: `Hi ${vars.firstName},\n\nYour application for ${vars.propertyTitle} has been ${vars.status.toLowerCase()}.\n\n${vars.notes ? `Landlord's Note: ${vars.notes}\n\n` : ''}Best regards,\nNYC Rental Platform Team`
      }),

      newApplicationReceived: (vars) => ({
        subject: 'New Rental Application Received - NYC Rental Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">NYC Rental Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">New Application Received</h2>
              <p>Hi ${vars.landlordName},</p>
              <p>You have received a new rental application for your property <strong>${vars.propertyTitle}</strong>.</p>
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Applicant Details:</h3>
                <p><strong>Name:</strong> ${vars.applicantName}</p>
                <p><strong>Monthly Income:</strong> $${vars.monthlyIncome}</p>
                <p><strong>Move-in Date:</strong> ${vars.moveInDate}</p>
                <p><strong>Application ID:</strong> ${vars.applicationId}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${vars.applicationLink}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Application</a>
              </div>
              <p>Please review the application and respond to the tenant promptly.</p>
              <p>Best regards,<br>NYC Rental Platform Team</p>
            </div>
          </div>
        `,
        text: `Hi ${vars.landlordName},\n\nYou have received a new rental application for ${vars.propertyTitle}.\n\nApplicant: ${vars.applicantName}\nMonthly Income: $${vars.monthlyIncome}\nMove-in Date: ${vars.moveInDate}\nApplication ID: ${vars.applicationId}\n\nReview at: ${vars.applicationLink}\n\nBest regards,\nNYC Rental Platform Team`
      })
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template(variables);
  }

  async sendEmail(to: string, templateName: string, variables: Record<string, any>) {
    try {
      const template = await this.getTemplate(templateName, variables);

      const mailOptions = {
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nyc-rental-platform.com',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await transporter.sendMail(mailOptions);

      // Log email for audit trail
      await prisma.emailLog.create({
        data: {
          to,
          subject: template.subject,
          template: templateName,
          status: 'SENT',
          sentAt: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Email sending failed:', error);

      // Log failed email
      await prisma.emailLog.create({
        data: {
          to,
          subject: `Failed: ${templateName}`,
          template: templateName,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          sentAt: new Date()
        }
      });

      throw error;
    }
  }

  async sendVerificationEmail(user: { email: string; firstName: string; id: string }) {
    const verificationToken = this.generateVerificationToken();
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&userId=${user.id}`;

    // Store verification token
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    return this.sendEmail(user.email, 'emailVerification', {
      firstName: user.firstName,
      verificationLink
    });
  }

  async sendPasswordResetEmail(user: { email: string; firstName: string; id: string }) {
    const resetToken = this.generateVerificationToken();
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&userId=${user.id}`;

    // Store reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    return this.sendEmail(user.email, 'passwordReset', {
      firstName: user.firstName,
      resetLink
    });
  }

  private generateVerificationToken(): string {
    return Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
  }

  async verifyEmail(token: string, userId: string): Promise<boolean> {
    try {
      const verification = await prisma.emailVerification.findFirst({
        where: {
          token,
          userId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      if (!verification) {
        return false;
      }

      // Mark as used and verify user
      await Promise.all([
        prisma.emailVerification.update({
          where: { id: verification.id },
          data: { used: true }
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            emailVerified: true,
            verificationStatus: 'VERIFIED'
          }
        })
      ]);

      return true;
    } catch (error) {
      console.error('Email verification failed:', error);
      return false;
    }
  }

  async verifyPasswordReset(token: string, userId: string): Promise<boolean> {
    try {
      const reset = await prisma.passwordReset.findFirst({
        where: {
          token,
          userId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      return !!reset;
    } catch (error) {
      console.error('Password reset verification failed:', error);
      return false;
    }
  }

  async usePasswordResetToken(token: string, userId: string): Promise<boolean> {
    try {
      const reset = await prisma.passwordReset.findFirst({
        where: {
          token,
          userId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      if (!reset) {
        return false;
      }

      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true }
      });

      return true;
    } catch (error) {
      console.error('Password reset token use failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();