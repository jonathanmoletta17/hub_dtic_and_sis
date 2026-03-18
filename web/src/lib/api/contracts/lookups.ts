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

export interface LookupNamedOptionDto {
  id: number;
  name: string;
}

export interface LookupGroupDto {
  id: number;
  name: string;
  completename: string;
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

export interface UsersResponseDto {
  context: string;
  users: LookupTechnicianDto[];
}

export interface StatesResponseDto {
  context: string;
  states: LookupNamedOptionDto[];
}

export interface ManufacturersResponseDto {
  context: string;
  manufacturers: LookupNamedOptionDto[];
}

export interface GroupsResponseDto {
  context: string;
  groups: LookupGroupDto[];
}

export interface ModelsResponseDto {
  context: string;
  itemtype: string;
  models: LookupNamedOptionDto[];
}

export type LookupSource =
  | "locations"
  | "itilcategories"
  | "users"
  | "responsible-users"
  | "states"
  | "manufacturers"
  | "groups"
  | "models";
