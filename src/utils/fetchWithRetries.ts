/**
 * Fetch utility with retry logic and exponential backoff
 * Handles network failures, CORS errors, and server issues
 */

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface FetchResult {
  ok: boolean;
  status: number;
  headers: Headers;
  json: any;
  correlationId: string;
  rawText?: string;
  error?: string;
}

interface FetchOptions extends RequestInit {
  maxAttempts?: number;
  correlationId?: string;
}

/**
 * Fetch with retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options with retry configuration
 * @returns Promise with fetch result including correlation ID
 */
export async function fetchWithRetries(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    maxAttempts = 3,
    correlationId = generateUUID(),
    ...fetchOptions
  } = options;

  // Add required headers
  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  headers.set('X-Factora-Correlation-Id', correlationId);
  headers.set('X-Factora-Client', 'factora-ui');

  const requestOptions = {
    ...fetchOptions,
    headers,
  };

  let lastError: Error | null = null;
  let lastStatus = 0;
  let lastBodySnippet = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `[fetchWithRetries] Attempt ${attempt}/${maxAttempts} for ${url} (correlation: ${correlationId})`
      );

      const response = await fetch(url, requestOptions);
      lastStatus = response.status;

      // Clone response to allow multiple reads
      const responseClone = response.clone();
      let jsonData: any = null;
      let rawText = '';

      try {
        rawText = await responseClone.text();
        jsonData = JSON.parse(rawText);
      } catch (parseError) {
        console.error('[fetchWithRetries] JSON parse error:', parseError);
        
        // If we got a response but can't parse it, don't retry on 2xx
        if (response.ok) {
          return {
            ok: false,
            status: response.status,
            headers: response.headers,
            json: null,
            correlationId,
            rawText,
            error: 'invalid_json_response',
          };
        }
        
        // For non-2xx responses with parse errors, retry if we have attempts left
        if (attempt < maxAttempts) {
          const backoff = Math.pow(3, attempt - 1) * 300; // 300ms, 900ms, 2700ms
          console.log(`[fetchWithRetries] Retrying after ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        
        return {
          ok: false,
          status: response.status,
          headers: response.headers,
          json: null,
          correlationId,
          rawText,
          error: 'parse_error_after_retries',
        };
      }

      // Non-retriable status codes - return immediately
      if ([400, 401, 403, 422].includes(response.status)) {
        console.log(
          `[fetchWithRetries] Non-retriable status ${response.status}, returning immediately`
        );
        return {
          ok: false,
          status: response.status,
          headers: response.headers,
          json: jsonData,
          correlationId,
          rawText,
        };
      }

      // Success case
      if (response.ok) {
        console.log(`[fetchWithRetries] Success on attempt ${attempt}`);
        return {
          ok: true,
          status: response.status,
          headers: response.headers,
          json: jsonData,
          correlationId,
          rawText,
        };
      }

      // Server error (5xx) - retry if we have attempts left
      if (response.status >= 500 && attempt < maxAttempts) {
        lastBodySnippet = rawText.substring(0, 200);
        const backoff = Math.pow(3, attempt - 1) * 300;
        console.log(
          `[fetchWithRetries] Server error ${response.status}, retrying after ${backoff}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      // If we've exhausted retries or other error
      return {
        ok: false,
        status: response.status,
        headers: response.headers,
        json: jsonData,
        correlationId,
        rawText,
      };
    } catch (error) {
      // Network-level error
      lastError = error as Error;
      console.error(`[fetchWithRetries] Network error on attempt ${attempt}:`, error);

      if (attempt < maxAttempts) {
        const backoff = Math.pow(3, attempt - 1) * 300;
        console.log(`[fetchWithRetries] Network error, retrying after ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      // Exhausted all retries
      return {
        ok: false,
        status: 0,
        headers: new Headers(),
        json: null,
        correlationId,
        error: lastError?.message || 'network_error',
      };
    }
  }

  // Should not reach here, but just in case
  return {
    ok: false,
    status: lastStatus,
    headers: new Headers(),
    json: null,
    correlationId,
    error: lastError?.message || 'max_attempts_exceeded',
    rawText: lastBodySnippet,
  };
}

/**
 * Create a demo profile response for fallback mode
 */
export function createDemoProfile(fullName: string): any {
  const now = new Date().toISOString();
  return {
    borrower: {
      borrower_id: 'demo-0001',
      full_name: fullName || 'Demo User',
      email: 'demo@example.com',
      phone: null,
      national_id: '000000000',
      created_at: now,
    },
    score: {
      score_id: 'demo-score-0001',
      factora_score: 650,
      score_band: 'fair',
    },
    enrichment: {
      source: 'demo',
      notes: 'synthetic demo enrichment - service unavailable',
    },
    correlation_id: 'demo-' + generateUUID(),
    _isDemo: true,
  };
}
