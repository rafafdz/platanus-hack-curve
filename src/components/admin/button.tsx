import { cva, VariantProps } from "cva";
import { ComponentProps } from "react";

const styles = cva({
  base: "",
});

interface Props extends ComponentProps<"button">, VariantProps<typeof styles> {
  "data-loading"?: boolean;
}

export function Button(props: Props) {
  return <button {...props} className={styles(props)} />;
}
