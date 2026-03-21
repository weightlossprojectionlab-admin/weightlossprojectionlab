/**
 * useDocumentOCR Hook
 *
 * Real-time listener for document OCR status updates.
 * Uses onSnapshot to reflect OCR processing status as it changes
 * (pending → processing → completed/failed).
 */

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import type { PatientDocument, OcrStatus } from '@/types/medical'

interface UseDocumentOCROptions {
  patientId: string | null
  /** Only listen for documents with specific OCR statuses */
  filterStatus?: OcrStatus[]
}

interface UseDocumentOCRReturn {
  /** All documents with their current OCR status */
  documents: PatientDocument[]
  /** Documents currently being processed */
  processingDocuments: PatientDocument[]
  /** Documents with completed OCR and structured data */
  completedDocuments: PatientDocument[]
  /** Whether the listener is active */
  isListening: boolean
  /** Manually trigger OCR for a document */
  triggerOCR: (documentId: string) => Promise<void>
}

export function useDocumentOCR({
  patientId,
  filterStatus
}: UseDocumentOCROptions): UseDocumentOCRReturn {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (!user?.uid || !patientId) return

    const docsRef = collection(
      db,
      'users',
      user.uid,
      'patients',
      patientId,
      'documents'
    )

    let q = query(docsRef, orderBy('uploadedAt', 'desc'))

    // Apply status filter if provided
    if (filterStatus && filterStatus.length > 0) {
      q = query(docsRef, where('ocrStatus', 'in', filterStatus), orderBy('uploadedAt', 'desc'))
    }

    setIsListening(true)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Skip metadata-only changes (hasPendingWrites)
        if (snapshot.metadata.hasPendingWrites) return

        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PatientDocument[]

        setDocuments(docs)
      },
      (error) => {
        logger.error('[useDocumentOCR] Listener error', error as Error)
        setIsListening(false)
      }
    )

    return () => {
      unsubscribe()
      setIsListening(false)
    }
  }, [user?.uid, patientId, filterStatus?.join(',')])

  const processingDocuments = documents.filter(d => d.ocrStatus === 'processing')
  const completedDocuments = documents.filter(d => d.ocrStatus === 'completed' && d.structuredData)

  const triggerOCR = useCallback(async (documentId: string) => {
    if (!user || !patientId) return

    const token = await user.getIdToken()
    const response = await fetch(
      `/api/patients/${patientId}/documents/${documentId}/ocr`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to trigger OCR')
    }
  }, [user, patientId])

  return {
    documents,
    processingDocuments,
    completedDocuments,
    isListening,
    triggerOCR
  }
}
