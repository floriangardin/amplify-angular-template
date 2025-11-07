## AWS Amplify Angular.js Starter Template

This repository provides a starter template for creating applications using Angular.js and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational Angular.js application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/angular/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

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
npx dotenvx run --env-file=.env.local -- npm run seed:scenarios
```

Inline credentials (any environment):

```bash
SEED_USERNAME="you@example.com" SEED_PASSWORD="yourpassword" npm run seed:scenarios
```

Notes:
- Provide a valid Cognito user with permissions (authenticated users can create/read/delete per schema).
- Make sure `amplify_outputs.json` points to the desired environment (Sandbox running, or correct branch checked out).

## Run sandbox

```bash
npx dotenvx run --env-file=.env.local -- ampx sandbox --stream-function-logs
```


## Configure custom domain

To add to amplify.yml
        - npm run configure:cognito-domain || true