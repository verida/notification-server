import Nano from 'nano'
import EncryptionUtils from '@verida/encryption-utils'

export default class Db {

    static _couchDb: Nano.ServerScope

    public static async saveDevice(deviceId: string, did: string, context: string): Promise<void> {
        const couch = Db.getCouch()
        const db = couch.db.use(process.env.DB_DEVICE_LOOKUP)
        const uniqueId = Db.hash(did, context)

        const data: any = {
            _id: uniqueId,
            context,
            deviceId
        }

        // fetch any existing record and make sure we set the _rev so the
        // existing DID will be updated
        try {
            const existing = await db.get(uniqueId)
            if (existing) {
                data._rev = existing._rev
            }
        } catch (err: any) {
            // Document may not be found, so continue
            if (err.error != 'not_found') {
                // If an unknown error, then send to error log
                throw err
            }
        }

        // save the new record
        const response = await db.insert(data)
        if (!response.ok) {
            throw new Error(`Unable to save DID / Device lookup`)
        }
    }

    public static async getDevice(did: string, context: string): Promise<string | undefined> {
        const couch = Db.getCouch()
        const db = couch.db.use(process.env.DB_DEVICE_LOOKUP)
        const uniqueId = Db.hash(did, context)

        try {
            const doc = await db.get(uniqueId)

            // @ts-ignore
            return doc.deviceId
        } catch (err: any) {
            // Document may not be found, so continue
            if (err.error != 'not_found') {
                // If an unknown error, then send to error log
                throw err
            }

            return
        }
    }

    public static async init(): Promise<void> {
        const couch = Db.getCouch()
        const dbName = process.env.DB_DEVICE_LOOKUP
        
        try {
            await couch.db.create(dbName)
            console.log("Created database: " + dbName)
        } catch (err) {
            console.log("Database existed: " + dbName)
        }
    }

    /**
     * Instantiate a CouchDB instance
     */
     public static getCouch() {
        const dsn = Db.buildDsn(process.env.DB_USER, process.env.DB_PASS)

        if (!Db._couchDb) {
            Db._couchDb = Nano({
                url: dsn,
                requestDefaults: {
                    /* @ts-ignore */
                    rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED_SSL.toLowerCase() != "false"
                }
            })
        }

        return Db._couchDb
    }

    public static buildDsn(username: string, password: string) {
        const env = process.env
        return env.DB_PROTOCOL + "://" + username + ":" + password + "@" + env.DB_HOST + ":" + env.DB_PORT
    }

    public static hash(did: string, context: string): string {
        did = did.toLowerCase()
        return EncryptionUtils.hash(`${did}/${context}`)
    }


}