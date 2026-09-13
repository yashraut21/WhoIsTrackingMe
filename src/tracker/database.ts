import type { TrackerDefinition } from '../types';
import { normalizeHostname } from '../analysis/domain';

export const TRACKER_CATALOG: readonly TrackerDefinition[] = [
  // Analytics
  {
    domain: 'google-analytics.com',
    organization: 'Google',
    category: 'Analytics',
    trackingType: 'web-analytics',
    confidence: 'High',
    description: 'Google Analytics client-side measurement and audience interaction tracking.'
  },
  {
    domain: 'googletagmanager.com',
    organization: 'Google',
    category: 'Analytics',
    trackingType: 'tag-management',
    confidence: 'High',
    description: 'Google Tag Manager container service. Frequently orchestrates third-party analytics and marketing scripts.'
  },
  {
    domain: 'omtrdc.net',
    organization: 'Adobe',
    category: 'Analytics',
    trackingType: 'analytics-collection',
    confidence: 'High',
    description: 'Adobe Experience Cloud (Omniture) data collection infrastructure.'
  },
  {
    domain: 'segment.io',
    organization: 'Twilio Segment',
    category: 'Analytics',
    trackingType: 'customer-data-platform',
    confidence: 'High',
    description: 'Customer data platform multiplexing behavioral events to downstream tracking tools.'
  },
  {
    domain: 'mixpanel.com',
    organization: 'Mixpanel',
    category: 'Analytics',
    trackingType: 'product-analytics',
    confidence: 'High',
    description: 'Product analytics platform tracking user conversion funnels and product interactions.'
  },

  // Advertising
  {
    domain: 'doubleclick.net',
    organization: 'Google',
    category: 'Advertising',
    trackingType: 'ad-serving',
    confidence: 'High',
    description: 'Google DoubleClick ad serving, retargeting, and cross-site conversion attribution.'
  },
  {
    domain: 'googlesyndication.com',
    organization: 'Google',
    category: 'Advertising',
    trackingType: 'ad-delivery',
    confidence: 'High',
    description: 'Google AdSense and publisher advertising syndication infrastructure.'
  },
  {
    domain: 'googleadservices.com',
    organization: 'Google',
    category: 'Advertising',
    trackingType: 'ad-conversion',
    confidence: 'High',
    description: 'Google Ads click conversion measurement and search campaign attribution.'
  },
  {
    domain: 'adtrafficquality.google',
    organization: 'Google',
    category: 'Advertising',
    trackingType: 'fraud-detection',
    confidence: 'High',
    description: 'Google advertising traffic-quality and click invalidation infrastructure.'
  },
  {
    domain: 'bat.bing.com',
    organization: 'Microsoft',
    category: 'Advertising',
    trackingType: 'ad-conversion',
    confidence: 'High',
    description: 'Microsoft Advertising Universal Event Tracking (UET) conversion beacon.'
  },
  {
    domain: 'amazon-adsystem.com',
    organization: 'Amazon',
    category: 'Advertising',
    trackingType: 'ad-exchange',
    confidence: 'High',
    description: 'Amazon Advertising programmatic ad exchange and attribution pixel.'
  },
  {
    domain: 'criteo.com',
    organization: 'Criteo',
    category: 'Advertising',
    trackingType: 'retargeting',
    confidence: 'High',
    description: 'Criteo dynamic retargeting and cross-device commercial advertising network.'
  },
  {
    domain: 'adnxs.com',
    organization: 'Xandr / Microsoft',
    category: 'Advertising',
    trackingType: 'ad-exchange',
    confidence: 'High',
    description: 'AppNexus (Xandr) programmatic ad bidding and audience sync exchange.'
  },
  {
    domain: 'thetradedesk.com',
    organization: 'The Trade Desk',
    category: 'Advertising',
    trackingType: 'demand-side-platform',
    confidence: 'High',
    description: 'Independent programmatic advertising demand-side platform and Unified ID infrastructure.'
  },
  {
    domain: 'taboola.com',
    organization: 'Taboola',
    category: 'Advertising',
    trackingType: 'content-recommendation',
    confidence: 'High',
    description: 'Sponsored content recommendation widget and behavioral audience network.'
  },
  {
    domain: 'outbrain.com',
    organization: 'Outbrain',
    category: 'Advertising',
    trackingType: 'content-recommendation',
    confidence: 'High',
    description: 'Native advertising and sponsored content syndication feed.'
  },

  // Session Replay
  {
    domain: 'hotjar.com',
    organization: 'Hotjar',
    category: 'Session replay',
    trackingType: 'session-replay',
    confidence: 'High',
    description: 'Hotjar behavioral analytics, session recordings, and visual heatmaps.'
  },
  {
    domain: 'fullstory.com',
    organization: 'FullStory',
    category: 'Session replay',
    trackingType: 'session-replay',
    confidence: 'High',
    description: 'FullStory digital experience intelligence and DOM session replay.'
  },
  {
    domain: 'clarity.ms',
    organization: 'Microsoft',
    category: 'Session replay',
    trackingType: 'session-replay',
    confidence: 'High',
    description: 'Microsoft Clarity user session replay, click tracking, and heatmaps.'
  },

  // Fingerprinting
  {
    domain: 'fingerprint.com',
    organization: 'Fingerprint',
    category: 'Fingerprinting',
    trackingType: 'device-fingerprinting',
    confidence: 'High',
    description: 'Browser fingerprinting, entropy gathering, and cross-session device identification.'
  },

  // Social Tracking
  {
    domain: 'facebook.net',
    organization: 'Meta',
    category: 'Social tracking',
    trackingType: 'social-pixel',
    confidence: 'High',
    description: 'Meta conversion pixel distribution and social graph telemetry.'
  },
  {
    domain: 'connect.facebook.net',
    organization: 'Meta',
    category: 'Social tracking',
    trackingType: 'social-sdk',
    confidence: 'High',
    description: 'Facebook Connect JavaScript SDK and event reporting.'
  },
  {
    domain: 'tiktok.com',
    organization: 'ByteDance / TikTok',
    category: 'Social tracking',
    trackingType: 'social-pixel',
    confidence: 'High',
    description: 'TikTok Pixel conversion tracking and social media attribution.'
  },
  {
    domain: 'licdn.com',
    organization: 'LinkedIn / Microsoft',
    category: 'Social tracking',
    trackingType: 'social-pixel',
    confidence: 'High',
    description: 'LinkedIn Insight Tag for B2B conversion tracking and website demographics.'
  },
  {
    domain: 'pinterest.com',
    organization: 'Pinterest',
    category: 'Social tracking',
    trackingType: 'social-pixel',
    confidence: 'High',
    description: 'Pinterest Tag conversion measurement and audience targeting.'
  },

  // Identity / Authentication
  {
    domain: 'accounts.google.com',
    organization: 'Google',
    category: 'Identity/authentication',
    trackingType: 'federated-identity',
    confidence: 'High',
    description: 'Google Identity Services and Single-Sign-On (SSO) authentication.'
  },
  {
    domain: 'auth0.com',
    organization: 'Okta / Auth0',
    category: 'Identity/authentication',
    trackingType: 'identity-provider',
    confidence: 'High',
    description: 'Universal identity provider and OAuth/OIDC authorization service.'
  },

  // CDN / Infrastructure
  {
    domain: 'cloudflare.com',
    organization: 'Cloudflare',
    category: 'CDN/infrastructure',
    trackingType: 'cdn-security',
    confidence: 'High',
    description: 'Cloudflare reverse-proxy, DDoS mitigation, and edge CDN distribution.'
  },
  {
    domain: 'cdnjs.cloudflare.com',
    organization: 'Cloudflare',
    category: 'CDN/infrastructure',
    trackingType: 'public-cdn',
    confidence: 'High',
    description: 'Community JavaScript library distribution CDN.'
  },
  {
    domain: 'fastly.net',
    organization: 'Fastly',
    category: 'CDN/infrastructure',
    trackingType: 'cdn',
    confidence: 'High',
    description: 'Fastly edge cloud platform and content delivery network.'
  },
  {
    domain: 'cloudfront.net',
    organization: 'Amazon Web Services',
    category: 'CDN/infrastructure',
    trackingType: 'cdn',
    confidence: 'High',
    description: 'Amazon CloudFront global content delivery network.'
  },

  // Payment Infrastructure
  {
    domain: 'stripe.com',
    organization: 'Stripe',
    category: 'Payment',
    trackingType: 'payment-gateway',
    confidence: 'High',
    description: 'Stripe payment processing, fraud detection (Radar), and secure checkout tokens.'
  },
  {
    domain: 'paypal.com',
    organization: 'PayPal',
    category: 'Payment',
    trackingType: 'payment-gateway',
    confidence: 'High',
    description: 'PayPal digital wallet and commercial transaction processing.'
  }
];

/**
 * Looks up an observed domain against the curated tracker database.
 * Supports exact domain matches and subdomain suffixes (e.g. stats.google-analytics.com matches google-analytics.com).
 * Prevents false positives such as notgoogle-analytics.com.
 */
export function findTracker(domainInput: string): TrackerDefinition | undefined {
  const host = normalizeHostname(domainInput);
  if (!host) return undefined;

  return TRACKER_CATALOG.find((tracker) => {
    return host === tracker.domain || host.endsWith(`.${tracker.domain}`);
  });
}
