import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/seed-scenario';
import type { Schema } from '../../data/resource';
import demo from '../../static/demo_content.json';

// Configure Amplify for the Lambda environment using the recommended runtime helper
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

type DemoJson = typeof demo;

export const handler: Schema["seedScenario"]["functionHandler"] = async (event) => {
  // Use IAM auth via generated config
  const client = generateClient<Schema>();
  const payload = demo as DemoJson;

  // Idempotency: check if a scenario with the same title already exists
  const existing = await client.models.Scenario.list({
    filter: { title: { eq: payload.title } },
  });

  if (existing.data.length > 0) {
    // Return the existing Scenario directly
    return existing.data[0]!;
  }

  // Create Scenario first
  const { data: scenario, errors: scenarioErrors } = await client.models.Scenario.create({
    name: payload.title,
    title: payload.title,
    scenarioTitle: payload.scenarioTitle,
    gameTitle: payload.gameTitle,
    headerGameText: payload.headerGameText,
    plan: payload.plan,
    role: payload.role,
    introText: payload.introText,
    description: payload.description,
    cdoRole: payload.cdoRole,
    startTutorial: payload.startTutorial,
    logo: { assetId: payload.logo.assetId },
    logoCompany: { assetId: payload.logoCompany.assetId },
  });

  if (scenarioErrors?.length || !scenario) {
    const msg = scenarioErrors?.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ') || 'Unknown error creating Scenario';
    throw new Error(msg);
  }

  const scenarioId = scenario.id;

  // Helpers to coerce data from JSON to model shapes
  const toChoices = (choicesObj: any | undefined) => {
    if (!choicesObj) return [] as Schema['Choice'][];
    const arr = Object.values(choicesObj) as any[];
    return arr.map((c: any) => ({
      name: String(c.name),
      text: String(c.text),
      outcome: {
        description: String(c.outcome.description),
        impact: {
          dataQuality: Number(c.outcome.impact?.dataQuality ?? 0),
          stakeholderTrust: Number(c.outcome.impact?.stakeholderTrust ?? 0),
          profit: Number(c.outcome.impact?.profit ?? 0),
        },
        next: Array.isArray(c.outcome.next) ? (c.outcome.next as string[]) : [],
      },
    }));
  };

  // Create Nodes
  const nodeResults = await Promise.all(
    (payload.nodes ?? []).map((n) =>
      client.models.Node.create({
        scenarioId,
        name: n.name,
        end: Boolean(n.end),
        default: Boolean(n.default ?? false),
        sender: n.sender,
        title: n.title,
        content: n.content,
        category: n.category as any,
        isUrgent: Boolean(n.isUrgent),
        choices: toChoices((n as any).choices) as any,
      })
    )
  );

  const nodeErrors = nodeResults.flatMap((r) => r.errors ?? []);
  if (nodeErrors.length) {
    const msg = nodeErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create Nodes: ${msg}`);
  }

  // Create Indicators
  const indicatorResults = await Promise.all(
    (payload.indicators ?? []).map((ind) =>
      client.models.Indicator.create({
        scenarioId,
        name: ind.name,
        emoji: ind.emoji,
        initial: ind.initial,
        min: ind.min,
        max: ind.max,
        type: ind.type as any,
        displayed: Boolean(ind.displayed),
        color: ind.color,
      })
    )
  );

  const indicatorErrors = indicatorResults.flatMap((r) => r.errors ?? []);
  if (indicatorErrors.length) {
    const msg = indicatorErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create Indicators: ${msg}`);
  }

  // Create Term Links
  const termLinkResults = await Promise.all(
    (payload.termsLinks ?? []).map((t) =>
      client.models.TermLink.create({
        scenarioId,
        name: t.name,
        text: t.text,
        href: t.href,
        source: t.source as any,
      })
    )
  );

  const termLinkErrors = termLinkResults.flatMap((r) => r.errors ?? []);
  if (termLinkErrors.length) {
    const msg = termLinkErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create TermLinks: ${msg}`);
  }

  // Create End Resources
  const endResourceResults = await Promise.all(
    (payload.endResources ?? []).map((e) =>
      client.models.EndResource.create({
        scenarioId,
        name: e.name,
        text: e.text,
        href: e.href,
        source: (e as any).source ?? 'local',
      })
    )
  );

  const endResourceErrors = endResourceResults.flatMap((r) => r.errors ?? []);
  if (endResourceErrors.length) {
    const msg = endResourceErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create EndResources: ${msg}`);
  }

  // Return the created Scenario object
  return scenario;
};
