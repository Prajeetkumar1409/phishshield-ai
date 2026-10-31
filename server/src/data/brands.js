/**
 * Brands commonly impersonated in phishing campaigns, with their official domains.
 * `keywords` are words that indicate a message claims to be from the brand.
 */
export const BRANDS = [
  { name: 'PayPal', domains: ['paypal.com'], keywords: ['paypal'] },
  { name: 'Google', domains: ['google.com', 'gmail.com', 'youtube.com'], keywords: ['google', 'gmail'] },
  { name: 'Apple', domains: ['apple.com', 'icloud.com'], keywords: ['apple', 'icloud', 'apple id', 'itunes'] },
  { name: 'Microsoft', domains: ['microsoft.com', 'microsoftonline.com', 'live.com', 'outlook.com', 'office.com'], keywords: ['microsoft', 'office 365', 'microsoft 365', 'outlook', 'onedrive'] },
  { name: 'Amazon', domains: ['amazon.com', 'amazon.in', 'amazon.co.uk'], keywords: ['amazon', 'prime'] },
  { name: 'Netflix', domains: ['netflix.com'], keywords: ['netflix'] },
  { name: 'Facebook', domains: ['facebook.com', 'fb.com', 'meta.com'], keywords: ['facebook', 'meta'] },
  { name: 'Instagram', domains: ['instagram.com'], keywords: ['instagram'] },
  { name: 'WhatsApp', domains: ['whatsapp.com'], keywords: ['whatsapp'] },
  { name: 'LinkedIn', domains: ['linkedin.com'], keywords: ['linkedin'] },
  { name: 'Chase', domains: ['chase.com'], keywords: ['chase bank', 'jpmorgan chase'] },
  { name: 'Bank of America', domains: ['bankofamerica.com'], keywords: ['bank of america'] },
  { name: 'Wells Fargo', domains: ['wellsfargo.com'], keywords: ['wells fargo', 'wellsfargo'] },
  { name: 'DHL', domains: ['dhl.com'], keywords: ['dhl'] },
  { name: 'FedEx', domains: ['fedex.com'], keywords: ['fedex'] },
  { name: 'UPS', domains: ['ups.com'], keywords: ['ups package', 'ups delivery'] },
  { name: 'USPS', domains: ['usps.com'], keywords: ['usps', 'postal service'] },
  { name: 'IRS', domains: ['irs.gov'], keywords: ['irs', 'internal revenue'] },
  { name: 'SBI', domains: ['sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com'], keywords: ['sbi', 'state bank of india'] },
  { name: 'HDFC Bank', domains: ['hdfcbank.com'], keywords: ['hdfc'] },
  { name: 'ICICI Bank', domains: ['icicibank.com'], keywords: ['icici'] },
  { name: 'Paytm', domains: ['paytm.com'], keywords: ['paytm'] },
  { name: 'Flipkart', domains: ['flipkart.com'], keywords: ['flipkart'] },
  { name: 'Income Tax India', domains: ['incometax.gov.in'], keywords: ['income tax department'] },
  { name: 'Dropbox', domains: ['dropbox.com'], keywords: ['dropbox'] },
  { name: 'DocuSign', domains: ['docusign.com', 'docusign.net'], keywords: ['docusign'] },
  { name: 'Coinbase', domains: ['coinbase.com'], keywords: ['coinbase'] },
  { name: 'Binance', domains: ['binance.com'], keywords: ['binance'] },
];

/** TLDs disproportionately used for abuse (based on public abuse reports). */
export const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'icu', 'club', 'online', 'site', 'win', 'bid',
  'info', 'biz', 'support', 'shop', 'live', 'cc', 'ru', 'cn', 'work', 'click', 'link', 'rest',
  'monster', 'buzz', 'cam', 'loan', 'zip', 'mov', 'country', 'kim', 'party', 'review', 'gdn',
]);

export const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly',
  'shorturl.at', 'tiny.cc', 'rb.gy', 'bl.ink', 's.id', 'v.gd', 'qrco.de', 't.ly',
]);

/** Free hosting/platform domains that are legitimate but often abused for phishing pages. */
export const ABUSED_HOSTING = new Set([
  'web.app', 'firebaseapp.com', 'herokuapp.com', 'netlify.app', 'vercel.app', 'glitch.me',
  '000webhostapp.com', 'weebly.com', 'wixsite.com', 'github.io', 'pages.dev', 'ngrok.io',
  'ngrok-free.app', 'blogspot.com', 'sites.google.com', 'forms.gle', 'repl.co',
]);

/** Second-level public suffixes, used to find the registrable domain. */
export const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.in', 'gov.in', 'net.in', 'org.in', 'ac.in', 'nic.in',
  'com.au', 'net.au', 'org.au', 'co.jp', 'co.nz', 'com.br', 'com.cn', 'com.sg', 'co.za', 'com.mx',
]);
