import { FileModel, IFileDocument } from '../models/file.model';
import { BaseService } from './base.service';

export class FileService extends BaseService<IFileDocument> {
  constructor() {
    super(FileModel);
  }
}
