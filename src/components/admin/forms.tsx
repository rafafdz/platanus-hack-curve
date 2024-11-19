import { cva, VariantProps } from "cva";
import { ComponentProps, useId } from "react";

const styles = cva({
  base: "bg-base-900 text-base-100 inline-block border-b border-b-base-400 px-2 h-min text-md leading-tight autofill:bg-base-600!",
});

interface Props extends ComponentProps<"input">, VariantProps<typeof styles> {}

export function Input({ className, ...props }: Props) {
  return <input {...props} className={styles({ className })} />;
}

export function Label(props: ComponentProps<"label">) {
  return <label {...props} />;
}
