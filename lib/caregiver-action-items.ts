/**
 * Caregiver Action Items Utilities
 *
 * Extracts and manages action items from health reports for caregiver task tracking
 */

import { adminDb } from './firebase-admin'
import { CaregiverActionItem, ActionItemPriority, ActionItemCategory } from '@/types/medical'
import { SUBCOLLECTIONS } from '@/constants/firestore'
import { logger } from './logger'

/**
 * Parse health report text to extract action items
 */
export function extractActionItemsFromReport(
  reportText: string,
  patientId: string,
  userId: string,
  generatedAt: Date
): Omit<CaregiverActionItem, 'id' | 'createdAt' | 'lastModified'>[] {
  const items: Omit<CaregiverActionItem, 'id' | 'createdAt' | 'lastModified'>[] = []

  // Extract caregiver action items section
  const caregiverSectionMatch = reportText.match(/### 👨‍👩‍👧‍👦 Caregiver Action Items\n\n[\s\S]*?(?=\n##|$)/)
  if (!caregiverSectionMatch) {
    logger.info('[extractActionItems] No caregiver action items section found')
    return items
  }

  const caregiverSection = caregiverSectionMatch[0]

  // Parse tasks with priority and details
  const taskMatches = caregiverSection.matchAll(/\*\*([A-Z\s]+):\*\* ([^\n]+)\n((?:   - [^\n]+\n?)*)/g)

  for (const match of taskMatches) {
    const priorityText = match[1].trim()
    const task = match[2].trim()
    const detailsText = match[3]

    // Parse priority
    let priority: ActionItemPriority = 'ongoing'
    if (priorityText === 'URGENT') priority = 'urgent'
    else if (priorityText === 'THIS WEEK') priority = 'this_week'
    else if (priorityText === 'THIS MONTH') priority = 'this_month'
    else if (priorityText === 'ONGOING') priority = 'ongoing'

    // Parse details
    const details = detailsText
      .split('\n')
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.trim().substring(2))
      .filter(detail => detail.length > 0)

    // Determine category from task text
    const category = categorizeTask(task)

    // Calculate due date based on priority
    let dueDate: string | undefined
    const now = new Date(generatedAt)
    if (priority === 'urgent') {
      dueDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
    } else if (priority === 'this_week') {
      dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    } else if (priority === 'this_month') {
      dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }

    items.push({
      patientId,
      userId,
      task,
      category,
      priority,
      details: details.length > 0 ? details : undefined,
      completed: false,
      generatedAt: generatedAt.toISOString(),
      dueDate,
      reminderSent: false
    })
  }

  // Also extract shopping list items
  const shoppingMatches = reportText.matchAll(/- \[ \] ([^\n]+)/g)
  const shoppingItems = Array.from(shoppingMatches).map(match => match[1].trim())

  if (shoppingItems.length > 0) {
    // Group into grocery and medical
    const groceryItems = []
    const medicalItems = []

    let currentCategory: 'grocery' | 'medical' | null = null
    for (const item of shoppingItems) {
      if (reportText.indexOf('**Grocery Items') < reportText.indexOf(item)) {
        if (reportText.indexOf('**Medical Supplies') < reportText.indexOf(item)) {
          currentCategory = 'medical'
        } else {
          currentCategory = 'grocery'
        }
      }

      if (currentCategory === 'grocery') groceryItems.push(item)
      else if (currentCategory === 'medical') medicalItems.push(item)
    }

    if (groceryItems.length > 0) {
      items.push({
        patientId,
        userId,
        task: 'Purchase grocery items',
        category: 'shopping',
        priority: 'this_week',
        details: groceryItems,
        completed: false,
        generatedAt: generatedAt.toISOString(),
        dueDate: new Date(new Date(generatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        reminderSent: false
      })
    }

    if (medicalItems.length > 0) {
      items.push({
        patientId,
        userId,
        task: 'Purchase medical supplies',
        category: 'shopping',
        priority: 'this_week',
        details: medicalItems,
        completed: false,
        generatedAt: generatedAt.toISOString(),
        dueDate: new Date(new Date(generatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        reminderSent: false
      })
    }
  }

  logger.info('[extractActionItems] Extracted action items', {
    count: items.length,
    patientId
  })

  return items
}

/**
 * Categorize a task based on keywords
 */
function categorizeTask(task: string): ActionItemCategory {
  const lower = task.toLowerCase()

  if (lower.includes('medication') || lower.includes('pill') || lower.includes('prescription')) {
    return 'medication'
  }
  if (lower.includes('appointment') || lower.includes('doctor') || lower.includes('screening')) {
    return 'appointment'
  }
  if (lower.includes('shopping') || lower.includes('purchase') || lower.includes('buy')) {
    return 'shopping'
  }
  if (lower.includes('monitor') || lower.includes('track') || lower.includes('record') || lower.includes('vital')) {
    return 'monitoring'
  }
  if (lower.includes('nutrition') || lower.includes('meal') || lower.includes('calorie') || lower.includes('food')) {
    return 'nutrition'
  }

  return 'general'
}

/**
 * Save action items to Firestore
 */
export async function saveActionItems(
  items: Omit<CaregiverActionItem, 'id' | 'createdAt' | 'lastModified'>[],
  userId: string
): Promise<string[]> {
  const now = new Date().toISOString()
  const actionItemsRef = adminDb
    .collection('users')
    .doc(userId)
    .collection(SUBCOLLECTIONS.USERS.CAREGIVER_ACTION_ITEMS)

  const batch = adminDb.batch()
  const itemIds: string[] = []

  for (const item of items) {
    const docRef = actionItemsRef.doc()
    itemIds.push(docRef.id)

    const fullItem: CaregiverActionItem = {
      ...item,
      id: docRef.id,
      createdAt: now,
      lastModified: now
    }

    batch.set(docRef, fullItem)
  }

  await batch.commit()

  logger.info('[saveActionItems] Saved action items to Firestore', {
    userId,
    count: items.length,
    itemIds
  })

  return itemIds
}

/**
 * Get outstanding action items for a user
 */
export async function getOutstandingActionItems(
  userId: string,
  patientId?: string
): Promise<CaregiverActionItem[]> {
  let query = adminDb
    .collection('users')
    .doc(userId)
    .collection(SUBCOLLECTIONS.USERS.CAREGIVER_ACTION_ITEMS)
    .where('completed', '==', false)
    .orderBy('priority')
    .orderBy('dueDate')

  if (patientId) {
    query = query.where('patientId', '==', patientId) as any
  }

  const snapshot = await query.get()

  return snapshot.docs.map(doc => doc.data() as CaregiverActionItem)
}

/**
 * Mark an action item as completed
 */
export async function completeActionItem(
  userId: string,
  itemId: string,
  completedBy: string
): Promise<void> {
  const itemRef = adminDb
    .collection('users')
    .doc(userId)
    .collection(SUBCOLLECTIONS.USERS.CAREGIVER_ACTION_ITEMS)
    .doc(itemId)

  await itemRef.update({
    completed: true,
    completedAt: new Date().toISOString(),
    completedBy,
    lastModified: new Date().toISOString()
  })

  logger.info('[completeActionItem] Marked action item as completed', {
    userId,
    itemId,
    completedBy
  })
}
