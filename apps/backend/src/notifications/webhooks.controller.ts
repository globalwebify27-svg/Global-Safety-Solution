import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Logger, Req, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('webhooks/whatsapp')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Webhook Verification Challenge (GET /webhooks/whatsapp)
   * Used by Zavu / Meta to verify webhook validity
   */
  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`Received Webhook Verification request: mode=${mode}, token=${token}`);

    // Retrieve configured verify token from DB
    const configuredTokenSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'whatsapp_webhook_verify_token' },
    });
    const configuredToken = configuredTokenSetting?.value || 'gss_whatsapp_verify_token_default';

    if (mode === 'subscribe' && token === configuredToken) {
      this.logger.log('Webhook verification successful.');
      return challenge;
    }

    this.logger.warn('Webhook verification failed: token mismatch.');
    return 'Verification failed';
  }

  /**
   * Webhook Message Status Receiver (POST /webhooks/whatsapp)
   * Updates message logs to DELIVERED, READ, or FAILED based on payload receipts
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request, @Body() body: any) {
    this.logger.log(`Received incoming WhatsApp webhook: ${JSON.stringify(body)}`);

    // Webhook Signature & Token Validation (block unauthenticated origins)
    const signatureHeader =
      req.headers['x-hub-signature-256'] ||
      req.headers['x-zavu-signature'] ||
      req.headers['x-twilio-signature'] ||
      req.headers['x-gss-verify-token'];

    const configuredTokenSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'whatsapp_webhook_verify_token' },
    });
    const configuredToken = configuredTokenSetting?.value || 'gss_whatsapp_verify_token_default';

    const configuredSecretSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'whatsapp_webhook_secret' },
    });
    const configuredSecret = configuredSecretSetting?.value || 'gss_whatsapp_secret_default';

    if (!signatureHeader) {
      this.logger.warn('Incoming webhook blocked: Missing signature or verify token validation header.');
      throw new ForbiddenException('Missing webhook validation signature header.');
    }

    if (signatureHeader === configuredToken) {
      this.logger.log('Webhook validated successfully via token header.');
    } else {
      const rawPayload = JSON.stringify(body);
      const hmac = crypto.createHmac('sha256', configuredSecret);
      const computedHash = 'sha256=' + hmac.update(rawPayload).digest('hex');
      
      const cleanSignature = String(signatureHeader).replace(/^sha256=/, '');
      const cleanComputed = computedHash.replace(/^sha256=/, '');

      if (cleanSignature !== cleanComputed && signatureHeader !== computedHash) {
        this.logger.warn(`Incoming webhook blocked: Signature verification failed. Header: ${signatureHeader}`);
        throw new ForbiddenException('Invalid webhook signature verification.');
      }
      this.logger.log('Webhook validated successfully via signature HMAC matching.');
    }

    // Write to SystemLog table to log incoming webhook request (audit trail)
    try {
      await this.prisma.systemLog.create({
        data: {
          type: 'WHATSAPP_WEBHOOK',
          name: 'WEBHOOK_RECEIVER',
          message: 'Incoming WhatsApp status update payload',
          body: JSON.stringify(body),
        },
      });
    } catch {
      // ignore log save error
    }

    // Parse status updates
    let statusUpdates: Array<{ messageId: string; status: string; failureReason?: string }> = [];

    // Case 1: Direct flat payload (Zavu direct format)
    if (body.message_id && body.status) {
      statusUpdates.push({
        messageId: body.message_id,
        status: body.status.toUpperCase(),
        failureReason: body.error || null,
      });
    }

    // Case 2: Meta Cloud API / Zavu Envelope format
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.value && change.value.statuses && Array.isArray(change.value.statuses)) {
              for (const statusObj of change.value.statuses) {
                if (statusObj.id && statusObj.status) {
                  const errorMsg = statusObj.errors && statusObj.errors.length > 0 
                    ? statusObj.errors[0].message 
                    : null;

                  statusUpdates.push({
                    messageId: statusObj.id,
                    status: statusObj.status.toUpperCase(),
                    failureReason: errorMsg,
                  });
                }
              }
            }
          }
        }
      }
    }

    if (statusUpdates.length === 0) {
      this.logger.warn('No status updates parsed from webhook payload.');
      return { success: false, message: 'No valid statuses found' };
    }

    // Apply status updates to logs
    for (const update of statusUpdates) {
      const dbStatus = this.mapWebhookStatusToDbStatus(update.status);
      this.logger.log(`Updating message ${update.messageId} status to ${dbStatus}...`);

      const logRecord = await this.prisma.whatsAppLog.findFirst({
        where: { message_id: update.messageId },
      });

      if (logRecord) {
        const updateData: any = { status: dbStatus };
        
        if (dbStatus === 'DELIVERED') {
          updateData.delivered_at = new Date();
        } else if (dbStatus === 'READ') {
          updateData.read_at = new Date();
        } else if (dbStatus === 'FAILED' && update.failureReason) {
          updateData.failure_reason = update.failureReason;
        }

        await this.prisma.whatsAppLog.update({
          where: { id: logRecord.id },
          data: updateData,
        });
      } else {
        this.logger.warn(`No message log found in database for message_id: ${update.messageId}`);
      }
    }

    return { success: true, message: `${statusUpdates.length} status updates processed.` };
  }

  /**
   * Map provider status string to GSS standard database status
   */
  private mapWebhookStatusToDbStatus(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'DELIVERED';
      case 'READ':
      case 'SEEN':
        return 'READ';
      case 'SENT':
        return 'SENT';
      case 'FAILED':
        return 'FAILED';
      default:
        return 'SENT';
    }
  }
}
