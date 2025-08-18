import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewStatus } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewListResponseDto } from './dto/review-list.dto';
import { ResponseService } from '../common/services/response.service';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review for a submitted session' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    const review = await this.reviewsService.createReview(
      req.user.userId,
      createReviewDto,
    );
    return this.responseService.success(
      { review },
      'Review created successfully',
    );
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get review details for a session' })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  async getReview(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const review = await this.reviewsService.getReview(sessionId);
    return this.responseService.success(
      { review },
      'Review retrieved successfully',
    );
  }

  @Put('session/:sessionId')
  @ApiOperation({ summary: 'Update an existing review for a session' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  async updateReview(
    @Request() req,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const review = await this.reviewsService.updateReview(
      req.user.userId,
      sessionId,
      updateReviewDto,
    );
    return this.responseService.success(
      { review },
      'Review updated successfully',
    );
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Delete a review for a session' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  async deleteReview(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const result = await this.reviewsService.deleteReview(sessionId);
    return this.responseService.success(result, 'Review deleted successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'reviewerId', required: false, type: Number })
  @ApiQuery({ name: 'stage', required: false, type: String })
  @ApiQuery({ name: 'decision', required: false, type: String })
  async getReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('reviewerId') reviewerId?: number,
    @Query('stage') stage?: string,
    @Query('decision') decision?: string,
  ) {
    const paginationQuery = { page, limit };
    const filters = { status, reviewerId, stage, decision };
    const reviews = await this.reviewsService.getReviews(
      paginationQuery,
      filters,
    );
    return this.responseService.success(
      reviews,
      'Reviews retrieved successfully',
    );
  }

  @Get('session/:sessionId/status')
  @ApiOperation({ summary: 'Check if a session has a review' })
  @ApiResponse({
    status: 200,
    description: 'Review status checked successfully',
  })
  async hasReview(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const hasReview = await this.reviewsService.hasReview(sessionId);
    return this.responseService.success(
      { hasReview },
      'Review status checked successfully',
    );
  }

  @Get('session/:sessionId/review-status')
  @ApiOperation({ summary: 'Get the review status for a session' })
  @ApiResponse({
    status: 200,
    description: 'Review status retrieved successfully',
  })
  async getReviewStatus(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const status = await this.reviewsService.getReviewStatus(sessionId);
    return this.responseService.success(
      { status },
      'Review status retrieved successfully',
    );
  }
}
