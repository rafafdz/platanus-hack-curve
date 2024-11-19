import { cva, VariantProps } from "cva";
import { ComponentProps } from "react";

const styles = cva({
  base: "px-4 leading-tight",
  variants: {
    variant: {
      primary: "bg-base-200 text-base-900 hover:bg-base-100 disabled:bg-base-300",
      danger: "bg-red-700 text-red-50 hover:bg-red-600 disabled:bg-red-800",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

interface Props extends ComponentProps<"button">, VariantProps<typeof styles> {
  "data-loading"?: boolean;
}

export function Button(props: Props) {
  return <button {...props} className={styles(props)} />;
}
