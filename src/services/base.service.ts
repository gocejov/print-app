import mongoose, { Model, Document } from 'mongoose';


export interface IBaseService<T> {
  getAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
  add(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T | null>
  remove(id: string): Promise<T | null>
}

export class BaseService<T extends Document> implements IBaseService<T> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async getAll(): Promise<T[]> {
    return this.model.find();
  }

  async findById(id: string): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model.findById(id);
  }

  async add(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model.findByIdAndDelete(id);
  }
}
