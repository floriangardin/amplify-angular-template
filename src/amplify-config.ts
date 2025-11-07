import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Decide the Cognito domain from the current URL BEFORE configuring Amplify
function pickDomainFromUrl(href: string, hostname: string): string {
	// Local development
	if (hostname.includes('localhost')) {
		return 'maketoolsauth.auth.eu-west-3.amazoncognito.com';
	}
	// Qualification environment
	if (href.includes('qual') || hostname.includes('qual')) {
		return 'maketoolsqual.auth.eu-west-2.amazoncognito.com';
	}
	// Production (default)
	return 'maketools.auth.eu-west-2.amazoncognito.com';
}

try {
	const href = typeof window !== 'undefined' ? window.location.href : '';
	const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
	outputs.auth.oauth.domain = pickDomainFromUrl(href, hostname);
} catch {
	// Fallback to production domain if window is unavailable (e.g., in non-browser contexts)
	outputs.auth.oauth.domain = 'maketools.auth.eu-west-2.amazoncognito.com';
}

Amplify.configure(outputs);
