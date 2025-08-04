import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  Query, 
  ParseIntPipe, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
    private readonly responseService: ResponseService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review for a submitted session' })
  @ApiResponse({ status: 201, description: 'Review created successfully', type: ReviewResponseDto })
  async createReview(
    @Request() req,
    @Body() createReviewDto: CreateReviewDto
  ) {
    const review = await this.reviewsService.createReview(req.user.userId, createReviewDto);
    return this.responseService.success({ review }, 'Review created successfully');
  }

  @Get(':reviewId')
  @ApiOperation({ summary: 'Get review details' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully', type: ReviewResponseDto })
  async getReview(@Param('reviewId', ParseIntPipe) reviewId: number) {
    const review = await this.reviewsService.getReview(reviewId);
    return this.responseService.success({ review }, 'Review retrieved successfully');
  }

  @Put(':reviewId')
  @ApiOperation({ summary: 'Update an existing review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully', type: ReviewResponseDto })
  async updateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() updateReviewDto: UpdateReviewDto
  ) {
    const review = await this.reviewsService.updateReview(reviewId, updateReviewDto);
    return this.responseService.success({ review }, 'Review updated successfully');
  }

  @Get('my-reviews')
  @ApiOperation({ summary: 'Get reviews created by the current reviewer' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully', type: ReviewListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
  async getMyReviews(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ReviewStatus
  ) {
    const reviews = await this.reviewsService.getReviewsForReviewer(
      req.user.userId,
      page,
      limit,
      status
    );
    return this.responseService.success(reviews, 'Reviews retrieved successfully');
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending reviews that need to be assigned' })
  @ApiResponse({ status: 200, description: 'Pending reviews retrieved successfully', type: ReviewListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const reviews = await this.reviewsService.getPendingReviews(page, limit);
    return this.responseService.success(reviews, 'Pending reviews retrieved successfully');
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get review statistics overview' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getReviewStats() {
    const stats = await this.reviewsService.getReviewStats();
    return this.responseService.success({ stats }, 'Review statistics retrieved successfully');
  }
}
