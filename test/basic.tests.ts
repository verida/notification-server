const assert = require("assert")
import Axios from 'axios'
import { Network, EnvironmentType, Context } from '@verida/client-ts'
import { AutoAccount } from '@verida/account-node'

import dotenv from 'dotenv'
dotenv.config()

import Db from '../src/db'

const VERIDA_ENVIRONMENT = EnvironmentType.TESTNET
const VERIDA_TESTNET_DEFAULT_SERVER = 'https://db.testnet.verida.io:5002/'

const SERVER_URL =  process.env.TESTS_SERVER_URL;
//const SERVER_URL = 'https://vpns.testnet.verida.io:5011/'
//const SERVER_URL = 'https://vii2i9go8j.execute-api.us-east-2.amazonaws.com/latest/'

const SENDER_CONTEXT = 'Verida Test: Any sending app'
const SENDER_PRIVATE_KEY = process.env.TESTS_SENDER_PRIVATE_KEY

const RECIPIENT_DID = process.env.TESTS_RECIPIENT_DID

const RECIPIENT_CONTEXT = 'Verida Test: Fake Vault'
const RECIPIENT_DEVICE_ID = 'testDeviceId'
const RECIPIENT_DEVICE_ID2 = 'testDeviceId2'

let context: Context
let SENDER_DID: string
let SENDER_SIG: string

const account = new AutoAccount({
    defaultDatabaseServer: {
        type: 'VeridaDatabase',
        endpointUri: VERIDA_TESTNET_DEFAULT_SERVER
    },
    defaultMessageServer: {
        type: 'VeridaMessage',
        endpointUri: VERIDA_TESTNET_DEFAULT_SERVER
    }
}, {
    privateKey: SENDER_PRIVATE_KEY, 
    environment: VERIDA_ENVIRONMENT
})

const getAxios = async () => {
    const config: any = {
        headers: {
            "context-name": SENDER_CONTEXT,
        },
    }

    if (!context) {
        context = await Network.connect({
            context: {
                name: SENDER_CONTEXT
            },
            client: {
                environment: VERIDA_ENVIRONMENT
            },
            account
        })

        SENDER_DID = (await account.did()).toLowerCase()
        const keyring = await account.keyring(SENDER_CONTEXT)
        SENDER_SIG = await keyring.sign(`Access the notification service using context: "${SENDER_CONTEXT}"?\n\n${SENDER_DID}`)
    }
    
    config["auth"] = {
        username: SENDER_DID.replace(/:/g, "_"),
        password: SENDER_SIG,
    }

    return Axios.create(config)
}

let server: any

describe("Test server", function() {

    describe("Register device functionality", function() {
        this.timeout(100000)
        console.log(`Using SERVER_URL: ${SERVER_URL}`)

        it("Register a new device", async () => {
            server = await getAxios()
            
            const response: any = await server.post(SERVER_URL + 'register', {
                data: {
                    did: RECIPIENT_DID,
                    context: RECIPIENT_CONTEXT,
                    deviceId: RECIPIENT_DEVICE_ID
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })

        it("Register a device with no params", async () => {
            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'register', {
                    data: {
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No DID specified', 'Request has expected message')
        })

        it("Register a device with no DID", async () => {
            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'register', {
                    data: {
                        deviceId: RECIPIENT_DEVICE_ID,
                        context: RECIPIENT_CONTEXT
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No DID specified', 'Request has expected message')
        })

        it("Register a device with no context", async () => {
            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'register', {
                    data: {
                        deviceId: RECIPIENT_DEVICE_ID,
                        did: RECIPIENT_DID
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No context specified', 'Request has expected message')
        })

        it("Register a device with no deviceId", async () => {
            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'register', {
                    data: {
                        did: RECIPIENT_DID,
                        context: RECIPIENT_CONTEXT
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No deviceId specified', 'Request has expected message')
        })

        it("Register the same device again", async () => {
            server = await getAxios()

            const response: any = await server.post(SERVER_URL + 'register', {
                data: {
                    did: RECIPIENT_DID,
                    context: RECIPIENT_CONTEXT,
                    deviceId: RECIPIENT_DEVICE_ID
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')

            const deviceIds = await Db.getDevices(RECIPIENT_DID, RECIPIENT_CONTEXT)
            assert.equal(deviceIds.length, 1, 'A single device is returned')
        })

        it("Register a second device", async () => {
            server = await getAxios()

            const response: any = await server.post(SERVER_URL + 'register', {
                data: {
                    did: RECIPIENT_DID,
                    context: RECIPIENT_CONTEXT,
                    deviceId: RECIPIENT_DEVICE_ID2
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')

            const deviceIds = await Db.getDevices(RECIPIENT_DID, RECIPIENT_CONTEXT)
            assert.equal(deviceIds.length, 2, 'Two devices are returned')
            assert.ok(deviceIds.indexOf(RECIPIENT_DEVICE_ID) != -1, 'Device1 found')
            assert.ok(deviceIds.indexOf(RECIPIENT_DEVICE_ID2) != -1, 'Device2 found')
        })

        it("Unregister the second device", async () => {
            server = await getAxios()

            const response: any = await server.post(SERVER_URL + 'unregister', {
                data: {
                    did: RECIPIENT_DID,
                    context: RECIPIENT_CONTEXT,
                    deviceId: RECIPIENT_DEVICE_ID2
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')

            const deviceIds = await Db.getDevices(RECIPIENT_DID, RECIPIENT_CONTEXT)
            assert.equal(deviceIds.length, 1, 'One device is returned')
            assert.ok(deviceIds.indexOf(RECIPIENT_DEVICE_ID) != -1, 'Device1 found')
        })

        it("Unregister invalid device", async () => {
            server = await getAxios()

            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'unregister', {
                    data: {
                        did: RECIPIENT_DID,
                        context: RECIPIENT_CONTEXT,
                        deviceId: 'akldajfklajdkfl'
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            const response = result.response

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'fail', 'Have a failure response')
        })
    })

    describe("Ping device functionality", function() {
        this.timeout(100000)

        it("Ping a valid device", async () => {
            const response = await server.post(SERVER_URL + 'ping', {
                data: {
                    did: RECIPIENT_DID,
                    context: RECIPIENT_CONTEXT
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })

        it("Ping an invalid device DID", async () => {
            const response = await server.post(SERVER_URL + 'ping', {
                data: {
                    did: 'adxfadfadadxf',
                    context: RECIPIENT_CONTEXT
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })
    });

});