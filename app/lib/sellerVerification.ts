// Система верификации продавцов
import { logger } from './logger';
import { supabase } from './supabase';

interface VerificationDocument {
  id: string;
  sellerId: string;
  type: 'passport' | 'inn' | 'ogrn' | 'bank_account' | 'address_proof' | 'product_samples';
  url: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface VerificationStatus {
  sellerId: string;
  status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  level: 'basic' | 'standard' | 'premium';
  verifiedAt?: string;
  expiresAt?: string;
  documents: VerificationDocument[];
  badges: string[];
  restrictions: string[];
  lastReview: string;
  nextReview: string;
}

interface VerificationRequest {
  id: string;
  sellerId: string;
  level: 'basic' | 'standard' | 'premium';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: string[];
  notes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

class SellerVerification {
  private static instance: SellerVerification;
  private verificationLevels = {
    basic: {
      requiredDocuments: ['passport', 'inn'],
      reviewTime: 24 * 60 * 60 * 1000, // 24 часа
      badges: ['Базовая верификация'],
      restrictions: ['Максимальная сумма сделки: 10000₽'],
      benefits: ['Базовая защита покупателя', 'Стандартная комиссия']
    },
    standard: {
      requiredDocuments: ['passport', 'inn', 'ogrn', 'bank_account'],
      reviewTime: 3 * 24 * 60 * 60 * 1000, // 3 дня
      badges: ['Стандартная верификация', 'Проверенный продавец'],
      restrictions: ['Максимальная сумма сделки: 50000₽'],
      benefits: ['Расширенная защита', 'Приоритетная поддержка', 'Сниженная комиссия']
    },
    premium: {
      requiredDocuments: ['passport', 'inn', 'ogrn', 'bank_account', 'address_proof', 'product_samples'],
      reviewTime: 7 * 24 * 60 * 60 * 1000, // 7 дней
      badges: ['Премиум верификация', 'Топ продавец', 'Золотой партнер'],
      restrictions: ['Без ограничений'],
      benefits: ['Максимальная защита', 'VIP поддержка', 'Минимальная комиссия', 'Продвижение товаров']
    }
  };

  private constructor() {}

  static getInstance(): SellerVerification {
    if (!SellerVerification.instance) {
      SellerVerification.instance = new SellerVerification();
    }
    return SellerVerification.instance;
  }

  // Запрос верификации
  async requestVerification(
    sellerId: string,
    level: 'basic' | 'standard' | 'premium',
    documents: Array<{ type: string; file: File }>
  ): Promise<VerificationRequest> {
    try {
      // Проверяем, есть ли уже активный запрос
      const { data: existingRequest, error: existingError } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('sellerId', sellerId)
        .in('status', ['pending', 'approved'])
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existingRequest) {
        throw new Error('У вас уже есть активный запрос верификации');
      }

      // Загружаем документы
      const uploadedDocuments = await this.uploadDocuments(sellerId, documents);

      // Создаем запрос
      const requestData: Omit<VerificationRequest, 'id' | 'requestedAt'> = {
        sellerId,
        level,
        status: 'pending',
        documents: uploadedDocuments.map(doc => doc.id)
      };

      const { data: request, error } = await supabase
        .from('verification_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      // Обновляем статус продавца
      await this.updateVerificationStatus(sellerId, 'pending', level);

      logger.log('Verification request created:', request.id);
      return request;
    } catch (error) {
      logger.error('Error requesting verification:', error);
      throw error;
    }
  }

  // Загрузка документов
  private async uploadDocuments(
    sellerId: string,
    documents: Array<{ type: string; file: File }>
  ): Promise<VerificationDocument[]> {
    const uploadedDocs: VerificationDocument[] = [];

    for (const doc of documents) {
      try {
        // Загружаем файл в хранилище
        const fileName = `${sellerId}/${doc.type}_${Date.now()}_${doc.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, doc.file);

        if (uploadError) throw uploadError;

        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        // Сохраняем информацию о документе
        const docData: Omit<VerificationDocument, 'id' | 'uploadedAt'> = {
          sellerId,
          type: doc.type as any,
          url: urlData.publicUrl,
          filename: doc.file.name,
          status: 'pending'
        };

        const { data: savedDoc, error: saveError } = await supabase
          .from('verification_documents')
          .insert(docData)
          .select()
          .single();

        if (saveError) throw saveError;

        uploadedDocs.push(savedDoc);
      } catch (error) {
        logger.error(`Error uploading document ${doc.type}:`, error);
        throw error;
      }
    }

    return uploadedDocs;
  }

  // Обновление статуса верификации
  private async updateVerificationStatus(
    sellerId: string,
    status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended',
    level?: 'basic' | 'standard' | 'premium'
  ): Promise<void> {
    try {
      const currentStatus = await this.getVerificationStatus(sellerId);
      const levelConfig = this.verificationLevels[level || currentStatus?.level || 'basic'];

      const updateData: any = {
        status,
        lastReview: new Date().toISOString(),
        nextReview: new Date(Date.now() + levelConfig.reviewTime).toISOString()
      };

      if (level) {
        updateData.level = level;
      }

      if (status === 'verified') {
        updateData.verifiedAt = new Date().toISOString();
        updateData.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 год
        updateData.badges = levelConfig.badges;
        updateData.restrictions = levelConfig.restrictions;
      }

      const { error } = await supabase
        .from('seller_verification')
        .upsert({
          sellerId,
          ...updateData
        }, { onConflict: 'sellerId' });

      if (error) throw error;

      logger.log(`Verification status updated for seller ${sellerId}: ${status}`);
    } catch (error) {
      logger.error('Error updating verification status:', error);
      throw error;
    }
  }

  // Получение статуса верификации
  async getVerificationStatus(sellerId: string): Promise<VerificationStatus | null> {
    try {
      const { data: status, error } = await supabase
        .from('seller_verification')
        .select('*')
        .eq('sellerId', sellerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!status) {
        // Создаем базовый статус если его нет
        await this.updateVerificationStatus(sellerId, 'unverified', 'basic');
        return this.getVerificationStatus(sellerId);
      }

      // Получаем документы
      const { data: documents, error: docsError } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('sellerId', sellerId)
        .order('uploadedAt', { ascending: false });

      if (docsError) throw docsError;

      return {
        ...status,
        documents: documents || []
      };
    } catch (error) {
      logger.error('Error getting verification status:', error);
      return null;
    }
  }

  // Проверка документов
  async reviewDocument(
    documentId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const { data: document, error } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      if (!document) throw new Error('Document not found');

      // Обновляем статус документа
      const { error: updateError } = await supabase
        .from('verification_documents')
        .update({
          status,
          reviewedAt: new Date().toISOString(),
          reviewedBy,
          rejectionReason
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Проверяем, все ли документы проверены
      await this.checkVerificationCompletion(document.sellerId);

      logger.log(`Document ${documentId} reviewed with status: ${status}`);
      return true;
    } catch (error) {
      logger.error('Error reviewing document:', error);
      throw error;
    }
  }

  // Проверка завершения верификации
  private async checkVerificationCompletion(sellerId: string): Promise<void> {
    try {
      const verificationStatus = await this.getVerificationStatus(sellerId);
      if (!verificationStatus) return;

      // Получаем активный запрос верификации
      const { data: request, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('sellerId', sellerId)
        .eq('status', 'pending')
        .single();

      if (error || !request) return;

      // Получаем все документы для запроса
      const { data: documents, error: docsError } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('sellerId', sellerId)
        .in('id', request.documents);

      if (docsError) throw docsError;

      const requiredDocs = this.verificationLevels[request.level].requiredDocuments;
      const approvedDocs = documents.filter(doc => doc.status === 'approved');
      const rejectedDocs = documents.filter(doc => doc.status === 'rejected');

      // Если есть отклоненные документы, отклоняем весь запрос
      if (rejectedDocs.length > 0) {
        await this.rejectVerificationRequest(request.id, rejectedDocs[0].rejectionReason || 'Документы не соответствуют требованиям');
        return;
      }

      // Если все требуемые документы одобрены, одобряем верификацию
      if (approvedDocs.length >= requiredDocs.length) {
        await this.approveVerificationRequest(request.id);
      }
    } catch (error) {
      logger.error('Error checking verification completion:', error);
    }
  }

  // Одобрение запроса верификации
  private async approveVerificationRequest(requestId: string): Promise<void> {
    try {
      const { data: request, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      if (!request) throw new Error('Request not found');

      // Обновляем статус запроса
      await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewedAt: new Date().toISOString()
        })
        .eq('id', requestId);

      // Обновляем статус верификации продавца
      await this.updateVerificationStatus(request.sellerId, 'verified', request.level);

      logger.log(`Verification request ${requestId} approved`);
    } catch (error) {
      logger.error('Error approving verification request:', error);
      throw error;
    }
  }

  // Отклонение запроса верификации
  private async rejectVerificationRequest(requestId: string, reason: string): Promise<void> {
    try {
      const { data: request, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      if (!request) throw new Error('Request not found');

      // Обновляем статус запроса
      await supabase
        .from('verification_requests')
        .update({
          status: 'rejected',
          notes: reason,
          reviewedAt: new Date().toISOString()
        })
        .eq('id', requestId);

      // Обновляем статус верификации продавца
      await this.updateVerificationStatus(request.sellerId, 'rejected');

      logger.log(`Verification request ${requestId} rejected: ${reason}`);
    } catch (error) {
      logger.error('Error rejecting verification request:', error);
      throw error;
    }
  }

  // Получение всех запросов на верификацию
  async getVerificationRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<VerificationRequest[]> {
    try {
      let query = supabase
        .from('verification_requests')
        .select('*')
        .order('requestedAt', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting verification requests:', error);
      return [];
    }
  }

  // Получение верифицированных продавцов
  async getVerifiedSellers(level?: 'basic' | 'standard' | 'premium'): Promise<Array<{ seller: any; verification: VerificationStatus }>> {
    try {
      let query = supabase
        .from('seller_verification')
        .select('*, sellers(*)')
        .eq('status', 'verified');

      if (level) {
        query = query.eq('level', level);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => ({
        seller: item.sellers,
        verification: {
          sellerId: item.sellerId,
          status: item.status,
          level: item.level,
          verifiedAt: item.verifiedAt,
          expiresAt: item.expiresAt,
          documents: [],
          badges: item.badges || [],
          restrictions: item.restrictions || [],
          lastReview: item.lastReview,
          nextReview: item.nextReview
        }
      }));
    } catch (error) {
      logger.error('Error getting verified sellers:', error);
      return [];
    }
  }

  // Проверка верификации перед сделкой
  async verifyTransactionLimits(sellerId: string, amount: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const verificationStatus = await this.getVerificationStatus(sellerId);
      
      if (!verificationStatus) {
        return { allowed: false, reason: 'Продавец не верифицирован' };
      }

      if (verificationStatus.status !== 'verified') {
        return { allowed: false, reason: 'Продавец не прошел верификацию' };
      }

      // Проверяем срок действия верификации
      if (verificationStatus.expiresAt && new Date(verificationStatus.expiresAt) < new Date()) {
        return { allowed: false, reason: 'Срок верификации истек' };
      }

      // Проверяем ограничения по сумме
      const levelConfig = this.verificationLevels[verificationStatus.level];
      const maxAmount = this.getMaxAmountFromRestrictions(levelConfig.restrictions);
      
      if (amount > maxAmount) {
        return { allowed: false, reason: `Превышен лимит для уровня ${verificationStatus.level}: ${maxAmount}₽` };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error verifying transaction limits:', error);
      return { allowed: false, reason: 'Ошибка проверки верификации' };
    }
  }

  // Извлечение максимальной суммы из ограничений
  private getMaxAmountFromRestrictions(restrictions: string[]): number {
    for (const restriction of restrictions) {
      const match = restriction.match(/Максимальная сумма сделки: (\d+)₽/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 10000; // Значение по умолчанию
  }

  // Автоматическая проверка истекающих верификаций
  async checkExpiringVerifications(): Promise<void> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiring, error } = await supabase
        .from('seller_verification')
        .select('*')
        .eq('status', 'verified')
        .lt('expiresAt', thirtyDaysFromNow.toISOString());

      if (error) throw error;

      for (const verification of expiring || []) {
        // Отправляем уведомление о необходимости продления верификации
        await this.notifySeller(verification.sellerId, 'verification_expiring', {
          expiresAt: verification.expiresAt,
          level: verification.level
        });
      }

      logger.log(`Checked ${expiring?.length || 0} expiring verifications`);
    } catch (error) {
      logger.error('Error checking expiring verifications:', error);
    }
  }

  // Уведомление продавца
  private async notifySeller(sellerId: string, type: string, data: any): Promise<void> {
    // В реальном приложении здесь будет отправка уведомлений
    logger.log(`Notifying seller ${sellerId}: ${type}`, data);
  }

  // Получение статистики верификации
  async getVerificationStats(): Promise<{
    totalSellers: number;
    verifiedSellers: number;
    pendingVerifications: number;
    rejectedVerifications: number;
    levelDistribution: { [key: string]: number };
    averageReviewTime: number;
  }> {
    try {
      const { data: allVerifications, error } = await supabase
        .from('seller_verification')
        .select('status, level, lastReview');

      if (error) throw error;

      const totalSellers = allVerifications?.length || 0;
      const verifiedSellers = allVerifications?.filter(v => v.status === 'verified').length || 0;
      const pendingVerifications = allVerifications?.filter(v => v.status === 'pending').length || 0;
      const rejectedVerifications = allVerifications?.filter(v => v.status === 'rejected').length || 0;

      const levelDistribution: { [key: string]: number } = {
        basic: 0,
        standard: 0,
        premium: 0
      };

      allVerifications?.forEach(v => {
        if (v.level in levelDistribution) {
          levelDistribution[v.level]++;
        }
      });

      // Расчет среднего времени проверки
      const reviewTimes = allVerifications
        ?.filter(v => v.lastReview)
        .map(v => new Date(v.lastReview).getTime()) || [];
      
      const averageReviewTime = reviewTimes.length > 0 
        ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length 
        : 0;

      return {
        totalSellers,
        verifiedSellers,
        pendingVerifications,
        rejectedVerifications,
        levelDistribution,
        averageReviewTime
      };
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      return {
        totalSellers: 0,
        verifiedSellers: 0,
        pendingVerifications: 0,
        rejectedVerifications: 0,
        levelDistribution: { basic: 0, standard: 0, premium: 0 },
        averageReviewTime: 0
      };
    }
  }
}

export default SellerVerification.getInstance();
