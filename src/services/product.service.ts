import { BaseService } from './base.service';
import { IProductDocument } from '../models/product.model';
import { ProductModel } from '../models/product.model';

export class ProductService extends BaseService<IProductDocument> {
  constructor() {
    super(ProductModel);
  }
}
