import { useEffect, type ReactNode } from 'react';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
import { Input, Select, Textarea, Field } from './ui';
import { useAll } from '@/api/hooks';
import { cn, titleCase } from '@/lib/utils';

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'money' | 'date' | 'datetime' | 'time' | 'month' | 'select' | 'ref' | 'textarea' | 'checkbox' | 'tags';
export interface FieldDef {
  name: string; label: string; type?: FieldType; required?: boolean; placeholder?: string; hint?: string;
  options?: (string | { value: string | number; label: string })[];
  ref?: { collection: string; label: string | ((r: any) => string); params?: Record<string, any> | ((values: any) => Record<string, any>) };
  span?: 1 | 2 | 3; readOnly?: boolean; pattern?: { value: RegExp; message: string }; min?: number; max?: number;
  showIf?: (values: any) => boolean; defaultValue?: any;
}

export const opts = (list: string[]) => list.map((v) => ({ value: v, label: titleCase(v) }));

export function RefSelect({ collection, label, params, value, onChange, placeholder = 'Select…', disabled, name, className }: {
  collection: string; label: string | ((r: any) => string); params?: Record<string, any>; value: any; onChange: (v: any) => void; placeholder?: string; disabled?: boolean; name?: string; className?: string;
}) {
  const { data = [], isLoading } = useAll(collection, params ?? {});
  const lab = (r: any) => (typeof label === 'function' ? label(r) : r[label]);
  return (
    <Select name={name} value={value ?? ''} disabled={disabled || isLoading} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder={isLoading ? 'Loading…' : placeholder} className={className}>
      {data.map((r: any) => <option key={r.id} value={r.id}>{lab(r)}</option>)}
    </Select>
  );
}

function FieldControl({ f, form }: { f: FieldDef; form: UseFormReturn<any> }) {
  const { register, control, watch, formState: { errors } } = form;
  const err = (errors as any)[f.name]?.message as string | undefined;
  const rules: any = { required: f.required ? `${f.label} is required` : false, pattern: f.pattern };
  if (f.min !== undefined) rules.min = { value: f.min, message: `Minimum ${f.min}` };
  if (f.max !== undefined) rules.max = { value: f.max, message: `Maximum ${f.max}` };
  const type = f.type ?? 'text';
  let control_: ReactNode;
  if (type === 'select') {
    const o = (f.options ?? []).map((x) => (typeof x === 'string' ? { value: x, label: titleCase(x) } : x));
    control_ = <Select {...register(f.name, rules)} options={o} placeholder="Select…" disabled={f.readOnly} />;
  } else if (type === 'ref') {
    const values = watch();
    const params = typeof f.ref!.params === 'function' ? f.ref!.params(values) : f.ref!.params;
    control_ = <Controller name={f.name} control={control} rules={rules} render={({ field }) => (
      <RefSelect collection={f.ref!.collection} label={f.ref!.label} params={params} value={field.value} onChange={field.onChange} disabled={f.readOnly} />)} />;
  } else if (type === 'textarea') control_ = <Textarea {...register(f.name, rules)} placeholder={f.placeholder} readOnly={f.readOnly} />;
  else if (type === 'checkbox') control_ = (
    <span className="flex h-9 items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" {...register(f.name)} disabled={f.readOnly} /><span className="text-sm text-slate-600">{f.placeholder ?? 'Yes'}</span></span>
  );
  else if (type === 'tags') control_ = <Controller name={f.name} control={control} rules={rules} render={({ field }) => (
    <Input value={Array.isArray(field.value) ? field.value.join(', ') : field.value ?? ''} onChange={(e) => field.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder={f.placeholder ?? 'Comma separated'} />)} />;
  else {
    const htmlType = type === 'money' ? 'number' : type === 'datetime' ? 'datetime-local' : type;
    control_ = <Input type={htmlType} step={type === 'money' ? '0.01' : type === 'number' ? 'any' : undefined} {...register(f.name, { ...rules, valueAsNumber: type === 'number' || type === 'money' ? true : undefined })} placeholder={f.placeholder} readOnly={f.readOnly} />;
  }
  return <Field label={f.label} required={f.required} error={err} hint={f.hint} className={cn(f.span === 2 && 'sm:col-span-2', f.span === 3 && 'sm:col-span-3')}>{control_}</Field>;
}

export function FormFields({ fields, form, cols = 2 }: { fields: FieldDef[]; form: UseFormReturn<any>; cols?: 1 | 2 | 3 }) {
  const values = form.watch();
  return (
    <div className={cn('grid gap-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-3')}>
      {fields.filter((f) => !f.showIf || f.showIf(values)).map((f) => <FieldControl key={f.name} f={f} form={form} />)}
    </div>
  );
}

/** Strip decoration fields and convert NaN / '' to null before sending to the API */
export function toPayload(fields: FieldDef[], values: Record<string, any>) {
  const out: Record<string, any> = {};
  fields.forEach((f) => {
    let v = values[f.name];
    if (typeof v === 'number' && Number.isNaN(v)) v = null;
    if (v === '') v = null;
    if (f.type === 'datetime' && v) v = new Date(v).toISOString();
    out[f.name] = v;
  });
  return out;
}

export function useEntityForm(fields: FieldDef[], initial?: Record<string, any> | null, fixed?: Record<string, any>) {
  const defaults = () => {
    const d: Record<string, any> = {};
    fields.forEach((f) => {
      let v = initial?.[f.name] ?? fixed?.[f.name] ?? f.defaultValue ?? (f.type === 'checkbox' ? false : '');
      if (f.type === 'datetime' && v) v = String(v).slice(0, 16);
      if (f.type === 'date' && v) v = String(v).slice(0, 10);
      d[f.name] = v;
    });
    return d;
  };
  const form = useForm({ defaultValues: defaults() });
  useEffect(() => { form.reset(defaults()); /* eslint-disable-next-line */ }, [initial?.id]);
  return form;
}
