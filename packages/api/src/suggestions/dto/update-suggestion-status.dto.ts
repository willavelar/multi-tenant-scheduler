import { IsEnum } from 'class-validator';

export class UpdateSuggestionStatusDto {
  @IsEnum(['new', 'resolved'])
  status!: 'new' | 'resolved';
}
