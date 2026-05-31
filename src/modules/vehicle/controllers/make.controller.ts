import { Request, Response, NextFunction } from "express";
import { makeService } from "../services/make.service";
import { sendSuccess } from "../../../common/utils/apiResponse";

export class MakeController {
    private readonly service = makeService;

    getList = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.getList();

            return sendSuccess(
                res,
                data,
                "Makes retrieved successfully"
            );
        } catch (error) {
            next(error);
        }
    };

    getByName = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.getByName(
                req.params.makeName
            );

            return sendSuccess(
                res,
                data,
                "Make retrieved successfully"
            );
        } catch (error) {
            next(error);
        }
    };
}

export const makeController = new MakeController();