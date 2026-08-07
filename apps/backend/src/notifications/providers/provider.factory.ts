import { NotificationProvider } from './notification-provider.interface';
import { ZavuProvider } from './zavu.provider';
import { MetaProvider } from './meta.provider';
import { TwilioProvider } from './twilio.provider';

export class ProviderFactory {
  static getProvider(providerName: string): NotificationProvider {
    switch ((providerName || '').trim().toUpperCase()) {
      case 'ZAVU':
        return new ZavuProvider();
      case 'META':
        return new MetaProvider();
      case 'TWILIO':
        return new TwilioProvider();
      default:
        throw new Error(`Unsupported notification provider: ${providerName}`);
    }
  }
}
