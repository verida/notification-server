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

        // todo verify signature

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

        return res.status(200).send({
            status: "success",
            data: {
                did,
                context,
                deviceId
            }
        })
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
            const deviceIds = await Db.getDevices(did, context)

            if (deviceIds) {
                console.log('Sending ping to deviceIds: ', deviceIds)
                deviceIds.forEach(deviceId => async () =>  {
                    const success = await Firebase.ping(did, context, deviceId)
                    if (!success) {
                        console.log('deviceId notification failed: ' + deviceId)
                    }
                });
            } else {
                console.log('No deviceIds found')
            }
        } catch (err: any) {
            // don't respond with any error as we don't want the sender
            // to know if a DID does / doesn't have a Vault or any information
            // about this server's internals
            if (err.error != 'not_found') {
                console.error(err)
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