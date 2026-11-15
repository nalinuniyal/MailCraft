/**
 * Planned Salesforce Marketing Cloud integration. Nothing here is implemented
 * or called yet; it documents the shape so the UI never pretends otherwise.
 *
 * Credentials (client id/secret, auth base URL) would be server-only env vars
 * read by a "server-only" module, mirroring src/lib/ai/provider.ts.
 */
export interface SfmcAsset {
  id: number;
  customerKey: string;
  name: string;
  modifiedDate: string;
}

export interface SfmcIntegration {
  /** Server-to-server OAuth token for the configured installed package. */
  getAccessToken(): Promise<{ token: string; expiresAt: number; restBaseUrl: string }>;
  /** Create or update an HTML email asset in Content Builder. */
  upsertEmailAsset(input: { name: string; html: string; subject?: string; preheader?: string; customerKey?: string; categoryId?: number }): Promise<SfmcAsset>;
  /** Render a real preview for a subscriber via Marketing Cloud (AMPscript executed by SFMC, not MailCraft). */
  previewForSubscriber(assetId: number, subscriberKey: string): Promise<{ html: string; subject: string }>;
}

export const SFMC_INTEGRATION_STATUS = "planned" as const;
