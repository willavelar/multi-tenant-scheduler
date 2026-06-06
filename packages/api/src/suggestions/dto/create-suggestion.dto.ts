import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// base64 of ~2MB ≈ 2.8M chars; cap the data URL length to bound payload size.
const MAX_IMAGE_CHARS = 2_800_000;

export class CreateSuggestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_IMAGE_CHARS)
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, {
    message: 'image must be a base64 image data URL',
  })
  image?: string;
}
