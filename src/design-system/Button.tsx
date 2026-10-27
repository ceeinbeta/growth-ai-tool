import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-foreground bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "border border-destructive bg-transparent text-destructive hover:bg-danger-soft",
        outline:
          "border border-foreground bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "border border-foreground bg-transparent text-foreground hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-forest underline underline-offset-4",
      },
      size: {
        default: "min-h-11 text-base",
        sm: "min-h-11 text-sm",
        lg: "min-h-12 text-md",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp data-slot="button" data-variant={variant ?? 'default'} data-size={size ?? 'default'} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
