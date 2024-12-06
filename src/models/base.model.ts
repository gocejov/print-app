import { Schema, Document } from 'mongoose';

export interface IModel extends Document {
  created_at: Date;
  updated_at: Date;
}

export const BaseSchema: Schema = new Schema({
  updated_at: { type: Date, required: true },
  created_at: { type: Date, required: true },
});

