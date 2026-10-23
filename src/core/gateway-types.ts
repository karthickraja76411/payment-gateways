import type { GATEWAYS } from '../constants/gateway.constants.js';
import type { CCAvenueConfig } from '../gateways/ccavenue/ccavenue.types.js';
import type { RazorpayConfig } from '../gateways/razorpay/razorpay.types.js';
import type { LoggerConfig } from '../interfaces/logger.interface.js';

export type GatewayName = (typeof GATEWAYS)[keyof typeof GATEWAYS];

export interface GatewayConfigMap {
  razorpay: RazorpayConfig;
  ccavenue: CCAvenueConfig;
}

export type WithConfig<TConfig> = { config: TConfig };

/** Selects the gateway and carries its credentials; `config` is typed by `gateway_type`. */
export type GatewayRequest<K extends GatewayName> = {
  gateway_type: K;
  config: GatewayConfigMap[K];
  /** Optional: reports the outcome of this call to a webhook. */
  logger?: LoggerConfig | undefined;
};
