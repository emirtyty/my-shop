// Система эскроу - безопасные сделки
import { logger } from './logger';
import { supabase } from './supabase';

interface EscrowTransaction {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  status: 'pending' | 'funded' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  fundedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  disputeReason?: string;
  disputeResolvedAt?: string;
  refundAmount?: number;
  fees: {
    escrowFee: number;
    platformFee: number;
    totalFee: number;
  };
  tracking?: {
    carrier: string;
    trackingNumber: string;
    status: string;
    lastUpdate: string;
  };
}

interface EscrowAgreement {
  id: string;
  transactionId: string;
  terms: {
    inspectionPeriod: number; // в днях
    returnPolicy: string;
    shippingResponsibility: 'buyer' | 'seller';
    insuranceRequired: boolean;
    disputeResolution: 'automatic' | 'manual';
  };
  conditions: {
    productCondition: string;
    deliveryMethod: string;
    specialInstructions?: string;
  };
  signedAt: string;
  buyerSignature: boolean;
  sellerSignature: boolean;
}

interface DisputeCase {
  id: string;
  transactionId: string;
  initiatedBy: 'buyer' | 'seller';
  reason: string;
  description: string;
  evidence: Array<{
    type: 'image' | 'document' | 'message';
    url: string;
    description: string;
  }>;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: {
    winner: 'buyer' | 'seller';
    refundAmount: number;
    reason: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

class EscrowService {
  private static instance: EscrowService;
  private feeStructure = {
    escrowFee: 0.025, // 2.5%
    platformFee: 0.03, // 3%
    minimumFee: 100, // Минимальная комиссия 100₽
    maximumFee: 5000 // Максимальная комиссия 5000₽
  };

  private constructor() {}

  static getInstance(): EscrowService {
    if (!EscrowService.instance) {
      EscrowService.instance = new EscrowService();
    }
    return EscrowService.instance;
  }

  // Создание эскроу-сделки
  async createEscrowTransaction(
    buyerId: string,
    sellerId: string,
    productId: string,
    amount: number,
    terms: Partial<EscrowAgreement['terms']> = {}
  ): Promise<EscrowTransaction> {
    try {
      // Рассчитываем комиссии
      const fees = this.calculateFees(amount);

      // Создаем транзакцию
      const transactionData: Omit<EscrowTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        buyerId,
        sellerId,
        productId,
        amount,
        status: 'pending',
        fees
      };

      const { data: transaction, error } = await supabase
        .from('escrow_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // Создаем соглашение
      const agreementData: Omit<EscrowAgreement, 'id' | 'transactionId' | 'signedAt' | 'buyerSignature' | 'sellerSignature'> = {
        terms: {
          inspectionPeriod: 7, // 7 дней по умолчанию
          returnPolicy: 'Возврат товара в течение 7 дней с момента получения',
          shippingResponsibility: 'seller',
          insuranceRequired: amount > 10000,
          disputeResolution: 'automatic',
          ...terms
        },
        conditions: {
          productCondition: 'Как новый',
          deliveryMethod: 'Курьерская доставка'
        }
      };

      const { data: agreement, error: agreementError } = await supabase
        .from('escrow_agreements')
        .insert({
          ...agreementData,
          transactionId: transaction.id,
          signedAt: new Date().toISOString(),
          buyerSignature: false,
          sellerSignature: false
        })
        .select()
        .single();

      if (agreementError) throw agreementError;

      logger.log('Escrow transaction created:', transaction.id);
      return transaction;
    } catch (error) {
      logger.error('Error creating escrow transaction:', error);
      throw error;
    }
  }

  // Финансирование эскроу-сделки
  async fundEscrowTransaction(transactionId: string, paymentMethod: 'card' | 'bank'): Promise<boolean> {
    try {
      const { data: transaction, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'pending') throw new Error('Transaction cannot be funded');

      // Имитация обработки платежа
      const paymentSuccessful = await this.processPayment(
        transaction.buyerId,
        transaction.amount + transaction.fees.totalFee,
        paymentMethod
      );

      if (!paymentSuccessful) {
        throw new Error('Payment failed');
      }

      // Обновляем статус транзакции
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'funded',
          fundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Уведомляем продавца
      await this.notifySeller(transaction.sellerId, 'payment_received', {
        transactionId,
        amount: transaction.amount
      });

      logger.log('Escrow transaction funded:', transactionId);
      return true;
    } catch (error) {
      logger.error('Error funding escrow transaction:', error);
      throw error;
    }
  }

  // Подтверждение отгрузки
  async confirmShipment(transactionId: string, trackingInfo: { carrier: string; trackingNumber: string }): Promise<boolean> {
    try {
      const { data: transaction, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'funded') throw new Error('Transaction not funded');

      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'shipped',
          shippedAt: new Date().toISOString(),
          tracking: {
            carrier: trackingInfo.carrier,
            trackingNumber: trackingInfo.trackingNumber,
            status: 'shipped',
            lastUpdate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Уведомляем покупателя
      await this.notifyBuyer(transaction.buyerId, 'item_shipped', {
        transactionId,
        trackingInfo
      });

      logger.log('Escrow transaction shipped:', transactionId);
      return true;
    } catch (error) {
      logger.error('Error confirming shipment:', error);
      throw error;
    }
  }

  // Подтверждение получения
  async confirmDelivery(transactionId: string): Promise<boolean> {
    try {
      const { data: transaction, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'shipped') throw new Error('Transaction not shipped');

      // Получаем соглашение для проверки периода инспекции
      const { data: agreement, error: agreementError } = await supabase
        .from('escrow_agreements')
        .select('*')
        .eq('transactionId', transactionId)
        .single();

      if (agreementError) throw agreementError;

      // Обновляем статус
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Начинаем период инспекции
      setTimeout(async () => {
        await this.completeTransaction(transactionId);
      }, agreement.terms.inspectionPeriod * 24 * 60 * 60 * 1000); // Конвертируем дни в миллисекунды

      logger.log('Escrow transaction delivered:', transactionId);
      return true;
    } catch (error) {
      logger.error('Error confirming delivery:', error);
      throw error;
    }
  }

  // Завершение сделки
  async completeTransaction(transactionId: string): Promise<boolean> {
    try {
      const { data: transaction, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'delivered') throw new Error('Transaction not delivered');

      // Выплачиваем деньги продавцу
      const payoutSuccessful = await this.processPayout(
        transaction.sellerId,
        transaction.amount,
        transaction.fees.platformFee
      );

      if (!payoutSuccessful) {
        throw new Error('Payout failed');
      }

      // Обновляем статус
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Уведомляем обе стороны
      await this.notifyBuyer(transaction.buyerId, 'transaction_completed', { transactionId });
      await this.notifySeller(transaction.sellerId, 'payment_released', { transactionId });

      logger.log('Escrow transaction completed:', transactionId);
      return true;
    } catch (error) {
      logger.error('Error completing transaction:', error);
      throw error;
    }
  }

  // Открытие спора
  async openDispute(
    transactionId: string,
    initiatedBy: 'buyer' | 'seller',
    reason: string,
    description: string,
    evidence: Array<{ type: 'image' | 'document' | 'message'; url: string; description: string }> = []
  ): Promise<DisputeCase> {
    try {
      const disputeData: Omit<DisputeCase, 'id' | 'createdAt'> = {
        transactionId,
        initiatedBy,
        reason,
        description,
        evidence,
        status: 'open'
      };

      const { data: dispute, error } = await supabase
        .from('dispute_cases')
        .insert(disputeData)
        .select()
        .single();

      if (error) throw error;

      // Обновляем статус транзакции
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'disputed',
          updatedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      // Уведомляем другую сторону
      const otherParty = initiatedBy === 'buyer' ? 'seller' : 'buyer';
      await this.notifyUser(transactionId, otherParty, 'dispute_opened', { disputeId: dispute.id });

      logger.log('Dispute opened:', dispute.id);
      return dispute;
    } catch (error) {
      logger.error('Error opening dispute:', error);
      throw error;
    }
  }

  // Разрешение спора
  async resolveDispute(disputeId: string, resolution: { winner: 'buyer' | 'seller'; refundAmount: number; reason: string }): Promise<boolean> {
    try {
      const { data: dispute, error } = await supabase
        .from('dispute_cases')
        .select('*, escrow_transactions(*)')
        .eq('id', disputeId)
        .single();

      if (error) throw error;
      if (!dispute) throw new Error('Dispute not found');

      // Обновляем спор
      const { error: updateError } = await supabase
        .from('dispute_cases')
        .update({
          status: 'resolved',
          resolution,
          resolvedAt: new Date().toISOString()
        })
        .eq('id', disputeId);

      if (updateError) throw updateError;

      // Обрабатываем возврат или выплату
      const transaction = dispute.escrow_transactions;
      if (resolution.winner === 'buyer') {
        // Возвращаем деньги покупателю
        await this.processRefund(transaction.buyerId, resolution.refundAmount);
        
        // Обновляем транзакцию
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'refunded',
            refundAmount: resolution.refundAmount,
            updatedAt: new Date().toISOString()
          })
          .eq('id', transaction.id);
      } else {
        // Выплачиваем деньги продавцу (возможно, частично)
        const payoutAmount = transaction.amount - resolution.refundAmount;
        await this.processPayout(transaction.sellerId, payoutAmount, transaction.fees.platformFee);
        
        // Обновляем транзакцию
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            refundAmount: resolution.refundAmount,
            updatedAt: new Date().toISOString()
          })
          .eq('id', transaction.id);
      }

      // Уведомляем обе стороны
      await this.notifyBuyer(transaction.buyerId, 'dispute_resolved', { disputeId, resolution });
      await this.notifySeller(transaction.sellerId, 'dispute_resolved', { disputeId, resolution });

      logger.log('Dispute resolved:', disputeId);
      return true;
    } catch (error) {
      logger.error('Error resolving dispute:', error);
      throw error;
    }
  }

  // Расчет комиссий
  private calculateFees(amount: number): EscrowTransaction['fees'] {
    const escrowFee = Math.max(this.feeStructure.minimumFee, amount * this.feeStructure.escrowFee);
    const platformFee = Math.max(this.feeStructure.minimumFee, amount * this.feeStructure.platformFee);
    const totalFee = Math.min(this.feeStructure.maximumFee, escrowFee + platformFee);

    return {
      escrowFee,
      platformFee,
      totalFee
    };
  }

  // Обработка платежа (имитация)
  private async processPayment(userId: string, amount: number, method: 'card' | 'bank'): Promise<boolean> {
    // В реальном приложении здесь будет интеграция с платежными системами
    logger.log(`Processing payment: ${amount}₽ for user ${userId} via ${method}`);
    return Math.random() > 0.1; // 90%成功率
  }

  // Обработка выплаты (имитация)
  private async processPayout(userId: string, amount: number, fee: number): Promise<boolean> {
    // В реальном приложении здесь будет интеграция с банковскими системами
    const netAmount = amount - fee;
    logger.log(`Processing payout: ${netAmount}₽ to user ${userId}`);
    return Math.random() > 0.05; // 95%成功率
  }

  // Обработка возврата (имитация)
  private async processRefund(userId: string, amount: number): Promise<boolean> {
    // В реальном приложении здесь будет интеграция с платежными системами
    logger.log(`Processing refund: ${amount}₽ to user ${userId}`);
    return Math.random() > 0.05; // 95%成功率
  }

  // Уведомление покупателя
  private async notifyBuyer(userId: string, type: string, data: any): Promise<void> {
    // В реальном приложении здесь будет отправка уведомлений
    logger.log(`Notifying buyer ${userId}: ${type}`, data);
  }

  // Уведомление продавца
  private async notifySeller(userId: string, type: string, data: any): Promise<void> {
    // В реальном приложении здесь будет отправка уведомлений
    logger.log(`Notifying seller ${userId}: ${type}`, data);
  }

  // Уведомление пользователя
  private async notifyUser(transactionId: string, role: 'buyer' | 'seller', type: string, data: any): Promise<void> {
    // В реальном приложении здесь будет отправка уведомлений
    logger.log(`Notifying ${role} for transaction ${transactionId}: ${type}`, data);
  }

  // Получить статус транзакции
  async getTransactionStatus(transactionId: string): Promise<EscrowTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      return null;
    }
  }

  // Получить активные сделки пользователя
  async getUserTransactions(userId: string, role: 'buyer' | 'seller'): Promise<EscrowTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq(role === 'buyer' ? 'buyerId' : 'sellerId', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      return [];
    }
  }

  // Получить статистику эскроу
  async getEscrowStats(): Promise<{
    totalTransactions: number;
    activeTransactions: number;
    completedTransactions: number;
    disputedTransactions: number;
    totalVolume: number;
    averageTransactionValue: number;
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('escrow_transactions')
        .select('status, amount');

      if (error) throw error;

      const totalTransactions = transactions?.length || 0;
      const activeTransactions = transactions?.filter(t => ['pending', 'funded', 'shipped', 'delivered'].includes(t.status)).length || 0;
      const completedTransactions = transactions?.filter(t => t.status === 'completed').length || 0;
      const disputedTransactions = transactions?.filter(t => t.status === 'disputed').length || 0;
      const totalVolume = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      return {
        totalTransactions,
        activeTransactions,
        completedTransactions,
        disputedTransactions,
        totalVolume,
        averageTransactionValue
      };
    } catch (error) {
      logger.error('Error getting escrow stats:', error);
      return {
        totalTransactions: 0,
        activeTransactions: 0,
        completedTransactions: 0,
        disputedTransactions: 0,
        totalVolume: 0,
        averageTransactionValue: 0
      };
    }
  }
}

export default EscrowService.getInstance();
