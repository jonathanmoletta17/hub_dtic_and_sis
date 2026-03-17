import type {
  CategoriesResponseDto,
  LocationsResponseDto,
  LookupCategoryDto,
  LookupLocationDto,
  LookupTechnicianDto,
  TechniciansResponseDto,
} from "../contracts/lookups";
import type { LookupOption, TechnicianOption } from "../models/lookups";

function mapLookupLocationDto(dto: LookupLocationDto): LookupOption {
  return {
    id: dto.id,
    name: dto.name,
    completename: dto.completename,
    label: dto.completename || dto.name,
  };
}

function mapLookupCategoryDto(dto: LookupCategoryDto): LookupOption {
  return {
    id: dto.id,
    name: dto.name,
    completename: dto.completename,
    label: dto.completename || dto.name,
  };
}

function mapLookupTechnicianDto(dto: LookupTechnicianDto): TechnicianOption {
  return {
    id: dto.id,
    name: dto.name,
    login: dto.login,
    label: dto.name || dto.login,
  };
}

export function mapLocationsResponseDto(dto: LocationsResponseDto): LookupOption[] {
  return dto.locations.map(mapLookupLocationDto);
}

export function mapCategoriesResponseDto(dto: CategoriesResponseDto): LookupOption[] {
  return dto.categories.map(mapLookupCategoryDto);
}

export function mapTechniciansResponseDto(dto: TechniciansResponseDto): TechnicianOption[] {
  return dto.technicians.map(mapLookupTechnicianDto);
}
