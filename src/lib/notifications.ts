import { collection, doc, setDoc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';
import { sandboxService } from './sandboxService';

/**
 * Cria uma notificação no Firestore ou no Sandbox local
 * REGRA DE ZERO AUTO-NOTIFICAÇÃO: Se senderUserId for fornecido e igual ao userId (destinatário), a notificação é ignorada.
 */
export const createNotification = async (
  notificationData: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
  isSandbox: boolean = false
): Promise<AppNotification | null> => {
  // REGRA DE ZERO AUTO-NOTIFICAÇÃO: Quem disparou a ação nunca deve ser notificado por ela
  if (notificationData.senderUserId && notificationData.userId === notificationData.senderUserId) {
    return null;
  }

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
 * Notifica supervisores sobre quebra de acordo apenas se for de ALTO VALOR (> R$ 5.000,00)
 */
export const HIGH_VALUE_THRESHOLD = 5000;

export const notifyHighValueBreak = async (
  supervisorIds: string[],
  agreementInfo: { id: string; clientName: string; value: number },
  operatorName: string,
  senderUserId?: string,
  isSandbox: boolean = false
): Promise<void> => {
  if (agreementInfo.value < HIGH_VALUE_THRESHOLD) {
    // Para quebras normais de rotina (< 5k), não inunda o supervisor com alertas
    return;
  }

  const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(agreementInfo.value);

  for (const supId of supervisorIds) {
    await createNotification({
      userId: supId,
      senderUserId,
      title: '🚨 Acordo de Alto Valor Quebrado',
      message: `O cliente ${agreementInfo.clientName} (${operatorName}) teve o acordo de ${formattedValue} quebrado e retornou ao Balcão Geral.`,
      type: 'high_value_break',
      referenceId: agreementInfo.id
    }, isSandbox);
  }
};

/**
 * Notifica um operador sobre novos leads atribuídos ao seu lote por um supervisor
 */
export const notifyLeadAssigned = async (
  operatorId: string,
  count: number,
  senderUserId: string,
  isSandbox: boolean = false
): Promise<void> => {
  await createNotification({
    userId: operatorId,
    senderUserId,
    title: '🎒 Novos Leads Atribuídos',
    message: `${count} novo(s) lead(s) foram adicionados ao seu Meu Lote pela supervisão.`,
    type: 'lead_assigned'
  }, isSandbox);
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
