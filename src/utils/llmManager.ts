import axios from 'axios';
import { logger } from './logger';

export class CausalLLMManager {
  private apiKey: string | undefined;
  private model: string = 'gemini-2.5-flash';
  private maxRetries = 4;
  private baseDelayMs = 2000;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      logger.warn('⚠️ GEMINI_API_KEY environment variable is not defined.');
      logger.warn('Core harness will run LLM evaluations in local mock/simulation fallback mode.');
    }
  }

  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Basic model completion query with exponential backoff retries
   */
  public async queryModel(
    prompt: string,
    systemInstruction?: string,
    isJson = false
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Missing GEMINI_API_KEY in environment variables.');
    }

    let attempt = 0;
    let lastError = '';

    while (attempt <= this.maxRetries) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const payload: any = {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: isJson ? 'application/json' : 'text/plain'
          }
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }

        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
        throw new Error('No candidate content text returned from Gemini API response.');
      } catch (err: any) {
        lastError = err.response?.data?.error?.message || err.message;
        if (attempt < this.maxRetries) {
          const currentDelayMs = this.baseDelayMs * Math.pow(2, attempt);
          logger.warn(
            `⚠️ Gemini API call failed: "${lastError}". Retrying in ${currentDelayMs / 1000} seconds... (Attempt ${attempt + 1}/${this.maxRetries + 1})`
          );
          await new Promise((resolve) => setTimeout(resolve, currentDelayMs));
          attempt++;
        } else {
          logger.error(
            `❌ Gemini API call failed permanently after ${this.maxRetries + 1} attempts. Last error: ${lastError}`
          );
          break;
        }
      }
    }

    throw new Error(
      `Gemini API call failed permanently on ${this.model} after ${this.maxRetries + 1} attempts. Last error: ${lastError}`
    );
  }

  /**
   * Queries the model and parses the JSON response using a validator.
   * If parsing fails or the validator throws an error, it runs a self-correction feedback loop.
   */
  public async queryModelStructured<T>(
    prompt: string,
    systemInstruction: string,
    validator: (data: any) => T,
    maxFeedbackRetries = 3
  ): Promise<T> {
    let currentPrompt = prompt;
    let feedbackAttempt = 0;

    while (feedbackAttempt <= maxFeedbackRetries) {
      try {
        const responseText = await this.queryModel(
          currentPrompt,
          systemInstruction,
          true
        );

        let parsedData: any;
        try {
          parsedData = JSON.parse(responseText);
        } catch (jsonErr: any) {
          throw new Error(`Invalid JSON syntax in model response: ${jsonErr.message}`);
        }

        // Validate the structure of parsed object
        return validator(parsedData);
      } catch (err: any) {
        if (feedbackAttempt < maxFeedbackRetries) {
          feedbackAttempt++;
          logger.warn(
            `🔍 [SENSOR FEEDBACK LOOP] Output validation failed: "${err.message}". Retrying with model self-correction (Attempt ${feedbackAttempt}/${maxFeedbackRetries})...`
          );
          
          // Re-feed the invalid response and error trace back to Gemini context for JIT correction
          currentPrompt = `
${prompt}

--- FEEDBACK / CORRECTION REQUIRED ---
Your previous response failed validation with the following error:
Error Message: "${err.message}"

Please correct the JSON formatting. Ensure the output matches the exact JSON schema requested.
Do not include any extra explanatory text, comments, or markdown wraps. Start and end with curly braces.
`;
        } else {
          logger.error(
            `❌ [SENSOR FAILURE] Model failed to produce a valid schema after ${maxFeedbackRetries} self-correction attempts. Last error: ${err.message}`
          );
          throw err;
        }
      }
    }

    throw new Error('Self-correcting structured query loop exited unexpectedly.');
  }
}
