import { FileModel, IFile } from '../models/file.model';
import { IUser, IUserDocument } from '../models/user.model';
import { FileService, IFileService } from '../services/file.service';
import { UserService, IUserService } from '../services/user.service';
import { Request, Response } from 'express';

export interface IUploadController extends UploadController { }

export class UploadController implements IUploadController {

  private fileService: IFileService;
  private userService: IUserService;

  constructor() {
    this.fileService = new FileService()
    this.userService = new UserService()
  }

  async videoUpload(req: any, res: Response) {
    const { uid } = req.params

    try {
      const user: IUserDocument | null = await this.userService.findById(uid)

      if (!user) {
        res.status(404).json({ error: "User does not exist" });
        return
      }

      const fileData: IFile = {
        url: req.file?.filename,
        mimetype: req.file?.mimetype,
        file: JSON.stringify(req.file),
        type: 'video',
        fieldname: req.file?.fieldname,
        originalname: req.file?.originalname,
        encoding: req.file?.encoding,
        destination: req.file?.destination,
        filename: req.file?.filename,
        path: req.file?.path,
        size: req.file?.size,
        createdBy: user.id,
        baseUrl: `${req.protocol}://${req.get('host')}`
      }

      const file = await this.fileService.add(new FileModel(fileData))

      res.status(200).json({ message: 'Video uploaded successfully', file: file });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
