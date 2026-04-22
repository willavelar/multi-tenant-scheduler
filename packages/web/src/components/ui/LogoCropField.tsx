import { AvatarCropField } from './AvatarCropField'

interface LogoCropFieldProps {
  value:    string | null
  onChange: (v: string | null) => void
}

export function LogoCropField({ value, onChange }: LogoCropFieldProps) {
  return (
    <AvatarCropField
      value={value}
      onChange={onChange}
      shape="rect"
      aspect={3}
      outputWidth={480}
      outputHeight={160}
    />
  )
}
