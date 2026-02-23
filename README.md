## Data game

This repository implements an inbox style game called "Who can lead with data". 
It's an angular application with a homepage, a game screen and a leaderboard.

## Overview

This project equips you with a foundational Angular.js application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.
We use amplify v2, not v1 !

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/angular/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.


## Seed
To create admin user

```bash
npx ampx sandbox secret set username       
npx ampx sandbox secret set password                                   
amplify-angular-template % npx ampx sandbox seed                                                       
```

### Seed scenarios (all JSON files)

Seed all files in `amplify/static/scenarios` into the backend referenced by `amplify_outputs.json`.

Sandbox (using `.env.local` for credentials):

```bash
npx dotenvx run --env-file=.env.local -- npm run seed:scenarios -- -f
```

Inline credentials (any environment):

```bash
SEED_USERNAME="you@example.com" SEED_PASSWORD="yourpassword" npm run seed:scenarios
```

Notes:
- Provide a valid Cognito user with permissions (authenticated users can create/read/delete per schema).
- Make sure `amplify_outputs.json` points to the desired environment (Sandbox running, or correct branch checked out).

## Run sandbox

For arup
```bash
npx dotenvx run --env-file=.env.local -- ampx sandbox --identifier arup --stream-function-logs
```

## Configure custom domain

To add to amplify.yml
        - npm run configure:cognito-domain || true

## Extract qual or prod amplify_outputs.json file

```bash
AWS_REGION=eu-west-2 npx ampx generate outputs --app-id d1lyo11fq4n49c --branch qual --format "json" --out-dir ./
# Or
AWS_REGION=eu-west-2 npx ampx generate outputs --app-id d1lyo11fq4n49c --branch main --format "json" --out-dir ./
```