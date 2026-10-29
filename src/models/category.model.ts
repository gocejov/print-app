import mongoose, { Schema, Document } from 'mongoose'

export interface ICategoryDocument extends Document {
  name: string
  description: string
  products: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}
const schema = new Schema<ICategoryDocument>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  products: [{ type: Schema.Types.ObjectId, ref: 'products' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})
export const CategoryModel = mongoose.model<ICategoryDocument>('categories', schema)
