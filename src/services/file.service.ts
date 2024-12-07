import { FileModel, IFileDocument } from '../models/file.model';
import { BaseService, IBaseService } from './base.service';

export interface IFileService extends IBaseService<IFileDocument> {
  findFilesByUserId(userId: string): Promise<IFileDocument[]>
}

export class FileService extends BaseService<IFileDocument> implements IFileService {
  constructor() {
    super(FileModel);
  }

  async findFilesByUserId(userId: string): Promise<IFileDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }

}
