export const ConfirmationMode = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const;
export type ConfirmationMode = (typeof ConfirmationMode)[keyof typeof ConfirmationMode];
