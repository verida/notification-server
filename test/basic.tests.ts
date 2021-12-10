const assert = require("assert")
import axios from 'axios'

const SERVER_URL = 'http://localhost:5011/'
const DID = 'did:vda:0x6B2a1bE81ee770cbB4648801e343E135e8D2Aa6F'
const DEVICE_ID = 'testDeviceId'

describe("Test server", function() {

    describe("Basic functionality", function() {

        it("Register a new device", async () => {
            const response = await axios.post(SERVER_URL + 'register', {
                data: {
                    did: DID,
                    deviceId: DEVICE_ID
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })

        it("Register a device with no params", async () => {
            const promise = new Promise((resolve, rejects) => {
                axios.post(SERVER_URL + 'register', {
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
                axios.post(SERVER_URL + 'register', {
                    data: {
                        deviceId: DEVICE_ID
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No DID specified', 'Request has expected message')
        })

        it("Register a device with no deviceId", async () => {
            const promise = new Promise((resolve, rejects) => {
                axios.post(SERVER_URL + 'register', {
                    data: {
                        did: DID
                    }
                }).then(rejects, resolve)
            })

            const result: any = await promise
            assert.equal(result.response.data.status, 'fail', 'Request failed')
            assert.equal(result.response.data.message, 'No deviceId specified', 'Request has expected message')
        })

        it("Ping a valid device", async () => {
            const response = await axios.post(SERVER_URL + 'ping', {
                data: {
                    did: DID
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })

        it("Ping an invalid device", async () => {
            const response = await axios.post(SERVER_URL + 'ping', {
                data: {
                    did: 'adxfadfadadxf'
                }
            })

            assert.ok(response && response.data, 'Have a valid response')
            assert.equal(response.data.status, 'success', 'Have a success response')
        })
    });

});