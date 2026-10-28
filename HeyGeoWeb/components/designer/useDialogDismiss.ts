import { useEffect } from 'react';

/**
 * Escape closes a dialog from wherever the focus is.
 *
 * A key handler on the dim backdrop only hears Escape once something inside the
 * dialog has focus — a dialog whose first control is a colour swatch or a tab
 * never takes it, and the designer's Escape reaches the page instead. Listening
 * on the document, before the page's own shortcuts, makes the dialog win while
 * it is open.
 */
export function useDialogDismiss(onClose: () => void): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);
}
