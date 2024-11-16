import { cva, VariantProps } from "cva";
import { ComponentProps } from "react";

const styles = cva({
  base: "",
});

interface Props extends ComponentProps<"input">, VariantProps<typeof styles> {}

export function Input(props: Props) {
  return <input {...props} className={styles(props)} />;
}
