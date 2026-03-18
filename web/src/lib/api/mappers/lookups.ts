import type {
  CategoriesResponseDto,
  GroupsResponseDto,
  LookupGroupDto,
  LocationsResponseDto,
  LookupCategoryDto,
  LookupLocationDto,
  LookupNamedOptionDto,
  LookupTechnicianDto,
  ManufacturersResponseDto,
  ModelsResponseDto,
  StatesResponseDto,
  TechniciansResponseDto,
  UsersResponseDto,
} from "../contracts/lookups";
import type { LookupOption, TechnicianOption, UserOption } from "../models/lookups";

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

function mapLookupUserDto(dto: LookupTechnicianDto): UserOption {
  return {
    id: dto.id,
    name: dto.name,
    login: dto.login,
    label: dto.name || dto.login,
  };
}

function normalizeNamedOption(name: string | null | undefined, id: number): string {
  const trimmed = (name || "").trim();
  return trimmed || `Sem nome (#${id})`;
}

function mapNamedOptionDto(dto: LookupNamedOptionDto): LookupOption {
  const name = normalizeNamedOption(dto.name, dto.id);
  return {
    id: dto.id,
    name,
    label: name,
  };
}

function disambiguateDuplicatedLabels(options: LookupOption[]): LookupOption[] {
  const counts = new Map<string, number>();
  for (const option of options) {
    counts.set(option.label, (counts.get(option.label) || 0) + 1);
  }

  return options.map((option) => {
    if ((counts.get(option.label) || 0) <= 1) {
      return option;
    }
    return {
      ...option,
      label: `${option.label} (#${option.id})`,
    };
  });
}

function mapLookupGroupDto(dto: LookupGroupDto): LookupOption {
  return {
    id: dto.id,
    name: dto.name,
    completename: dto.completename,
    label: dto.completename || dto.name,
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

export function mapUsersResponseDto(dto: UsersResponseDto): UserOption[] {
  return dto.users.map(mapLookupUserDto);
}

export function mapStatesResponseDto(dto: StatesResponseDto): LookupOption[] {
  return disambiguateDuplicatedLabels(dto.states.map(mapNamedOptionDto));
}

export function mapManufacturersResponseDto(dto: ManufacturersResponseDto): LookupOption[] {
  return dto.manufacturers.map(mapNamedOptionDto);
}

export function mapGroupsResponseDto(dto: GroupsResponseDto): LookupOption[] {
  return dto.groups.map(mapLookupGroupDto);
}

export function mapModelsResponseDto(dto: ModelsResponseDto): LookupOption[] {
  return dto.models.map(mapNamedOptionDto);
}
