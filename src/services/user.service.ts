import { BaseService } from './base.service';
import { IUserDocument } from '../models/user.model';
import { UserModel } from '../models/user.model';

export class UserService extends BaseService<IUserDocument> {
  constructor() {
    super(UserModel);
  }
}
