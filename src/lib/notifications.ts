import { collection, doc, setDoc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';
import { sandboxService } from './sandboxService';

/**
 * Cria uma notificação no Firestore ou no Sandbox local
 */
export const createNotification = async (
  notificationData: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
  isSandbox: boolean = false
): Promise<AppNotification> => {
  if (isSandbox) {
    return sandboxService.createNotification(notificationData);
  }

  const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const notification: AppNotification = {
    ...notificationData,
    id: notificationId,
    read: false,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'notifications', notificationId), notification);
  } catch (err) {
    console.error('Erro ao salvar notificação no Firestore:', err);
  }

  return notification;
};

/**
 * Marca uma notificação específica como lida
 */
export const markNotificationAsRead = async (
  notificationId: string,
  isSandbox: boolean = false
): Promise<void> => {
  if (isSandbox) {
    sandboxService.markNotificationAsRead(notificationId);
    return;
  }

  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (err) {
    console.error('Erro ao marcar notificação como lida no Firestore:', err);
  }
};

/**
 * Marca todas as notificações de um usuário como lidas
 */
export const markAllNotificationsAsRead = async (
  userId: string,
  isSandbox: boolean = false
): Promise<void> => {
  if (isSandbox) {
    sandboxService.markAllNotificationsAsRead(userId);
    return;
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Erro ao marcar todas as notificações como lidas no Firestore:', err);
  }
};
