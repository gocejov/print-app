import { Request, Response } from 'express';
export interface IUploadController extends UploadController { }

export class UploadController implements IUploadController {
  constructor() {

  }

  videoUpload(req: Request, res: Response) {
    try {
      res.status(200).json({ message: 'Video uploaded successfully', file: req.file });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
