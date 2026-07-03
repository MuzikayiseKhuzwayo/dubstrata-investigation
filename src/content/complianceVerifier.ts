import { CURRENT_STRATEGY } from './strategy';

export const BANNED_WORDS = [
  'delve',
  'tapestry',
  'testament',
  'beacon',
  'fosters',
  'nuanced',
  'myriad',
  'orchestrate',
  'synergize',
  'elevate'
];

export interface ComplianceResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
}

export class ContentComplianceVerifier {
  /**
   * Evaluates if a post/thread conforms to target copywriting rules
   */
  public static verify(content: string): ComplianceResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const contentLower = content.toLowerCase();

    // 1. Check for Hard-Banned Words
    for (const word of BANNED_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(content)) {
        errors.push(`BANNED_WORD_USED: Found hard-banned term "${word}" in copy.`);
      }
    }

    // 2. Check for Pacing / Scrollytelling (Whitespace)
    // Avoid blocks of text longer than 250 characters without any line break.
    const paragraphs = content.split('\n');
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (p.length > 250) {
        errors.push(`PACING_VIOLATION: Paragraph ${i + 1} exceeds 250 characters without a line break. This degrades mobile scrollytelling.`);
      }
    }

    // 3. Check for Visceral Verb Presence
    const hasVisceralVerb = CURRENT_STRATEGY.priorityVerbs.some(verb => 
      contentLower.includes(verb.toLowerCase())
    );
    if (!hasVisceralVerb) {
      warnings.push(`MISSING_VISCERAL_VERB: Copy does not include priority verbs (e.g. ${CURRENT_STRATEGY.priorityVerbs.slice(0, 3).join(', ')}). This reduces engagement resonance.`);
    }

    // 4. Check for Grok Answer Capsule in Long-form Articles
    if (content.length > 600) {
      const hasHeading = content.includes('##') || content.includes('###');
      if (!hasHeading) {
        warnings.push(`MISSING_GROK_CAPSULE: Long-form post lacks an H2/H3 summary capsule for Grok AI search optimization.`);
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Simple CLI test support
if (require.main === module) {
  const sampleOk = `Snowflake's Systems Lead just joined Vectara. \n\nOld databases treat query context as static layouts. They bleed relational data.\n\nWe gutted the latency down to 4.2ms flat.`;
  const sampleBad = `We delve into Snowflake's tapestry of features to elevate Vectara.`;
  console.log('Testing OK sample:', ContentComplianceVerifier.verify(sampleOk));
  console.log('Testing BAD sample:', ContentComplianceVerifier.verify(sampleBad));
}
