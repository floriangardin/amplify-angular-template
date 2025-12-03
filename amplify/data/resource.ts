import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { ResourceType } from 'aws-cdk-lib/aws-config';
import { sayHello } from "../functions/say-hello/resource"
import { createCheckoutSession } from '../functions/create-checkout-session/resource';
import { cancelSubscription } from '../functions/cancel-subscription/resource';
import { reinstateSubscription } from '../functions/reinstate-subscription/resource';
import { verifySubscription } from '../functions/verify-subscription/resource';
import { listInvoices } from '../functions/list-invoices/resource';
/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/

export const schema = a.schema({
  InvoiceSummary: a.customType({
    id: a.string().required(),
    number: a.string().required(),
    hostedInvoiceUrl: a.string().required(),
    invoicePdf: a.string().required(),
    currency: a.string().required(),
    total: a.integer().required(),
    created: a.string().required(),
    status: a.string().required(),
  }),
  
    createCheckoutSession: a
    .query()
    .arguments({})
    .returns(a.string())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(createCheckoutSession)),

  cancelSubscription: a
  .mutation()
  .arguments({})
  .returns(a.string())
  .authorization(allow => [allow.authenticated()])
  .handler(a.handler.function(cancelSubscription)),

  reinstateSubscription: a
  .mutation()
  .arguments({})
  .returns(a.string())
  .authorization(allow => [allow.authenticated()])
  .handler(a.handler.function(reinstateSubscription)),

  verifySubscription: a
  .mutation()
  .arguments({
    sessionId: a.string().required(),
  })
  .returns(a.string())
  .authorization(allow => [allow.authenticated()])
  .handler(a.handler.function(verifySubscription)),

  listInvoices: a
  .query()
  .arguments({})
  .returns(a.ref('InvoiceSummary').array().required())
  .authorization(allow => [allow.authenticated()])
  .handler(a.handler.function(listInvoices)),

  sayHello: a
    .query()
    .arguments({
      name: a.string(),
    })
    .returns(a.string())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(sayHello)),


  // ===== Enums =====
  NodeCategory: a.enum(['scenario', 'sales_support', 'culture']),
  IndicatorType: a.enum(['percentage', 'dollars']),
  SourceType: a.enum(['local', 'external']),
  MedalName: a.enum(['gold','silver','bronze']),

  // ===== Custom Types =====
  Impact: a.customType({
    dataQuality: a.integer().required(),
    stakeholderTrust: a.integer().required(),
    profit: a.integer().required(),
  }),

  Outcome: a.customType({
    description: a.string().required(),
    impact: a.ref('Impact').required(),
    next: a.string().array().required(), // e.g., ["data_2A", "data_extra_1"]
  }),

  Medal: a.customType({
    name: a.ref('MedalName').required(),
    threshold: a.integer().required(),
  }),

  Choice: a.customType({
    name: a.string().required(), // "1" | "2" | "3"
    text: a.string().required(),
    outcome: a.ref('Outcome').required(),
  }),

  ResourceType: a.enum(['term_link', 'end_resource']),

  ResourceLink: a.customType({
    name: a.string().required(),
    text: a.string().required(),
    href: a.string().required(),   // e.g., "mdm.html"
    source: a.ref('SourceType').required(), // "local" | "external"
  }),

  LogoRef: a.customType({
    assetId: a.string().required(), // e.g., "data_steward.png"
  }),

  // ===== Card types =====
  CardContext: a.customType({
    program: a.string().required(),
    domains: a.string().required(),
    roleFocus: a.string().required(),
    objective: a.string().required(),
  }),

  CardMetadata: a.customType({
    category: a.string().required(),
    estimatedDurationMinutes: a.integer().required(),
    track: a.string().required(),
  }),

  PlanEnum: a.enum(['free','pro']),

  // Progress tracking enums and types
  ProgressStatusEnum: a.enum(['in_progress','completed']),

  IndicatorScore: a.customType({
    indicatorNameId: a.string().required(),
    value: a.integer().required(),
  }),

  Card: a.customType({
    plan: a.ref('PlanEnum').required(),
    title: a.string().required(),
    shortDescription: a.string().required(),
    difficulty: a.string().required(),
    skillsAcquired: a.string().array().required(),
    context: a.ref('CardContext').required(),
    metadata: a.ref('CardMetadata').required(),
  }),
  // Library items can be global (no scenarioId) or linked to a specific Scenario (scenarioId populated)
  LibraryItem: a.model({
    scenarioId: a.id(), // optional so we can seed global library content first
    scenario: a.belongsTo('Scenario', 'scenarioId'),
    nameId: a.string().required(),
    title: a.string().required(),
    emoji: a.string().required(),
    description: a.string().required(),
  }),

  // ===== Models =====
  Scenario: a
    .model({
    nameId: a.id().required(),
    priority: a.integer().required(),
    // Static collection key to support global sorting via GSI
    collection: a.string().required(),
    card: a.ref('Card').required(),
    medals: a.ref('Medal').array(),
    nodes: a.hasMany('Node', 'scenarioId'),
    indicators: a.hasMany('Indicator', 'scenarioId'),
    library: a.hasMany('LibraryItem', 'scenarioId'),
    })
    .identifier(['nameId'])
    // Global sorted listing: query all scenarios ordered by priority then nameId
    // Requires setting collection="ALL" on each Scenario item
    .secondaryIndexes(index => [
      index('collection').sortKeys(['priority', 'nameId']).queryField('listScenariosByPriority')
    ])
    ,

  Node: a
    .model({
      // parent
      scenarioId: a.id().required(),
      scenario: a.belongsTo('Scenario', 'scenarioId'),
      // identity within the scenario
      name: a.string().required(), // "data_1", "data_2A", ...
      // email/scenario content
      end: a.boolean().required(),
      // store hint references as library nameIds (strings)
      hints: a.string().array(),
      default: a.boolean().required(), // optional true on the initial node(s)
      sender: a.string().required(), // "Leah Park, Marketing Manager"
      title: a.string().required(),
      content: a.string().required(), // HTML allowed
      category: a.string().required(),
      isUrgent: a.boolean().required(),
      minClientRelationship: a.integer(), // optional
      maxDataQuality: a.integer(), // optional
      // branching
      choices: a.ref('Choice').required().array().required(),
  }),

  CurrencyEnum: a.enum(['percentage', 'dollars']),
  Indicator: a
    .model({
      scenarioId: a.id().required(),
      scenario: a.belongsTo('Scenario', 'scenarioId'),
      name: a.string().required(), // display name
      nameId: a.string().required(), // id name for mapping
      emoji: a.string().required(),
      initial: a.integer().required(),
      min: a.integer().required(),
      max: a.integer().required(),
      type: a.ref('CurrencyEnum').required(),
      displayed: a.boolean().required(),
      color: a.string().required(), // hex or token
  }),

  // Per-user per-scenario progress + indicator scores
  UserScenarioProgress: a
    .model({
      userId: a.string().required(), // Cognito sub; auto-populated by ownerDefinedIn
      username: a.string().required(), // denormalized display name
      scenarioNameId: a.id().required(),
      status: a.ref('ProgressStatusEnum').required(),
      completed: a.boolean().required(),
      runs: a.integer().required(), // number of attempts
      indicatorScores: a.ref('IndicatorScore').array().required(),
    })
    .identifier(['userId', 'scenarioNameId']) // enforce uniqueness per owner+scenario
    .secondaryIndexes(index => [
      index('scenarioNameId').queryField('listProgressByScenario'),
      index('userId').queryField('listProgressByUser')
    ])
    .authorization(allow => [
      allow.ownerDefinedIn('userId'),
      allow.groups(['ADMIN']).to(['read', 'create', 'update', 'delete'])
    ]),
  // LeaderboardEntry model: stores best profit per user per scenario
  LeaderboardEntry: a
    .model({
      // Remove field-level auth so non-owners can read these fields
      userId: a.string().required(),
      username: a.string().required(),
      scenarioNameId: a.id().required(),
      profit: a.integer().required(),
    })
    // Composite identifier ensures 1 row per (userId, scenarioNameId)
    .identifier(['userId', 'scenarioNameId'])
    // Secondary index to query top scores for a scenario ordered by profit
    .secondaryIndexes(index => [
      index('scenarioNameId').sortKeys(['profit']).queryField('listLeaderboardByScenario')
    ])
    // Model-level auth: everyone signed-in can read; owners can create/update; admins full control
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.ownerDefinedIn('userId').to(['create', 'update']),
      allow.groups(['ADMIN']).to(['read', 'create', 'update', 'delete']),
    ]),

  // ...existing code...
})
.authorization((allow) => [allow.authenticated().to(['read']), allow.groups(['ADMIN']).to(['create', 'delete'])]);


export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
