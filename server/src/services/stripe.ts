import Stripe from 'stripe';
import { config, stripeEnabled } from '../config';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeEnabled) {
    throw new Error('Stripe is not configured');
  }
  if (!client) {
    client = new Stripe(config.stripe.secretKey as string);
  }
  return client;
}

export { stripeEnabled };
