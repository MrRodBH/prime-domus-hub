import { projectPublicPropertyAddress } from "@/lib/public-property-address-projection.server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function base(overrides: Record<string, unknown> = {}) {
  return {
    id: "property-1",
    titulo: "Cobertura Prime",
    endereco: "Rua Privada, 123, apto 401",
    rua: "Rua Privada",
    numero: "123",
    complemento: "Apto 401",
    cidade: "Belo Horizonte",
    estado: "MG",
    cep: "30110-000",
    latitude: -19.932,
    longitude: -43.938,
    mostrar_rua: false,
    mostrar_endereco_completo: false,
    bairro: {
      nome: "Lourdes",
      cidade: { nome: "Belo Horizonte", estado: "MG" },
    },
    ...overrides,
  };
}

const rawKeys = [
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

function assertNoRawAddress(value: Record<string, unknown>, label: string) {
  for (const key of rawKeys) {
    assert(!(key in value), `${label} serialized raw field ${key}`);
  }
  const json = JSON.stringify(value);
  for (const forbidden of [
    "Rua Privada, 123, apto 401",
    "30110-000",
    "-19.932",
    "-43.938",
  ]) {
    assert(!json.includes(forbidden), `${label} serialized hidden value ${forbidden}`);
  }
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "hidden mode strips every raw address field and exact coordinate",
    run: async () => {
      const projected = projectPublicPropertyAddress(base());
      assert(projected.public_address_mode === "hidden", "hidden mode not selected");
      assert(
        projected.public_location_label === "Lourdes, Belo Horizonte, MG",
        "approximate label invalid",
      );
      assert(
        projected.public_map_query === "Lourdes, Belo Horizonte, MG",
        "approximate map query invalid",
      );
      assert(projected.public_street === null, "hidden street leaked");
      assert(projected.public_number === null, "hidden number leaked");
      assert(projected.public_complement === null, "hidden complement leaked");
      assert(projected.public_postal_code === null, "hidden postal code leaked");
      assert(projected.public_latitude === null, "hidden latitude leaked");
      assert(projected.public_longitude === null, "hidden longitude leaked");
      assert(projected.titulo === "Cobertura Prime", "non-address presentation data removed");
      assertNoRawAddress(projected, "hidden");
    },
  },
  {
    name: "street mode exposes only the dedicated street and approximate context",
    run: async () => {
      const projected = projectPublicPropertyAddress(base({ mostrar_rua: true }));
      assert(projected.public_address_mode === "street", "street mode not selected");
      assert(projected.public_street === "Rua Privada", "dedicated street missing");
      assert(projected.public_number === null, "street mode number leaked");
      assert(projected.public_complement === null, "street mode complement leaked");
      assert(projected.public_postal_code === null, "street mode postal code leaked");
      assert(projected.public_latitude === null, "street mode latitude leaked");
      assert(projected.public_longitude === null, "street mode longitude leaked");
      assert(
        projected.public_location_label === "Rua Privada, Lourdes, Belo Horizonte, MG",
        "street label invalid",
      );
      assertNoRawAddress(projected, "street");
    },
  },
  {
    name: "full mode exposes only explicitly authorized public fields",
    run: async () => {
      const projected = projectPublicPropertyAddress(
        base({ mostrar_endereco_completo: true }),
      );
      assert(projected.public_address_mode === "full", "full mode not selected");
      assert(projected.public_street === "Rua Privada", "full street missing");
      assert(projected.public_number === "123", "full number missing");
      assert(projected.public_complement === "Apto 401", "full complement missing");
      assert(projected.public_postal_code === "30110-000", "full postal code missing");
      assert(projected.public_latitude === -19.932, "full latitude missing");
      assert(projected.public_longitude === -43.938, "full longitude missing");
      for (const key of rawKeys) assert(!(key in projected), `full raw field ${key} remains`);
    },
  },
  {
    name: "unknown flag values and absent dedicated street fail closed",
    run: async () => {
      const unknown = projectPublicPropertyAddress(
        base({ mostrar_rua: "true", mostrar_endereco_completo: "true" }),
      );
      assert(unknown.public_address_mode === "hidden", "string flags gained authority");
      assertNoRawAddress(unknown, "unknown-flags");

      const missingStreet = projectPublicPropertyAddress(
        base({ mostrar_rua: true, rua: null }),
      );
      assert(
        missingStreet.public_address_mode === "hidden",
        "legacy address became street authority",
      );
      assertNoRawAddress(missingStreet, "missing-street");
    },
  },
  {
    name: "inconsistent coordinate pairs fail closed instead of partially serializing",
    run: async () => {
      const oneCoordinate = projectPublicPropertyAddress(
        base({ mostrar_endereco_completo: true, longitude: null }),
      );
      assert(
        oneCoordinate.public_address_mode === "hidden",
        "partial coordinate pair accepted",
      );
      assertNoRawAddress(oneCoordinate, "partial-coordinates");

      const invalidCoordinate = projectPublicPropertyAddress(
        base({ mostrar_endereco_completo: true, latitude: 120 }),
      );
      assert(
        invalidCoordinate.public_address_mode === "hidden",
        "invalid coordinate accepted",
      );
      assertNoRawAddress(invalidCoordinate, "invalid-coordinates");
    },
  },
  {
    name: "full mode without coordinate input remains full with no exact location",
    run: async () => {
      const projected = projectPublicPropertyAddress(
        base({ mostrar_endereco_completo: true, latitude: null, longitude: null }),
      );
      assert(
        projected.public_address_mode === "full",
        "coordinate absence blocked authorized address",
      );
      assert(
        projected.public_latitude === null && projected.public_longitude === null,
        "absent pair materialized",
      );
      for (const key of rawKeys) {
        assert(!(key in projected), `coordinate-free full raw field ${key} remains`);
      }
    },
  },
];

export async function runPublicPropertyAddressProjectionSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
