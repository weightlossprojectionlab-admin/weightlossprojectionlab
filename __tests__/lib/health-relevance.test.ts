/**
 * health-relevance Tests — the caregiver-voice note derived from the engine.
 */
import { householdHealthNotes } from '@/lib/health-relevance'
import type { ItemHealthProfile, MemberHealthProfile } from '@/lib/health-demand'

const name = (id: string) => ({ dad: 'Dad', gran: 'Gran' }[id] ?? id)

const member = (id: string, conditions: string[]): MemberHealthProfile => ({
  id, conditions, allergies: [], dietaryRestrictions: [],
})

describe('householdHealthNotes', () => {
  it('flags the dominant harmful nutrient in caregiver voice', () => {
    const sugary: ItemHealthProfile = { nutrients: { addedSugar: 56, sodium: 40, saturatedFat: 10 } }
    const notes = householdHealthNotes(sugary, [member('dad', ['diabetes'])], name)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ memberId: 'dad', tone: 'limit', nutrient: 'addedSugar' })
    expect(notes[0].text).toBe('High in sugar — best to limit for Dad')
  })

  it('picks sodium for a hypertensive member', () => {
    const salty: ItemHealthProfile = { nutrients: { sodium: 700, addedSugar: 2, saturatedFat: 1 } }
    const notes = householdHealthNotes(salty, [member('gran', ['hypertension'])], name)
    expect(notes[0].text).toBe('High in sodium — best to limit for Gran')
  })

  it('surfaces a beneficial nutrient as a positive note', () => {
    // Potassium supports hypertension (W +0.15); a clean high-potassium item.
    const banana: ItemHealthProfile = { nutrients: { potassium: 600, sodium: 1, saturatedFat: 0 } }
    const notes = householdHealthNotes(banana, [member('gran', ['hypertension'])], name)
    expect(notes[0].tone).toBe('good')
    expect(notes[0].text).toBe('High in potassium — good for Gran')
  })

  it('says nothing when no member has a relevant condition', () => {
    const sugary: ItemHealthProfile = { nutrients: { addedSugar: 56, sodium: 40, saturatedFat: 10 } }
    expect(householdHealthNotes(sugary, [member('dad', [])], name)).toEqual([])
  })

  it('says nothing below the significance threshold', () => {
    const trace: ItemHealthProfile = { nutrients: { addedSugar: 1, sodium: 5, saturatedFat: 0.2 } }
    expect(householdHealthNotes(trace, [member('dad', ['diabetes'])], name)).toEqual([])
  })

  it('says nothing when the item has no nutrient panel', () => {
    expect(householdHealthNotes({}, [member('dad', ['diabetes'])], name)).toEqual([])
  })
})
