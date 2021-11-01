import Nano from 'nano'
import admin from 'firebase-admin/app'
import { messaging } from 'firebase-admin'

const fbServiceAccount = require(process.env.FB_CREDS_PATH)

export default class Manager {

    static _couchDb: Nano.ServerScope
    static _fbInit: boolean = false

    public async register(did: string, deviceId: string): Promise<any> {

    }

    public async ping(did: string, messageId: string): Promise<any> {
        Manager.initFirebase()

        // @todo: Lookup the deviceId
        const deviceId = ''

        const message = {
            data: {
                messageId
            },
            token: deviceId
        }

        return await messaging().send(message)
    }

    /**
     * Instantiate a CouchDB instance
     */
     public static getCouch() {
        const dsn = Manager.buildDsn(process.env.DB_USER, process.env.DB_PASS)

        if (!Manager._couchDb) {
            Manager._couchDb = Nano({
                url: dsn,
                requestDefaults: {
                    /* @ts-ignore */
                    rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED_SSL.toLowerCase() != "false"
                }
            })
        }

        return Manager._couchDb
    }

    public static buildDsn(username: string, password: string) {
        const env = process.env
        return env.DB_PROTOCOL + "://" + username + ":" + password + "@" + env.DB_HOST + ":" + env.DB_PORT
    }

    public static initFirebase() {
        if (!Manager._fbInit) {
            admin.initializeApp({
                credential: admin.cert(fbServiceAccount)
            })
        }
    }
}