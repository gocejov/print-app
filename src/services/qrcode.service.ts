import { QrCodeModel, IQrCodeDocument } from '../models/qrcode.model';
import { BaseService, IBaseService } from './base.service';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';

export interface IQrCodeServie extends IBaseService<IQrCodeDocument> {
  findQrCodesByUserId(userId: string): Promise<IQrCodeDocument[]>
  generateQrCodeBase64Url(id: string, qrCodeOptions?: Object | null): Promise<String | null>
}

export class QrCodeService extends BaseService<IQrCodeDocument> implements IQrCodeServie {
  constructor() {
    super(QrCodeModel);
  }

  async findQrCodesByUserId(userId: string): Promise<IQrCodeDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }

  async generateQrCodeBase64Url(url: string, qrCodeOptions: Object | null = null): Promise<String | null> {

    // errorCorrectionLevel: 'L', // High error correction level (L, M, Q, H)
    // width: 500,               // Size in pixels

    const options: Object = qrCodeOptions ? qrCodeOptions : { errorCorrectionLevel: 'Q', width: 2024, };

    try {
      const qrCodeDataBuffer: any = await QRCode.toBuffer(url, options);

      const logoPath = './uploads/images/qr2share-logo-circle.png';
      const logoBuffer = await fs.readFile(logoPath);

      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize({
          width: 100,  // Adjust as needed (20% of QR size)
          height: 100, // Adjust to maintain aspect ratio
          fit: sharp.fit.inside,
        })
        .toBuffer();

      const qrWithLogoBuffer: Buffer = await sharp(qrCodeDataBuffer)
        .composite([
          {
            input: resizedLogoBuffer,
            gravity: 'center', // Center the logo on the QR code
          },
        ])
        .png()
        .toBuffer();

      // Step 4: Convert the Final QR Code to Base64
      return `data:image/png;base64,${qrWithLogoBuffer.toString('base64')}`;
    } catch (err) {
      console.error('Error generating QR code:', err);
      throw err
    }
  }

}
