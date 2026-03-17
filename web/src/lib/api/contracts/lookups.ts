export interface LookupLocationDto {
  id: number;
  name: string;
  completename: string;
}

export interface LookupCategoryDto {
  id: number;
  name: string;
  completename: string;
}

export interface LookupTechnicianDto {
  id: number;
  name: string;
  login: string;
}

export interface LocationsResponseDto {
  context: string;
  locations: LookupLocationDto[];
}

export interface CategoriesResponseDto {
  context: string;
  categories: LookupCategoryDto[];
}

export interface TechniciansResponseDto {
  context: string;
  technicians: LookupTechnicianDto[];
}

export type LookupSource = "locations" | "itilcategories" | "users";
