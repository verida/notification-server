import { Request, Response } from 'express'
import Db from './db'
import Firebase from './firebase'

export default class Controller {

    /**
     * Register a DID and DeviceID listener
     * 
     * @param req 
     * @param res 
     * @returns 
     */
    public static async register(req: Request, res: Response): Promise<Response> {
        const did = <string> req.body.data.did
        const context = <string> req.body.data.context
        const deviceId = <string> req.body.data.deviceId        
        try {
            console.log(`registering DID: ${did}, context: ${context}, deviceId: ${deviceId}`)

            // @todo verify signature

            if (!did) {
                return res.status(400).send({
                    status: "fail",
                    message: "No DID specified"
                })
            }

            if (!context) {
                return res.status(400).send({
                    status: "fail",
                    message: "No context specified"
                })
            }

            if (!deviceId) {
                return res.status(400).send({
                    status: "fail",
                    message: "No deviceId specified"
                })
            }

            // Save deviceId and DID mapping
            await Db.saveDevice(deviceId, did, context)

            console.log(`registration success for DID: ${did}, context: ${context}, deviceId: ${deviceId}`)

            return res.status(200).send({
                status: "success",
                data: {
                    did,
                    context,
                    deviceId
                }
            })
        } catch(e: unknown) {
            let msg = null
            if (typeof e === "string") {
                msg = e
            } else if (e instanceof Error) {
                msg = e.message
                console.log(e.stack)
            }

            console.log(`ERROR registering for notificaiton. DID: ${did}, context: ${context}, deviceId: ${deviceId}`)
            console.log(msg)

            return res.status(500).send( {
                status: "error",
                data: {error: msg}
            })
        }
    }

    public static async unregister(req: Request, res: Response): Promise<Response> {
        const did = <string> req.body.data.did
        const context = <string> req.body.data.context
        const deviceId = <string> req.body.data.deviceId

        // @todo verify signature
        console.log(`unregistering DID: ${did}, context: ${context}, deviceId: ${deviceId}`)

        if (!did) {
            return res.status(400).send({
                status: "fail",
                message: "No DID specified"
            })
        }

        if (!context) {
            return res.status(400).send({
                status: "fail",
                message: "No context specified"
            })
        }

        if (!deviceId) {
            return res.status(400).send({
                status: "fail",
                message: "No deviceId specified"
            })
        }

        // Remove deviceId
        const success = await Db.removeDevice(deviceId, did, context)

        if (success) {
            console.log('a')
            return res.status(200).send({
                status: "success",
                data: {
                    did,
                    context,
                    deviceId
                }
            })
        } else {
            console.log('b')
            return res.status(400).send({
                status: "fail",
                message: "Invalid deviceId"
            })
        }
    }

    /**
     * Ping a DID to force the notification listener application (Vault in our case) to reload it's inbox
     * 
     * @param req 
     * @param res 
     * @returns 
     */
    public static async ping(req: Request, res: Response): Promise<Response> {
        const did = <string> req.body.data.did
        const context = <string> req.body.data.context

        if (!did) {
            return res.status(400).send({
                status: "fail",
                message: "No DID specified"
            })
        }

        if (!context) {
            return res.status(400).send({
                status: "fail",
                message: "No context specified"
            })
        }

        try {
            console.log(`Looking up deviceIds for DID: ${did} and context: ${context}`)
            const deviceIds = await Db.getDevices(did, context)
            try {
                if (deviceIds) {
                    console.log(`Sending ping to deviceIds: :- ${deviceIds}`);

                    for(const deviceId of deviceIds) {
                        const success = await Firebase.ping(did, context, deviceId);
                        if (!success) {
                            console.log(`deviceId notification failed :- ${deviceId}`);
                        }
                    }
                } else {
                    console.log('No deviceIds found')
                }
            } catch (err: any) {
                // if the error is "not found" then we swallow the error so we
                // don't give away if the DID does/doesn't have a vault
                if (err.error != 'not_found') {
                    // the error WAS NOT "not found" so throw
                    // log this below in the catch around all this
                    throw err
                } else {
                    console.log(`There was an error pinging at least one of these DIDs: ${deviceIds}`)
                }
            }
        } catch (err: any) {
            // if the error is "not found" then we swallow the error so we
            // don't give away if the DID does/doesn't have a vault            
            if (err.error != 'not_found') {
                console.error(err)
                throw err
            }
        }

        return res.status(200).send({
            status: "success",
            data: {
                did
            }
        });
    }

}