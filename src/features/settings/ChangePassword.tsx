import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { http, apiError } from '@/api/http';
import { Button, Field, Input, Modal } from '@/components/ui';

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<{ current_password: string; new_password: string; confirm: string }>();
  const submit = handleSubmit(async (v) => {
    try { await http.post('/auth/change-password', { current_password: v.current_password, new_password: v.new_password }); toast.success('Password changed'); reset(); onClose(); }
    catch (e) { toast.error(apiError(e)); }
  });
  return (
    <Modal open={open} onClose={onClose} title="Change password" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={isSubmitting}>Update password</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password" error={errors.current_password?.message}><Input type="password" autoComplete="current-password" {...register('current_password', { required: 'Required' })} /></Field>
        <Field label="New password" error={errors.new_password?.message} hint="At least 8 characters"><Input type="password" autoComplete="new-password" {...register('new_password', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })} /></Field>
        <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register('confirm', { validate: (v) => v === watch('new_password') || 'Passwords do not match' })} /></Field>
      </form>
    </Modal>
  );
}
