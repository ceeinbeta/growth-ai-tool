// Side-effect import so consumers attaching the library inherit the d16
// tokens and base styles without extra wiring. Fonts are NOT loaded here:
// theme.css only names the families; the consumer must load DM Sans and
// Manrope from Google Fonts in its document head (see .lovable/system.md).
import './design-system/theme.css';

export { Logo, type LogoProps } from './design-system/Logo';
export { Button, buttonVariants, type ButtonProps } from './design-system/Button';
export { Input, type InputProps } from './design-system/Input';
export { DomainInput, type DomainInputProps } from './design-system/DomainInput';
export { ActionRow, ActionHeader, type ActionRowProps, type ActionHeaderProps } from './design-system/ActionRow';
export { PageShell, PageGrid, type PageShellProps, type PageGridProps } from './design-system/PageLayout';
export { cn } from './design-system/utils';