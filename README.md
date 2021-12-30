
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

Open `.env` to specify the CouchDB database connection details, Firebase credentials path and other useful options

### Starting

Start the server by running `yarn run start`

## Tests

Run the tests with `yarn run tests`

## Limitations

- Only one notification server can be allocated to an application context (a current limitation of the `DID Registry` and `client-ts` library)

## @TODO:

- Need to support application context notifications, not did notifications
- Add verifying (see @todo)