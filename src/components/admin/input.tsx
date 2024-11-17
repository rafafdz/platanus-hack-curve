import { cva, VariantProps } from "cva";
import { ComponentProps } from "react";

const styles = cva({
  base: "bg-base-800 text-base-100 rounded-md px-2 h-7 border border-base-700",
});

interface Props extends ComponentProps<"input">, VariantProps<typeof styles> {}

export function Input(props: Props) {
  return <input {...props} className={styles(props)} />;
}
