/**
 * Social-engineering tactic detector. Each tactic is a family of psychological
 * levers (Cialdini-style) with regexes; matches are returned with character
 * spans so the UI can highlight them in the original text.
 */
export const TACTICS = [
  {
    id: 'urgency',
    label: 'Urgency',
    weight: 0.35,
    description: 'Creates time pressure so you act before thinking.',
    patterns: [
      /\burgent(ly)?\b/gi, /\bimmediate(ly)?\b/gi, /\bwithin \d+ (hours?|hrs?|minutes?|days?)\b/gi,
      /\bact (now|fast|quickly)\b/gi, /\bexpires? (today|soon|tonight)\b/gi, /\bfinal (warning|notice|reminder)\b/gi,
      /\blast chance\b/gi, /\basap\b/gi, /\bright (away|now)\b/gi, /\btoday only\b/gi, /\blimited (time|slots?|offer)\b/gi,
      /\bbefore it('s| is)? (too late|expires|deleted)\b/gi, /\bdeadline\b/gi, /\btonight\b/gi,
    ],
  },
  {
    id: 'threat',
    label: 'Fear & threats',
    weight: 0.4,
    description: 'Threatens loss, punishment or account closure.',
    patterns: [
      /\b(account|card|number|service|connection)s? (has been |will be |is )?(suspended|locked|blocked|disabled|terminated|deactivated|frozen|closed|limited|on hold)\b/gi,
      /\b(suspended|locked|blocked|deactivated|frozen|disconnected)\b/gi, /\blegal (action|case|proceedings)\b/gi,
      /\b(arrest(ed)?|police|warrant|lawsuit)\b/gi, /\b(penalty|fine|late fees?)\b/gi, /\bpermanently\b/gi,
      /\bunusual (activity|sign-?in|login)\b/gi, /\bsuspicious activity\b/gi, /\bunauthori[sz]ed\b/gi,
    ],
  },
  {
    id: 'reward',
    label: 'Too-good-to-be-true',
    weight: 0.38,
    description: 'Dangles prizes, refunds or easy money.',
    patterns: [
      /\bcongratulations?\b/gi, /\byou('ve| have)? (won|been selected)\b/gi, /\bwinner\b/gi, /\bprize\b/gi,
      /\bgift ?cards?\b/gi, /\bfree (iphone|gift|money|reward|trial)\b/gi, /\blottery\b/gi, /\bcash ?back\b/gi,
      /\bguaranteed (returns?|profit|income)\b/gi, /\bdouble your\b/gi, /\bearn [$₹]?\d[\d,]*/gi,
      /\b(tax )?refund\b/gi, /\bpre-?approved\b/gi, /\binheritance\b/gi, /\bclaim (your|now)\b/gi,
    ],
  },
  {
    id: 'credentials',
    label: 'Credential harvesting',
    weight: 0.5,
    description: 'Asks for passwords, codes or personal / banking data.',
    patterns: [
      /\b(confirm|verify|update|validate|enter|provide|share|send) (your )?(password|identity|account|login|credentials|pin|otp|details|information|bank details|card details|billing)\b/gi,
      /\b(otp|cvv|pin number|one[- ]time password)\b/gi, /\b(social security|ssn)\b/gi, /\bcard number\b/gi,
      /\bkyc\b/gi, /\blog ?in (here|now|to (view|secure|verify))\b/gi, /\bsign ?in (here|now)\b/gi,
      /\bbank (account|details)\b/gi,
    ],
  },
  {
    id: 'financial',
    label: 'Payment request',
    weight: 0.4,
    description: 'Pushes you to send money in hard-to-reverse ways.',
    patterns: [
      /\bwire transfer\b/gi, /\b(bitcoin|crypto|usdt|btc|eth)\b/gi, /\b(processing|registration|redelivery|customs|clearance) fee\b/gi,
      /\bpay (the|a|now)\b/gi, /\btransfer (the |it |money|funds)\b/gi, /\bsafe account\b/gi, /\bgift card codes?\b/gi,
      /\bupi\b/gi, /\boutstanding (balance|payment|duty)\b/gi,
    ],
  },
  {
    id: 'secrecy',
    label: 'Secrecy / isolation',
    weight: 0.45,
    description: 'Tries to stop you from checking with anyone else.',
    patterns: [
      /\bkeep (this|it) (confidential|secret|between us|quiet)\b/gi, /\b(don'?t|do not) tell\b/gi,
      /\bconfidential\b/gi, /\b(don'?t|do not) call me\b/gi, /\bquietly\b/gi, /\bi('m| am) in a meeting\b/gi,
    ],
  },
  {
    id: 'authority',
    label: 'Authority pressure',
    weight: 0.25,
    description: 'Invokes a boss, government or official body.',
    patterns: [
      /\b(this is (the|your) )?(ceo|cfo|director|manager)\b/gi, /\b(irs|income tax department|customs department|fraud department)\b/gi,
      /\bgovernment\b/gi, /\bofficer\b/gi, /\bsecurity team\b/gi, /\bcompliance\b/gi,
    ],
  },
  {
    id: 'action',
    label: 'Call to action',
    weight: 0.25,
    description: 'Directs you to click, download or call.',
    patterns: [
      /\bclick (here|the link|below|now)\b/gi, /\b(open|download) the attach(ment|ed)\b/gi, /\benable (macros|content|editing)\b/gi,
      /\bcall (us |our [a-z ]+)?(now|immediately|this number)\b/gi, /\breply with\b/gi, /\bpress 1\b/gi, /\btap (here|the link)\b/gi,
    ],
  },
  {
    id: 'pretext',
    label: 'Personal pretext',
    weight: 0.4,
    description: 'Pretends to be a friend or family member in trouble.',
    patterns: [
      /\b(this is )?my new number\b/gi, /\bi lost my phone\b/gi, /\b(hi |hey )?(mom|mum|dad),? (it'?s me|i)\b/gi,
      /\bneed (money|help) urgently\b/gi, /\bstuck (abroad|at the airport)\b/gi,
    ],
  },
];

/** Protective wording that real banks/services use in transactional messages. */
const PROTECTIVE = [
  /\b(do not|don'?t|never) share (it|this|your otp|this code|the code|your code)\b/i,
  /\bwe (will )?never ask\b/i,
  /\bif (you did not|you didn'?t) request this,? (you can )?(safely )?ignore\b/i,
  /\bno (further )?action is (required|needed)\b/i,
];

const SECRET_REQUEST = /\b(share|send|reply with|tell us|provide|enter|forward)\b[^.!?]{0,25}\b(otp|code|pin|password|cvv)\b/gi;

/**
 * True when the text warns the reader to protect a secret and does not also
 * ask for one (scammers sometimes copy the warning: "share the OTP ... do not share with anyone else").
 */
export function hasProtectiveLanguage(text) {
  if (!PROTECTIVE.some((re) => re.test(text))) return false;
  for (const m of text.matchAll(SECRET_REQUEST)) {
    const before = text.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (!/\b(not|never)\b|n't/.test(before)) return false;
  }
  return true;
}

export function detectSocialEngineering(text) {
  const highlights = [];
  const tactics = [];
  let survive = 1;
  const protective = hasProtectiveLanguage(text);

  for (const tactic of TACTICS) {
    // "Never share your OTP" mentions an OTP but is a warning, not a request.
    if (protective && tactic.id === 'credentials') continue;
    const matches = [];
    for (const re of tactic.patterns) {
      for (const m of text.matchAll(re)) {
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
      }
    }
    if (!matches.length) continue;

    const unique = [...new Set(matches.map((m) => m.text.toLowerCase()))];
    // Repeated evidence within a tactic strengthens it, with diminishing returns.
    const strength = Math.min(1, 0.65 + 0.15 * (unique.length - 1));
    survive *= 1 - tactic.weight * strength;
    tactics.push({ id: tactic.id, label: tactic.label, description: tactic.description, evidence: unique.slice(0, 5), count: matches.length });
    for (const m of matches) highlights.push({ ...m, category: tactic.id, label: tactic.label });
  }

  return { score: 1 - survive, tactics, highlights };
}
