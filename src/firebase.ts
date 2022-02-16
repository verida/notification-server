const { cert, initializeApp } = require("firebase-admin/app")
import {messaging} from 'firebase-admin'
import {Message} from 'firebase-admin/lib/messaging/messaging-api'

export default class Firebase {

    public static _fbInit: boolean = false

    public static async ping(did: string, context: string, deviceId: string): Promise<boolean> {
        Firebase.init()
        const message: Message = {
            data: {
                did,
                context
            },
            token: deviceId,
            android: {
                priority: 'high'
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true
                    }
                },
                headers: {
                    'apns-push-type': 'background',
                    'apns-priority': '5',
                    'apns-topic': process.env.VAULT_APP_ID
                },
            }
        }

        try {
            const result = await messaging().send(message)
            console.log(`Firebase pinged for device: ${deviceId} (${did})`);
            console.log(`Firebase response:- ${result}`);
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
            try {
                const fbServiceAccount = require('../' + process.env.FB_CREDS_PATH)

                initializeApp({
                    credential: cert(fbServiceAccount)
                })
    
                Firebase._fbInit = true
            } catch (e: unknown) {
                if (e instanceof Error ) {
                    console.trace(e)
                }

                throw e
            }

        }
    }

}
