import type { ScanType } from './types';

export interface Sample {
  label: string;
  kind: 'phish' | 'safe';
  content: string;
  sender?: string;
  subject?: string;
}

export const SAMPLES: Record<ScanType, Sample[]> = {
  email: [
    {
      label: 'PayPal account limited',
      kind: 'phish',
      sender: 'PayPal Support <service@paypal-security-team.com>',
      subject: 'Action required: your account has been limited',
      content:
        'Dear Customer,\n\nWe detected unusual activity on your PayPal account and it has been temporarily limited. To restore full access, verify your identity within 24 hours:\n\nhttp://paypa1-secure-login.com/verify/account\n\nIf you do not confirm your billing information, your account will be permanently suspended.\n\nThank you,\nPayPal Security Team',
    },
    {
      label: 'CEO gift-card fraud',
      kind: 'phish',
      sender: 'Rajesh Mehta (CEO) <ceo.office.rajesh@gmail.com>',
      subject: 'Quick favour - confidential',
      content:
        "Hi,\n\nI'm in a meeting and can't talk. I need you to buy 5 Apple gift cards of $200 each for a client urgently. Keep this confidential for now, it's a surprise.\n\nSend me the gift card codes as soon as possible. Do not call me, just reply here.\n\nThanks,\nRajesh",
    },
    {
      label: 'Team sprint notes',
      kind: 'safe',
      sender: 'Priya Sharma <priya@acme.dev>',
      subject: 'Sprint 14 review notes',
      content:
        'Hi team,\n\nThanks for a great sprint! The notes from today are attached and the demo PR is here: https://github.com/acme/web/pull/412\n\nRetro is moved to Thursday at 3 pm. Let me know if that clashes with anything.\n\nCheers,\nPriya',
    },
  ],
  sms: [
    {
      label: 'Bank KYC expiry',
      kind: 'phish',
      content: 'Dear SBI customer, your KYC has expired and your account will be BLOCKED today. Update KYC immediately: http://sbi-kyc-update.online/kyc',
    },
    {
      label: 'Parcel redelivery fee',
      kind: 'phish',
      content: 'USPS: Your package could not be delivered due to an incomplete address. Pay the $1.99 redelivery fee within 12 hours: usps-tracking-redeliver.xyz/address',
    },
    {
      label: 'Genuine OTP',
      kind: 'safe',
      content: 'Your OTP for login is 553201. Do not share it with anyone. Valid for 5 minutes. -HDFC Bank',
    },
  ],
  url: [
    { label: 'Look-alike Microsoft', kind: 'phish', content: 'http://micros0ft-office365-login.top/auth?session=829372' },
    { label: 'IP-address login page', kind: 'phish', content: 'http://45.77.12.199/~admin/secure/webscr.php?cmd=login' },
    { label: 'Official PayPal', kind: 'safe', content: 'https://www.paypal.com/myaccount/summary' },
  ],
  message: [
    {
      label: '"Hi Mum" scam',
      kind: 'phish',
      content: "Hi mum, I lost my phone so this is my new number. I need money urgently for rent, can you transfer it now? Please don't tell dad, I'll explain later x",
    },
    {
      label: 'Crypto investment',
      kind: 'phish',
      content: 'Exclusive opportunity! Our AI trading bot gives guaranteed returns — double your bitcoin in 7 days. Limited slots, act now. Send USDT to join: crypto-double-bitcoin.io',
    },
    {
      label: 'Friend dinner plan',
      kind: 'safe',
      content: 'Hey! Are we still on for dinner tonight? I booked a table for 8 at that new place near the station.',
    },
  ],
};
