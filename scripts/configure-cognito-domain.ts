/*
 * Script to create or update a Cognito User Pool domain with a custom domain name
 * and optionally create/update a Route53 A/AAAA alias to the CloudFront distribution
 * behind the Cognito custom domain. This gives a stable auth endpoint across envs.
 *
 * Usage (env vars):
 *   COGNITO_CUSTOM_DOMAIN=auth.maketools.ai \
 *   COGNITO_CERT_ARN_US_EAST_1=arn:aws:acm:us-east-1:123456789012:certificate/abcdef... \
 *   HOSTED_ZONE_ID=ZABCDEFGHIJKLM \
 *   npm run configure:cognito-domain
 *
 * Optional env vars:
 *   DRY_RUN=true  -> Only prints actions.
 *   ROUTE53_CREATE=true -> Also ensure Route53 alias record.
 *
 * Requirements:
 *   - Certificate MUST be in us-east-1 for Cognito custom domain.
 *   - Amplify service role (or execution credentials) needs: cognito-idp:DescribeUserPool, ListUserPools,
 *     CreateUserPoolDomain, DescribeUserPoolDomain, DeleteUserPoolDomain; route53:ChangeResourceRecordSets (if Route53 enabled).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { CognitoIdentityProviderClient, CreateUserPoolDomainCommand, DescribeUserPoolCommand, DescribeUserPoolDomainCommand, DeleteUserPoolDomainCommand } from '@aws-sdk/client-cognito-identity-provider';
import { Route53Client, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

interface AmplifyOutputsAuth { user_pool_id: string; aws_region: string; }
interface AmplifyOutputs { auth: AmplifyOutputsAuth }

const outputsPath = path.resolve(process.cwd(), 'amplify_outputs.json');
const outputs: AmplifyOutputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
const userPoolId = outputs.auth.user_pool_id;
const region = outputs.auth.aws_region;

const domain = process.env['COGNITO_CUSTOM_DOMAIN'];
const certArn = process.env['COGNITO_CERT_ARN_US_EAST_1']; // must be us-east-1
const hostedZoneId = process.env['HOSTED_ZONE_ID'];
const dryRun = process.env['DRY_RUN'] === 'true';
const route53Create = process.env['ROUTE53_CREATE'] === 'true';

if (!domain) {
  console.log('[configure-cognito-domain] Skipping: COGNITO_CUSTOM_DOMAIN not set.');
  process.exit(0);
}
if (!certArn) {
  console.error('Certificate ARN (COGNITO_CERT_ARN_US_EAST_1) required for custom domain.');
  process.exit(1);
}

async function ensureDomain() {
  // Cognito custom domain APIs operate in region of user pool.
  const cognito = new CognitoIdentityProviderClient({ region });

  // Describe existing domain (if any)
  let existingDistributionDomain: string | undefined;
  try {
    const describe = await cognito.send(new DescribeUserPoolDomainCommand({ Domain: domain }));
    existingDistributionDomain = (describe.DomainDescription as any)?.CloudFrontDistribution || (describe.DomainDescription as any)?.CloudFrontDomain;
    if (existingDistributionDomain) {
      console.log(`Existing custom domain found: ${domain} -> ${existingDistributionDomain}`);
      return existingDistributionDomain; // Already set
    }
  } catch (e: any) {
    if (e.name === 'ResourceNotFoundException') {
      console.log('No existing custom domain, will create.');
    } else {
      console.warn('DescribeUserPoolDomain error (continuing if not found):', e.message);
    }
  }

  // Need user pool details to verify it exists
  await cognito.send(new DescribeUserPoolCommand({ UserPoolId: userPoolId }));

  if (dryRun) {
    console.log(`[DRY_RUN] Would call CreateUserPoolDomain for ${domain}`);
    return 'dry-run-cloudfront.example.com';
  }

  try {
    const create = await cognito.send(new CreateUserPoolDomainCommand({
      Domain: domain,
      CustomDomainConfig: { CertificateArn: certArn },
      UserPoolId: userPoolId,
    }));
    // Response is empty on success; must re-describe to get CloudFront domain.
    console.log('CreateUserPoolDomain initiated, waiting for distribution to be provisioned...');
  } catch (e: any) {
    if (e.name === 'InvalidParameterException' && /already exists/.test(e.message)) {
      console.log('Domain exists but not describable yet, proceeding to describe.');
    } else {
      throw e;
    }
  }

  // Poll until CloudFront domain is ready.
  for (let i = 0; i < 30; i++) {
    const describe = await cognito.send(new DescribeUserPoolDomainCommand({ Domain: domain }));
    const ready = (describe.DomainDescription as any)?.CloudFrontDistribution || (describe.DomainDescription as any)?.CloudFrontDomain;
    if (ready) {
      console.log(`Provisioned CloudFront domain: ${ready}`);
      return ready;
    }
    await new Promise(r => setTimeout(r, 10000));
    console.log('Waiting for CloudFront domain...');
  }
  throw new Error('Timeout waiting for CloudFront domain');
}

async function upsertRoute53Alias(cfDomain: string) {
  if (!route53Create) {
    console.log('Skipping Route53 alias creation (ROUTE53_CREATE!=true)');
    return;
  }
  if (!hostedZoneId) {
    console.log('HOSTED_ZONE_ID not provided; skipping Route53 record.');
    return;
  }
  // CloudFront hosted zone id is always Z2FDTNDATAQYW2
  const cfHostedZoneId = 'Z2FDTNDATAQYW2';
  const route53 = new Route53Client({ region: 'us-east-1' }); // Route53 is global but choose us-east-1
  const domainName = domain!; // safe due to earlier guard
  const change = new ChangeResourceRecordSetsCommand({
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: domainName.endsWith('.') ? domainName : domainName + '.',
            Type: 'A',
            AliasTarget: {
              DNSName: cfDomain,
              HostedZoneId: cfHostedZoneId,
              EvaluateTargetHealth: false,
            },
          },
        },
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: domainName.endsWith('.') ? domainName : domainName + '.',
            Type: 'AAAA',
            AliasTarget: {
              DNSName: cfDomain,
              HostedZoneId: cfHostedZoneId,
              EvaluateTargetHealth: false,
            },
          },
        }
      ],
      Comment: 'Managed by configure-cognito-domain script'
    }
  });
  if (dryRun) {
    console.log('[DRY_RUN] Would UPSERT Route53 alias records');
    return;
  }
  const resp = await route53.send(change);
  console.log('Route53 change submitted:', resp.ChangeInfo?.Id);
}

(async () => {
  try {
    const cfDomain = await ensureDomain();
    await upsertRoute53Alias(cfDomain);
    console.log('Custom auth domain configuration complete.');
  } catch (e: any) {
    console.error('Failed to configure custom auth domain:', e.message);
    process.exit(1);
  }
})();
