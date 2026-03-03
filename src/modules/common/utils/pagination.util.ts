import { PaginationDto } from '../dto/pagination.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate(dto: PaginationDto): { skip: number; take: number } {
  return {
    skip: (dto.page - 1) * dto.limit,
    take: dto.limit,
  };
}
