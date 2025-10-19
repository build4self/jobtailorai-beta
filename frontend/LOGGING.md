# Logging Configuration

This project uses a custom Logger utility to manage console output based on the environment.

## Logger Utility

The `Logger` utility (`src/utils/logger.js`) provides conditional logging that only outputs to console in development or test mode.

### Usage

```javascript
import Logger from '../utils/logger';

// These will only log in development/test mode
Logger.log('Debug information');
Logger.error('Error occurred');
Logger.warn('Warning message');
Logger.info('Info message');
Logger.debug('Debug message');

// These will always log (use sparingly)
Logger.forceLog('Always visible');
Logger.forceError('Critical error');
```

## Environment Configuration

### Development Mode
- `NODE_ENV=development` - Automatically enables logging
- `REACT_APP_TEST_MODE=true` - Additional flag for testing

### Production Mode
- `NODE_ENV=production` - Disables logging by default
- `REACT_APP_TEST_MODE=false` - Ensures logging is disabled

## Environment Files

- `.env.development` - Development settings (logging enabled)
- `.env.production` - Production settings (logging disabled)
- `.env` - Default settings

## Best Practices

1. **Use Logger instead of console**: Always import and use the Logger utility
2. **Avoid forceLog in production**: Only use `forceLog` and `forceError` for critical issues
3. **Test both modes**: Verify your app works with logging both enabled and disabled
4. **Remove sensitive data**: Never log sensitive user information, even in development

## Migration from console.log

Replace existing console statements:

```javascript
// Before
console.log('User data:', userData);
console.error('API error:', error);

// After
import Logger from '../utils/logger';
Logger.log('User data:', userData);
Logger.error('API error:', error);
```

## Security Benefits

- Prevents sensitive information from appearing in production console
- Reduces bundle size by removing debug code in production
- Improves performance by eliminating unnecessary console operations
- Maintains clean production environment for end users
