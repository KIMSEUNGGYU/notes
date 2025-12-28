import { Toast } from '@tds/desktop';
import { overlay } from 'overlay-kit';
import { isApiError } from 'remotes';

export function showApiErrorToast(error: unknown) {
  if (!isApiError(error)) return;

  const errorMessage = error.message;
  overlay.open(({ isOpen, close }) => (
    <Toast open={isOpen} onOpenChange={close} leftAddon={<Toast.Icon name="icon-exclamation-circle-yellow-no-space" />}>
      {errorMessage}
    </Toast>
  ));
}

export function showSuccessToast(message: string) {
  overlay.open(({ isOpen, close }) => (
    <Toast open={isOpen} onOpenChange={close} leftAddon={<Toast.Icon name="icon-check-green-fill" />}>
      {message}
    </Toast>
  ));
}

export function showWarningToast(message: string) {
  overlay.open(({ isOpen, close }) => (
    <Toast open={isOpen} onOpenChange={close} leftAddon={<Toast.Icon name="icon-exclamation-circle-yellow-no-space" />}>
      {message}
    </Toast>
  ));
}
