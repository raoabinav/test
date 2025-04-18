# Supabase RLS Checker

## Background of Development

With the growing popularity of vibe coding, more people are now able to participate in service development.

However, over the past few months, I've discovered and reported vulnerabilities across more than five websites, leading to the exposure of over 10,000 pieces of personal information, such as email addresses. During this process, it became clear that many services are being released without sufficient understanding of personal data handling and security measures.

In particular, websites using Supabase frequently had improperly configured Row Level Security (RLS), significantly increasing the risk of personal data leakage.

I developed this extension to streamline my reporting of vulnerabilities and to help users easily identify secure websites, enabling safer use of individually developed services.

## Overview

Supabase RLS Checker is a Chrome extension that automatically verifies Row Level Security (RLS) settings for Supabase databases used by websites. It detects tables with disabled RLS settings that should be protecting sensitive data and immediately notifies you of security risks.

### How It Works

1. **Request Detection**: 
   - Monitors browser communications in real-time, intercepting both Fetch API and XMLHttpRequest
   - Identifies Supabase requests by detecting URL patterns containing `.supabase.co/rest/v1/`

2. **API Key Extraction**:
   - Extracts the `apikey` or `Authorization` header from request headers
   - Considers case variations in header names (apikey, Apikey, APIKey)
   - Automatically removes the `Bearer ` prefix in case of Bearer authentication

3. **RLS Verification Process**:
   - Uses the extracted API key to verify numerous types of sensitive tables
   - Executes a `select * limit 30` query for each table
   - Determines that RLS protection is disabled if 30 or more records can be retrieved at once
     (properly configured RLS would restrict access to unauthorized data)
   - Also verifies JWT token validity and expiration

4. **Result Display**:
   - Warns about tables with disabled RLS settings in real-time
   - Draws special attention to tables containing personal or sensitive data

## Key Features

- **Automatic Detection**: Automatically detects requests to Supabase and extracts API keys
- **Comprehensive Checks**: Checks numerous types of tables that may contain personal or confidential information
- **Real-time Verification**: Detects RLS configuration issues in real-time while browsing websites
- **Security Alerts**: Provides visual alerts for tables with disabled RLS settings
- **JWT Verification**: Automatically checks token validity and expiration

## Installation

### Installing from Chrome Web Store

1. ~~Search for "Supabase RLS Checker" in the Chrome Web Store~~ <- Not yet published yet
2. Click the "Add to Chrome" button to install

### Installing in Developer Mode

1. Clone or download this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open `chrome://extensions` in Chrome
5. Turn on "Developer mode" in the top right
6. Click "Load unpacked extension" and select the `dist` folder

## Usage

1. After installation, the icon will appear in the Chrome toolbar
2. When browsing websites that use Supabase, the extension automatically verifies RLS settings
3. If tables with disabled RLS settings are detected, a warning notification will appear
4. Click the notification to view detailed results

### If You See a Warning

1. Check the RLS status for each table
2. Enable RLS settings for the affected tables in the Supabase dashboard
3. Add necessary policies to set up appropriate access controls

## Technical Details

### How RLS is Checked for Each Table

The extension checks the RLS status for each table by executing a `select * limit 30` query

See: https://github.com/hand-dot/supabase-rls-checker/blob/main/src/common/rlsChecker.ts

### API Key Detection and JWT Verification

- Monitors communications by intercepting Fetch API and XMLHttpRequest
- Analyzes extracted JWT tokens to identify project references
- Checks token expiration and warns if expired

## Supported Tables

This extension checks the following numerous types of sensitive tables:

See: https://github.com/hand-dot/supabase-rls-check/blob/main/src/common/constants.ts

## Important Notes

### Production Use

- This extension is recommended for development and testing purposes
- If used in production environments, use it carefully as part of security audits
- We recommend promptly fixing any detected RLS configuration issues

### False Positives

- False positives may occur if table names match common ones
- RLS may be intentionally disabled for certain tables
- Verify results and make judgments based on actual security requirements

## Development Information

### Technology Stack

- TypeScript
- React
- Chrome Extension API
- Supabase JavaScript Client
- JWT Decode

### Build Instructions

```bash
# Install dependencies
npm install

# Run in development mode (watches for file changes)
npm run dev

# Build for production
npm run build
```

## License

MIT

## Contributions

Bug reports and feature requests are accepted through GitHub Issues. Pull requests are also welcome.
