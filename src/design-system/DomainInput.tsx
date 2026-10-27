import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { Input } from './Input';
import { cn } from './utils';
export interface DomainInputProps extends InputHTMLAttributes<HTMLInputElement> { action?: ReactNode; }
/** A website field with optional existing action; never starts analysis on its own. */
export const DomainInput = forwardRef<HTMLInputElement, DomainInputProps>(function DomainInput({className, action, ...props}, ref) {
 return <div className={cn('domain-field',className)}><Globe aria-hidden="true"/><Input ref={ref} {...props}/>{action}</div>;
});
