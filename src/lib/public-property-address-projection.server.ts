export type PublicAddressMode = "hidden" | "street" | "full";

export type PublicPropertyAddressProjection = {
  public_address_mode: PublicAddressMode;
  public_location_label: string | null;
  public_map_query: string | null;
  public_street: string | null;
  public_number: string | null;
  public_complement: string | null;
  public_postal_code: string | null;
  public_city: string | null;
  public_state: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
};

const RAW_ADDRESS_KEYS = [
  "endereco",
  "rua",
  "numero",
  "complemento",
  "cep",
  "latitude",
  "longitude",
  "mostrar_rua",
  "mostrar_endereco_completo",
] as const;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function relationName(value: unknown): string | null {
  if (Array.isArray(value)) return relationName(value[0]);
  if (!value || typeof value !== "object") return null;
  return cleanText((value as Record<string, unknown>).nome);
}

function coordinate(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function join(parts: Array<string | null>, separator: string): string | null {
  const accepted = parts.filter((part): part is string => Boolean(part));
  return accepted.length > 0 ? accepted.join(separator) : null;
}

function withoutRawAddress(row: Record<string, any>): Record<string, any> {
  const safe = { ...row };
  for (const key of RAW_ADDRESS_KEYS) delete safe[key];
  for (const key of [
    "public_address_mode",
    "public_location_label",
    "public_map_query",
    "public_street",
    "public_number",
    "public_complement",
    "public_postal_code",
    "public_city",
    "public_state",
    "public_latitude",
    "public_longitude",
  ]) {
    delete safe[key];
  }
  return safe;
}

function hiddenProjection(input: {
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}): PublicPropertyAddressProjection {
  const approximate = join([input.bairro, input.cidade, input.estado], ", ");
  return {
    public_address_mode: "hidden",
    public_location_label: approximate,
    public_map_query: approximate,
    public_street: null,
    public_number: null,
    public_complement: null,
    public_postal_code: null,
    public_city: input.cidade,
    public_state: input.estado,
    public_latitude: null,
    public_longitude: null,
  };
}

/**
 * Projects the public property address before serialization.
 *
 * The function creates a new DTO and removes every raw address/visibility field.
 * Unknown flags, missing street authority and inconsistent values fail closed to
 * the approximate `hidden` mode. Exact coordinates are serialized only in
 * `full` mode and only when the pair is valid.
 */
export function projectPublicPropertyAddress(
  row: Record<string, any>,
): Record<string, any> & PublicPropertyAddressProjection {
  const safe = withoutRawAddress(row);
  const neighborhood = Array.isArray(row.bairro) ? row.bairro[0] : row.bairro;
  const neighborhoodObject =
    neighborhood && typeof neighborhood === "object"
      ? (neighborhood as Record<string, unknown>)
      : null;
  const cityRelation = Array.isArray(neighborhoodObject?.cidade)
    ? neighborhoodObject?.cidade[0]
    : neighborhoodObject?.cidade;
  const cityObject =
    cityRelation && typeof cityRelation === "object"
      ? (cityRelation as Record<string, unknown>)
      : null;

  const bairro = relationName(neighborhoodObject);
  const cidade = cleanText(row.cidade) ?? relationName(cityObject);
  const estado = cleanText(row.estado) ?? cleanText(cityObject?.estado);

  const hidden = hiddenProjection({ bairro, cidade, estado });
  const fullRequested = row.mostrar_endereco_completo === true;
  const streetRequested = row.mostrar_rua === true;
  const street = cleanText(row.rua);
  const legacyAddress = cleanText(row.endereco);

  if (fullRequested) {
    const authorizedStreet = street ?? legacyAddress;
    if (!authorizedStreet) return { ...safe, ...hidden };

    const number = cleanText(row.numero);
    const complement = cleanText(row.complemento);
    const postalCode = cleanText(row.cep);
    const latitude = coordinate(row.latitude, -90, 90);
    const longitude = coordinate(row.longitude, -180, 180);
    const latitudeSupplied =
      row.latitude !== null && row.latitude !== undefined && row.latitude !== "";
    const longitudeSupplied =
      row.longitude !== null && row.longitude !== undefined && row.longitude !== "";
    const coordinateInputPresent = latitudeSupplied || longitudeSupplied;
    const exactCoordinates = latitude !== null && longitude !== null;
    if (coordinateInputPresent && !exactCoordinates) return { ...safe, ...hidden };
    const streetAndNumber = join([authorizedStreet, number], ", ");
    const label = join(
      [streetAndNumber, complement, bairro, join([cidade, estado], " - "), postalCode],
      " • ",
    );

    return {
      ...safe,
      public_address_mode: "full",
      public_location_label: label,
      public_map_query: label,
      public_street: authorizedStreet,
      public_number: number,
      public_complement: complement,
      public_postal_code: postalCode,
      public_city: cidade,
      public_state: estado,
      public_latitude: exactCoordinates ? latitude : null,
      public_longitude: exactCoordinates ? longitude : null,
    };
  }

  if (streetRequested) {
    // `endereco` may contain a number or complement; it is never a valid street-
    // only fallback. Absence of the dedicated street field therefore fails closed.
    if (!street) return { ...safe, ...hidden };
    const label = join([street, bairro, cidade, estado], ", ");
    return {
      ...safe,
      public_address_mode: "street",
      public_location_label: label,
      public_map_query: label,
      public_street: street,
      public_number: null,
      public_complement: null,
      public_postal_code: null,
      public_city: cidade,
      public_state: estado,
      public_latitude: null,
      public_longitude: null,
    };
  }

  return { ...safe, ...hidden };
}
