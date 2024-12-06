import { BaseService, IBaseService } from './base.service';
import { IProductDocument } from '../models/product.model';
import { ProductModel } from '../models/product.model';

export interface IProductService extends IBaseService<IProductDocument> {
  findProductsByUserId(userId: string): Promise<IProductDocument[]>
}

export class ProductService extends BaseService<IProductDocument> implements IProductService {
  constructor() {
    super(ProductModel);
  }

  async findProductsByUserId(userId: string): Promise<IProductDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }
}
