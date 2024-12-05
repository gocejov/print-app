import { BaseController } from './base.controller';
import { IProductDocument } from '../models/product.model';
import { ProductService } from '../services/product.service';

export interface IProductController extends ProductController {
  login(): any
}

export class ProductController extends BaseController<IProductDocument> implements IProductController {
  constructor() {
    super(new ProductService());
  }

  login() {
    throw new Error('Method not implemented.');
  }
}
