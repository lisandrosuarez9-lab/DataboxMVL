/**
 * Environment Configuration Validator
 * 
 * Implements DIAGNOSTIC LAYER 6 - Environmental Consistency Verification
 * as specified in the troubleshooting protocol.
 */

export interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  malformedVars: Record<string, string>;
  warnings: string[];
  framework: 'vite' | 'nextjs' | 'mixed' | 'unknown';
}

export interface EnvironmentInfo {
  framework: string;
  nodeEnv: string;
  buildMode: string;
  variables: Record<string, string | undefined>;
}

// Framework detection based on environment variables
const detectFramework = (): 'vite' | 'nextjs' | 'mixed' | 'unknown' => {
  const hasVite = !!(
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_API_URL
  );
  
  const hasNext = !!(
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_API_URL
  );

  if (hasVite && hasNext) return 'mixed';
  if (hasVite) return 'vite';
  if (hasNext) return 'nextjs';
  return 'unknown';
};

// Get required environment variables based on framework
const getRequiredVars = (framework: 'vite' | 'nextjs' | 'mixed' | 'unknown'): string[] => {
  switch (framework) {
    case 'vite':
      return [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
      ];
    case 'nextjs':
      return [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ];
    case 'mixed':
      return [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ];
    default:
      return [
        'VITE_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_URL'
      ];
  }
};

// Validate individual environment variable
const validateEnvVar = (key: string, value: string | undefined): string | null => {
  if (!value) return null;

  // URL validation
  if (key.includes('URL')) {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'URL must start with http:// or https://';
    }
    if (value.endsWith('/')) {
      return 'URL should not end with trailing slash';
    }
    if (value.includes('your-project') || value.includes('localhost') && import.meta.env.PROD) {
      return 'URL appears to be a placeholder or localhost in production';
    }
    if (!value.includes('.') && !value.includes('localhost')) {
      return 'URL appears to be malformed';
    }
  }

  // API Key validation
  if (key.includes('ANON_KEY')) {
    if (value.length < 100) {
      return 'Anonymous key appears to be too short';
    }
    if (value.includes('your-anon-key')) {
      return 'Anonymous key appears to be a placeholder';
    }
  }

  // Service role key detection (security check)
  if (key.includes('SERVICE_ROLE') || (key.includes('KEY') && value.length > 200)) {
    return 'Service role key detected in frontend - this is a security violation';
  }

  return null;
};

// Main validation function
export function validateRequiredEnvVars(): EnvValidationResult {
  const framework = detectFramework();
  const required = getRequiredVars(framework);
  
  const missingVars: string[] = [];
  const malformedVars: Record<string, string> = {};
  const warnings: string[] = [];

  // Check for missing required variables
  required.forEach(key => {
    const value = (import.meta.env as any)[key];
    if (!value) {
      missingVars.push(key);
    } else {
      const validationError = validateEnvVar(key, value);
      if (validationError) {
        malformedVars[key] = validationError;
      }
    }
  });

  // Framework-specific warnings
  if (framework === 'mixed') {
    warnings.push('Mixed Vite and Next.js environment variables detected - ensure consistency');
  } else if (framework === 'unknown') {
    warnings.push('Unable to detect framework - ensure proper environment variable naming');
  }

  // Check for development vs production consistency
  if (import.meta.env.PROD) {
    const devUrls = Object.entries(import.meta.env)
      .filter(([key, value]) => key.includes('URL') && typeof value === 'string' && value.includes('localhost'))
      .map(([key]) => key);
    
    if (devUrls.length > 0) {
      warnings.push(`Production build contains localhost URLs: ${devUrls.join(', ')}`);
    }
  }

  // Check for deprecated or old variable names
  const deprecatedVars = ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_ANON_KEY'];
  const foundDeprecated = deprecatedVars.filter(key => {
    return (import.meta.env as any)[key];
  });
  if (foundDeprecated.length > 0) {
    warnings.push(`Deprecated environment variables found: ${foundDeprecated.join(', ')}`);
  }

  return {
    isValid: missingVars.length === 0 && Object.keys(malformedVars).length === 0,
    missingVars,
    malformedVars,
    warnings,
    framework
  };
}

// Get comprehensive environment information
export function getEnvironmentInfo(): EnvironmentInfo {
  const allEnvVars = import.meta.env;
  const relevantVars: Record<string, string | undefined> = {};

  // Extract all Supabase and API related variables
  Object.keys(allEnvVars).forEach(key => {
    if (key.includes('SUPABASE') || key.includes('API') || key.includes('URL') || key.includes('KEY')) {
      relevantVars[key] = allEnvVars[key] as string;
    }
  });

  return {
    framework: detectFramework(),
    nodeEnv: import.meta.env.MODE || 'unknown',
    buildMode: import.meta.env.PROD ? 'production' : 'development',
    variables: relevantVars
  };
}

// Log environment information to console (development only)
export function logEnvironmentInfo(): void {
  if (!import.meta.env.DEV) return;

  const info = getEnvironmentInfo();
  const validation = validateRequiredEnvVars();

  console.group('🔧 Environment Configuration');
  console.log('Framework:', info.framework);
  console.log('Build Mode:', info.buildMode);
  console.log('Node Environment:', info.nodeEnv);
  
  console.group('📋 Environment Variables');
  Object.entries(info.variables).forEach(([key, value]) => {
    if (value) {
      // Mask sensitive information
      const maskedValue = key.includes('KEY') ? `${value.substring(0, 10)}...` : value;
      console.log(`${key}:`, maskedValue);
    } else {
      console.log(`${key}:`, '❌ NOT SET');
    }
  });
  console.groupEnd();

  if (!validation.isValid) {
    console.group('⚠️ Configuration Issues');
    validation.missingVars.forEach(key => {
      console.warn(`Missing: ${key}`);
    });
    Object.entries(validation.malformedVars).forEach(([key, issue]) => {
      console.warn(`Malformed ${key}: ${issue}`);
    });
    console.groupEnd();
  }

  if (validation.warnings.length > 0) {
    console.group('🟡 Warnings');
    validation.warnings.forEach(warning => {
      console.warn(warning);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// Generate environment validation report
export function generateEnvironmentReport(): string {
  const info = getEnvironmentInfo();
  const validation = validateRequiredEnvVars();

  return `
## Environment Configuration Report
Generated at: ${new Date().toISOString()}

### Framework Detection
- **Framework**: ${info.framework}
- **Build Mode**: ${info.buildMode}
- **Node Environment**: ${info.nodeEnv}

### Validation Status
${validation.isValid ? '✅ **VALID**' : '❌ **INVALID**'}

${validation.missingVars.length > 0 ? `
#### Missing Variables:
${validation.missingVars.map(key => `- ❌ ${key}`).join('\n')}
` : ''}

${Object.keys(validation.malformedVars).length > 0 ? `
#### Malformed Variables:
${Object.entries(validation.malformedVars).map(([key, issue]) => `- ⚠️ ${key}: ${issue}`).join('\n')}
` : ''}

${validation.warnings.length > 0 ? `
#### Warnings:
${validation.warnings.map(warning => `- 🟡 ${warning}`).join('\n')}
` : ''}

### Environment Variables
${Object.entries(info.variables).map(([key, value]) => {
  if (!value) return `- ❌ ${key}: NOT SET`;
  
  // Mask sensitive values
  const maskedValue = key.includes('KEY') 
    ? `${value.substring(0, 15)}...${value.substring(value.length - 5)}`
    : value;
  
  return `- ✅ ${key}: ${maskedValue}`;
}).join('\n')}

### Framework-Specific Recommendations

${info.framework === 'vite' ? `
#### Vite Configuration:
- Environment variables are correctly prefixed with VITE_
- Variables are available via import.meta.env
- Make sure .env files are in project root
` : ''}

${info.framework === 'nextjs' ? `
#### Next.js Configuration:
- Environment variables are correctly prefixed with NEXT_PUBLIC_
- Variables are available via process.env (SSR) and import.meta.env (client)
- Make sure .env.local files are properly configured
` : ''}

${info.framework === 'mixed' ? `
#### Mixed Framework Warning:
- Both Vite and Next.js variables detected
- This may cause configuration conflicts
- Consider standardizing on one framework's approach
` : ''}

${info.framework === 'unknown' ? `
#### Unknown Framework:
- Unable to determine framework from environment variables
- Ensure proper variable naming (VITE_ or NEXT_PUBLIC_ prefixes)
- Check that environment files are properly loaded
` : ''}
  `;
}

// Auto-log environment info in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Use a slight delay to ensure environment is fully loaded
  setTimeout(() => {
    logEnvironmentInfo();
  }, 100);
}