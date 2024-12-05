import mongoose, { Schema, Document } from 'mongoose';

export interface IModel extends Document {
  name: number;
  lastName: string | null;
  email: string;
  password: number;
  firstName: string;
}

const UserSchema: Schema = new Schema({
  name: { type: Number, required: true },
  lastName: { type: Number, required: true },
  email: { type: Number, required: true },
  password: { type: Number, required: true },
  firstName: { type: Number, required: true },
});

export const Model = mongoose.model<IModel>('users', UserSchema);
