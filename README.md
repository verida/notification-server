# Verida Notification Server

This is a notification server to facilitate sending push notifications to users of the `Verida Vault`.

## How it works

The `Verida Vault` mobile application is responsible for managing `Verida Account`'s within the application. Each account has a `DID Document` (stored in the Verida `DID Registry`) containing a list of `Application Contexts` for that user.

Each `Application Context` can register a `Notification Server`. The `Verida Vault` facilitates this when it creates a new `Application Context` when an account authenticates with an `Application Context` for the first time (via the Verida `Single Sign On` protocol).

As such, when the `Verida Vault` creates a new `Application Context` for a `Verida Account`, it performs the following steps:

1. Adds an entry in the `DID Document` that links an `Application Context` to a `Notification Server` (by URL)
2. Registers the DID and application context with the `Notification Server` by submitting a request to the `/register` endpoint. This registration process includes a `deviceId` that can be used to send push notifications to that device in the future.

The Verida [client-ts library](https://github.com/verida/verida-js/tree/main/packages/client-ts) is used by applications on the Verida network. This library ensures the `Notification Server` `/ping` endpoint is called whenever a new message is sent to a `Verida Account` `Application Context`.

The `Notification Server` accepts the `ping` request and:

1. Locates the `deviceId` associated with the `DID` and `Application Context`
2. Sends a background push notification to the specified `deviceId`

The `Verida Vault` accepts this background push notification and forces a reloading of the inbox for the given `DID` in the application.

## Running the server

The server requires access to a CouchDB server. This server maintains state information that links a `DID`, `Application Context` and a `deviceId`.

The server uses Firebase to manage push notifications.

### Configuration

- Copy `sample.env` to `.env` and replace the sample values with real values.
- You will need `verida-vault-fb-key.json` in the root directory. A copy of this file exists in BitWarden (name = "Notification Server verida-vault-fb-key.json")
- For deployment, `.env.prod.json` must exist. See Deployment section below.



Open `.env` to specify the CouchDB database connection details, Firebase credentials path and other useful options

### Starting

Start the server locally by running `yarn run start`

The testnet installation is documented in the [infrastructure project](https://github.com/verida/infrastructure/blob/develop/notification_server.md)

## Tests

Run the tests with `yarn run tests`

## Deployment

### Lambda deployment

We use [Claudia.js](https://claudiajs.com/) to turn our Express app into an Express-on-Lambda app.

Before doing any Lambda deployments you **MUST** translate your `.env` file (or one for production) to JSON as `.env.prod.json`.
See the [Claudia Docs for information](https://claudiajs.com/news/2016/11/24/claudia-2.2.0-environment-vars.html).

A copy of `.env.prod.json` for this deployment is in BitWarden (name= "Notification Server .env.prod.json") but is **NOT** checked into Github. 

You will need your [`AWS_PROFILE` set](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html). There are many ways to do this, but a simple one is:
```
export AWS_PROFILE=verida-dev (or AWS_PROFILE=verida-dev for prod)
```

First time deployment can be done using:

```
yarn acacia-lambda-deploy (acacia testnet)

or

yarn lambda-deploy (prod)
```

This does the following:

- Create the Lambda (in us-east-2)
- Create an (Edge) API Gateway pointing at it

For brand new deployments, you will need to setup DNS and CloudWatch logging manually.

- Prod API Gateway log role ARN should be set to `arn:aws:iam::131554244047:role/APIGatewayLoggingRole` for the logging to work
- Acacia API Gateway log role ARM should be set to `arn:aws:iam::737954963756:role/apiGatewayLogs` 

You should also increase the Lambda timeout to 20 seconds. 


Updates can be done using:

```
yarn acacia-lambda-update (acacia testnet)

or

yarn lambda-update (prod)
```

This uploads a new version of the code to the existing lambda.

The command `yarn lambda-pack` exists to build a local zip file which can be helpful for debugging packaging issues.


### Non Lambda (old) deployment

See https://github.com/verida/infrastructure/blob/develop/notification_server.md

Logs are available on CloudWatch. See the link above for more information.

## Limitations

- Only one notification server can be allocated to an application context (a current limitation of the `DID Registry` and `client-ts` library)

## @TODO:

- Add verifying (see @todo)
