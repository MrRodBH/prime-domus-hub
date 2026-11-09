import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { aplicarMascara, type TipoMascara } from "@/lib/rm-crm/mascaras";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & {
  mascara: TipoMascara;
  defaultValue?: string | null | undefined;
  onChange?: ComponentProps<typeof Input>["onChange"];
};

/** Campo de texto que formata o valor enquanto o usuário digita. */
export function InputMascarado({ mascara, defaultValue, onChange, ...props }: Props) {
  const [valor, setValor] = useState(() => aplicarMascara(mascara, String(defaultValue ?? "")));

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={valor}
      onChange={(evento) => {
        const formatado = aplicarMascara(mascara, evento.target.value);
        evento.target.value = formatado;
        setValor(formatado);
        onChange?.(evento);
      }}
    />
  );
}
