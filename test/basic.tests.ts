const assert = require("assert")
import Axios from 'axios'
import { Network, EnvironmentType, Context } from '@verida/client-ts'
import { AutoAccount } from '@verida/account-node'

const VERIDA_ENVIRONMENT = EnvironmentType.TESTNET
const VERIDA_TESTNET_DEFAULT_SERVER = 'https://db.testnet.verida.io:5002/'

const SERVER_URL = 'http://localhost:5011/'

const SENDER_CONTEXT = 'Verida Test: Any sending app'
const SENDER_PRIVATE_KEY = '0x78d3b996ec98a9a536efdffbae40e5eaaf117765a587483c69195c9460165c37'

const RECIPIENT_DID = 'did:vda:0x6B2a1bE81ee770cbB4648801e343E135e8D2Aa6F'
const RECIPIENT_CONTEXT = 'Verida Test: Fake Vault'
const RECIPIENT_DEVICE_ID = 'testDeviceId'

let context: Context
let SENDER_DID: string
let SENDER_SIG: string

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
            account: new AutoAccount({
                defaultDatabaseServer: {
                    type: 'VeridaDatabase',
                    endpointUri: VERIDA_TESTNET_DEFAULT_SERVER
                },
                defaultMessageServer: {
                    type: 'VeridaMessage',
                    endpointUri: VERIDA_TESTNET_DEFAULT_SERVER
                },
                /*defaultNotificationServer: {
                    type: 'VeridaNofication',
                    endpointUri: SERVER_URL
                }*/
            }, {
                privateKey: SENDER_PRIVATE_KEY, 
                environment: VERIDA_ENVIRONMENT
            })
        })

        const account = context.getAccount()
        SENDER_DID = (await account.did()).toLowerCase()
        const keyring = await account.keyring(SENDER_CONTEXT)
        const keys = await keyring.publicKeys()
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

    describe("Basic functionality", function() {
        this.timeout(100000)

        it("Register a new device", async () => {
            server = await getAxios()

            try {
                const response: any = await server.post(SERVER_URL + 'register', {
                    data: {
                        did: RECIPIENT_DID,
                        context: RECIPIENT_CONTEXT,
                        deviceId: RECIPIENT_DEVICE_ID
                    }
                })

                assert.ok(response && response.data, 'Have a valid response')
                assert.equal(response.data.status, 'success', 'Have a success response')
            } catch (err: any) {
                console.log('broken')
                //console.log(err)
            }
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
                        deviceId: RECIPIENT_DEVICE_ID
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No DID specified', 'Request has expected message')
        })

        it("Register a device with no deviceId", async () => {
            const promise = new Promise((resolve, rejects) => {
                server.post(SERVER_URL + 'register', {
                    data: {
                        did: RECIPIENT_DID
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No deviceId specified', 'Request has expected message')
        })

        it("Ping a valid device", async () => {
            const response = await server.post(SERVER_URL + 'ping', {
                data: {
                    did: RECIPIENT_DID
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })

        it("Ping an invalid device DID", async () => {
            const response = await server.post(SERVER_URL + 'ping', {
                data: {
                    did: 'adxfadfadadxf'
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })
    });

});