'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/constants/firestore'

// Batches barcodes/ids into chunks of N to reduce Firestore round trips
const BATCH_SIZE = 10
const CACHE_TTL_MS = 30 * 60 * 1000

export type RecipeNameMap = Record<string, string> // recipeId -> name

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchRecipeNames(ids: string[]): Promise<RecipeNameMap> {
  if (!ids.length) return {}
  const unique = Array.from(new Set(ids))
  const chunks = chunk(unique, BATCH_SIZE)
  const result: RecipeNameMap = {}

  for (const c of chunks) {
    // Firestore: where('__name__', 'in', [...]) supports up to 10
    const qRef = query(
      collection(db, COLLECTIONS.RECIPES),
      where('__name__', 'in', c)
    )
    const snap = await getDocs(qRef)
    snap.forEach(d => {
      const data = d.data() as { name?: string }
      if (data?.name) result[d.id] = data.name
    })
  }
  return result
}

export function useRecipeNames(ids: string[]) {
  const key = useMemo(() => (ids && ids.length ? ['recipeNames', ...ids] : null), [ids])

  const { data, error, isLoading } = useSWR(
    key,
    () => fetchRecipeNames(ids),
    {
      revalidateOnFocus: false,
      dedupingInterval: CACHE_TTL_MS,
      keepPreviousData: true,
    }
  )

  return {
    names: data ?? ({} as RecipeNameMap),
    isLoading,
    error,
  }
}
