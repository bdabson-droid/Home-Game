import { createApp } from './app';
import { config, stripeEnabled, twilioEnabled } from './config';

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Home Game API listening on http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`  SMS mode:     ${twilioEnabled ? 'twilio' : 'mock (codes logged to console)'}`);
  // eslint-disable-next-line no-console
  console.log(`  Billing mode: ${stripeEnabled ? 'stripe' : 'mock (subscriptions auto-activate)'}`);
});
