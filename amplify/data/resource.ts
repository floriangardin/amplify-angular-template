import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { ResourceType } from 'aws-cdk-lib/aws-config';
import { sayHello } from "../functions/say-hello/resource"
import { seedScenario } from "../functions/seed-scenario/resource"
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

  // Returns a Scenario
  seedScenario: a
    .query()
    .arguments({})
  .returns(a.ref('Scenario'))
  .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(seedScenario)),

  // ===== Enums =====
  NodeCategory: a.enum(['scenario', 'sales_support', 'culture']),
  IndicatorType: a.enum(['percentage', 'dollars']),
  SourceType: a.enum(['local', 'external']),

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

  // ===== Models =====
  Scenario: a
    .model({
    // Note: JSON uses 'title' and doesn't include a top-level 'name'. Make 'name' optional.
    name: a.string(), // e.g., "Data Steward simulator"
    title: a.string().required(), // "Data Steward simulator"
    scenarioTitle: a.string().required(), // "<q>The Duplicate Dilemma</q>"
    gameTitle: a.string().required(), // "Data Steward Simulator"
    plan: a.string().required(), // "free" | "pro"
    role: a.string().required(), // "Your Role as Data Steward"
    // JSON field is 'headerGameText'
    headerGameText: a.string().required(), // "Data Steward Simulator"
    introText: a.string().required(),
    description: a.string().required(),
    cdoRole: a.string().required(), // "Your Role as Data Steward"
    startTutorial: a.string().required(),
    logo: a.ref('LogoRef').required(),
    logoCompany: a.ref('LogoRef').required(),
    // Relations (reverse fields on child models)
    nodes: a.hasMany('Node', 'scenarioId'),
    logoId: a.string().required(),
    indicators: a.hasMany('Indicator', 'scenarioId'),
    // JSON uses 'termsLinks' (plural 'terms')
    termsLinks: a.hasMany('TermLink', 'scenarioId'),
        endResources: a.hasMany('EndResource', 'scenarioId'),
    }),

  Categories: a.enum(['scenario', 'sales_support', 'culture']),
  Node: a
    .model({
      // parent
      scenarioId: a.id().required(),
      scenario: a.belongsTo('Scenario', 'scenarioId'),
      // identity within the scenario
      name: a.string().required(), // "data_1", "data_2A", ...
      // email/scenario content
      end: a.boolean().required(),
      default: a.boolean().required(), // optional true on the initial node(s)
      sender: a.string().required(), // "Leah Park, Marketing Manager"
      title: a.string().required(),
      content: a.string().required(), // HTML allowed
      category: a.ref('Categories').required(),
      isUrgent: a.boolean().required(),
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

  TermLink: a
    .model({
      scenarioId: a.id().required(),
      scenario: a.belongsTo('Scenario', 'scenarioId'),
  // Align with JSON: objects inside 'termsLinks' carry name/text/href/source directly
  name: a.string().required(), // e.g., "MDM"
  text: a.string().required(), // display text
  href: a.string().required(), // e.g., "mdm.html"
  source: a.ref('SourceType').required(), // "local" | "external"
  }),

  EndResource: a
    .model({
      scenarioId: a.id().required(),
      scenario: a.belongsTo('Scenario', 'scenarioId'),
  // Align with JSON: entries in 'endResources' carry name/text/href/source directly
  name: a.string().required(), // e.g., "2", "3"
  text: a.string().required(),
  href: a.string().required(),
  source: a.ref('SourceType').required(),
  })
,

  // LeaderboardEntry model: stores best profit per user per scenario
  LeaderboardEntry: a
    .model({
      userId: a.string().required(), // Cognito sub
      username: a.string().required(), // display username (denormalized, updated on username change)
      scenarioId: a.id().required(),
      profit: a.integer().required(), // best profit achieved
    })
    // Composite identifier ensures 1 row per (userId, scenarioId)
    .identifier(['userId', 'scenarioId'])
    // Secondary index to query top scores for a scenario ordered by profit
    .secondaryIndexes(index => [
      index('scenarioId').sortKeys(['profit']).queryField('listLeaderboardByScenario')
    ])
    .authorization(allow => [
      // Any signed-in user can read the leaderboard
      allow.authenticated().to(['read']),
      // Only the owner (userId == identity) can create/update their entry
      allow.ownerDefinedIn('userId').to(['create','update','delete'])
    ])
})
.authorization((allow) => [allow.authenticated().to(['read']), allow.groups(['ADMIN']).to(['create', 'delete']), allow.resource(seedScenario).to(['mutate', 'query', 'listen'])]);


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
