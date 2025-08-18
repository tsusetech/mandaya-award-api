import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseService {
  success<T>(
    data: T,
    message: string = 'Success',
    path: string = '',
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  error(message: string, error?: string, path: string = ''): ApiResponse {
    return {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
    };
  }
}
