import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Fields } from "./model";
import { digits } from "./formats";
import { lookupPostalCode } from "./postal-lookup";
export type PostalGroup = "zip" | "billingZip";
export const addressKeys = (key: PostalGroup) =>
  key === "zip"
    ? ["address", "district", "city", "region"]
    : ["billingAddress", "billingDistrict", "billingCity", "billingRegion"];
type Status = { loading: boolean; message: string; error: boolean };
export function usePostalAddress(values: Fields, setValues: Dispatch<SetStateAction<Fields>>) {
  const [status, setStatus] = useState<Partial<Record<PostalGroup, Status>>>({});
  const latest = useRef(values);
  latest.current = values;
  const requests = useRef<
    Partial<Record<PostalGroup, { controller: AbortController; cep: string }>>
  >({});
  const applied = useRef<Partial<Record<PostalGroup, Fields>>>({});
  const completed = useRef<Partial<Record<PostalGroup, string>>>({});
  const mounted = useRef(true);
  function cancel(key: PostalGroup) {
    requests.current[key]?.controller.abort();
    delete requests.current[key];
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel("zip");
      cancel("billingZip");
    };
  }, []);
  useEffect(() => {
    if (values.sameBilling === "true") {
      cancel("billingZip");
      setStatus((current) => ({ ...current, billingZip: undefined }));
    }
  }, [values.sameBilling]);
  function change(key: string, value: string) {
    if (key === "zip" || key === "billingZip") {
      cancel(key);
      delete completed.current[key];
      const previous = applied.current[key];
      delete applied.current[key];
      setValues((current) => {
        const next = { ...current, [key]: value };
        if (previous)
          for (const name of addressKeys(key)) if (next[name] === previous[name]) next[name] = "";
        return next;
      });
      setStatus((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: false,
          message: value
            ? "Ao sair do CEP, buscaremos o endereço. Você também pode preencher manualmente."
            : "",
        },
      }));
    } else setValues((current) => ({ ...current, [key]: value }));
  }
  function clear() {
    cancel("zip");
    cancel("billingZip");
    applied.current = {};
    completed.current = {};
    setStatus({});
  }
  async function lookup(key: PostalGroup, force = false) {
    const cep = digits(latest.current[key] || "");
    if (!cep) return;
    if (cep.length !== 8) {
      setStatus((current) => ({
        ...current,
        [key]: { loading: false, error: true, message: "Informe um CEP com 8 dígitos." },
      }));
      return;
    }
    if (requests.current[key]?.cep === cep || (!force && completed.current[key] === cep)) return;
    cancel(key);
    const request = { controller: new AbortController(), cep };
    requests.current[key] = request;
    const before = { ...latest.current };
    setStatus((current) => ({
      ...current,
      [key]: { loading: true, error: false, message: "Buscando endereço…" },
    }));
    try {
      const address = await lookupPostalCode(cep, request.controller.signal);
      if (
        !mounted.current ||
        requests.current[key] !== request ||
        digits(latest.current[key] || "") !== cep ||
        (key === "billingZip" && latest.current.sameBilling === "true")
      )
        return;
      const names = addressKeys(key),
        parts = [address.street, address.district, address.city, address.region];
      const filled: Fields = {};
      // Keep any manual edits made while the request was in flight, including explicit clearing.
      setValues((current) => {
        const next = { ...current };
        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          if ((current[name] || "") === (before[name] || "")) {
            next[name] = parts[i];
            filled[name] = parts[i];
          }
        }
        applied.current[key] = filled;
        return next;
      });
      completed.current[key] = cep;
      setStatus((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: false,
          message:
            "CEP localizado. Confira o endereço e complete número, complemento e campos não informados.",
        },
      }));
    } catch (error) {
      if (mounted.current && requests.current[key] === request)
        setStatus((current) => ({
          ...current,
          [key]: {
            loading: false,
            error: true,
            message:
              error instanceof Error
                ? error.message
                : "Consulta indisponível. Preencha manualmente.",
          },
        }));
    } finally {
      if (requests.current[key] === request) delete requests.current[key];
    }
  }
  return { status, change, lookup, clear };
}
