
export default class Controller {

    public static async regsiter(req: Request, res: Response) {
        const did = req.query.did
        const 

        if (!req.query.did) {
            return res.status(400).send({
                status: "fail",
                message: "No DID specified"
            })
        }

}