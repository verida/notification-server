const { cert, initializeApp } = require("firebase-admin/app")
import { messaging } from 'firebase-admin'

export default class Firebase {

    public static _fbInit: boolean = false

    public static async ping(did: string, deviceId: string): Promise<boolean> {
        Firebase.init()

        const message = {
            data: {
                did
            },
            token: deviceId
        }

        try {
            const result = await messaging().send(message)
            console.log(`Firebase pinged for device: ${deviceId} (${did})`)
            return true
        } catch (err: any) {
            if (err.errorInfo && err.errorInfo.message == 'The registration token is not a valid FCM registration token') {
                console.info(`Warning: Device (${deviceId}) for DID (${did}) is not registered with Firebase`)
                return
            }

            console.error(err)
            return false
        }
    }

    public static init() {
        if (!Firebase._fbInit) {
            const fbServiceAccount = require('../' + process.env.FB_CREDS_PATH)

            initializeApp({
                credential: cert(fbServiceAccount)
            })

            Firebase._fbInit = true
        }
    }

}