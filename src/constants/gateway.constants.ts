export const GATEWAYS = {
  RAZORPAY: 'razorpay',
  CCAVENUE: 'ccavenue',
} as const;

export const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';

export const CCAVENUE_API_BASE_URL = 'https://api.ccavenue.com';
export const CCAVENUE_SANDBOX_API_BASE_URL = 'https://apitest.ccavenue.com';
export const CCAVENUE_CHECKOUT_URL = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
export const CCAVENUE_SANDBOX_CHECKOUT_URL = 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
