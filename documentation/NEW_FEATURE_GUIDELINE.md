
How to add a model
====================

Let's say you have added a field in the `Scenarios`, for example we added this key to all scenarios
in `amplify/static/scenarios/*.json` :
```json
  "medals": [
    {"name": "gold", "threshold": 3500},
    {"name": "silver", "threshold": 2000},
    {"name": "bronze", "threshold": 500}
  ],
```

1. Modify the backend data model 

In `amplify/data/resource.ts` change scenarios model to this : 

```ts
// Add medal data model
MedalName: a.enum(['gold','silver','bronze']),
Medal: a.customType({
name: a.ref('MedalName').required(),
threshold: a.integer().required(),
}),
Scenario: a
    .model({
    nameId: a.string().required(),
    card: a.ref('Card').required(),
    medals: a.ref('Medal').array(), // Added line
    nodes: a.hasMany('Node', 'scenarioId'),
    indicators: a.hasMany('Indicator', 'scenarioId'),
    library: a.hasMany('LibraryItem', 'scenarioId'),
    }),
```

2. Modify the corresponding seed script(s)

In `scripts/seed-scenarios.ts`
```ts
type DemoJson = {
  // ... Rest of the code not changed
  medals?: Array<{ name: 'gold' | 'silver' | 'bronze'; threshold: number }>; // add this
  // ... Rest of the code not changed
};

const { data: scenario, errors: scenarioErrors } = await client.models.Scenario.create({
nameId: payload.nameId,
card: payload.card,
medals: Array.isArray(payload.medals) ? payload.medals.map(m => ({ name: m.name, threshold: Number(m.threshold) })) : []
});
```

3. Modify scenario data structure in frontend 

In `src/app/models/game-content.ts`

```ts
export interface Medal {
  name: 'gold' | 'silver' | 'bronze';
  threshold: number;
}
export interface Scenario {
  // ... Rest of the code not changed
  medals?: Medal[];
  // ... Rest of the code not changed 
}
```

4. Modify state service to query the scenarios with updated fields

In `src/app/services/state.service.ts`
```ts
  async getScenarios(): Promise<Scenario[]> {
      // Example Angular usage
      const scenarios = await this.clientService.client.models.Scenario.list({
      selectionSet: [
        'id', 'card.*', 'nameId', 'medals.*', // Added medals
        'indicators.*',
      ],
      limit: 1000, // raise as needed (AppSync caps apply)
      });
      return scenarios.data as unknown as Scenario[];
  }

  async getScenarioById(id: string): Promise<Scenario | null> {
    const scenario = await this.clientService.client.models.Scenario.get({ id }, {
      selectionSet: [
        'id', 'card.*', 'nameId', 'medals.*', // Added medals
        'indicators.*', 'nodes.*', 'nodes.hints',
        'library.*',
      ],
    });
    let result = scenario.data as unknown as Scenario | null;
    return result;
  }

```