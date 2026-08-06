import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WhatsAppNotificationService } from './notifications/whatsapp-notification.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const whatsappService = app.get(WhatsAppNotificationService);

  const phone = process.argv[2];
  if (!phone) {
    console.error('Error: Please provide a target phone number.');
    console.log('Usage: npx ts-node -r tsconfig-paths/register src/send-test-whatsapp.ts +91XXXXXXXXXX');
    await app.close();
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`[Test Utility] Sending WhatsApp reminder to: ${phone}`);
  console.log(`======================================================\n`);

  const result = await whatsappService.sendCertificateReminder({
    to: phone,
    client_name: 'Test Acme Corp',
    cert_name: 'Fire Safety System Certification',
    cert_no: 'GSS-TEST-W15',
    expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    days_remaining: 15,
    contact_name: 'John Doe',
    contact_phone: phone,
  });

  console.log('\nResponse Status:', result.status);
  if (result.success) {
    console.log('Message ID:', result.messageId);
    console.log('Status: Message sent successfully or skipped cleanly!');
  } else {
    console.log('Error Message:', result.error);
    console.log('Status: Failed to transmit message.');
  }

  console.log('\n======================================================');
  await app.close();
}

bootstrap().catch(console.error);
