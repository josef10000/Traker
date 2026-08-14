/**
 * Serviço de Notificações Push Nativas no Desktop (Notification API do HTML5)
 * Fornece alertas visuais e sonoros no sistema operacional do usuário (Windows/Mac/Linux)
 * 100% Gratuito e sem dependência de serviços externos.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este navegador não suporta notificações de desktop.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function sendDesktopNotification(title: string, options?: {
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag,
        silent: false
      });

      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }
    } catch (e) {
      console.error('Erro ao enviar notificação de desktop:', e);
    }
  }
}
