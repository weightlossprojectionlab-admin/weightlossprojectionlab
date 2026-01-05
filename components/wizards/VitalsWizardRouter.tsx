'use client';

/**
 * Vitals Wizard Router
 *
 * Routes to the appropriate vitals wizard based on whether the family member is a pet or human.
 * This component follows separation of concerns by delegating to specialized wizards.
 */

import { useMemo } from 'react';
import SupervisedVitalsWizard from './SupervisedVitalsWizard';
import PetVitalsWizard, { PetVitalsData } from '@/components/pets/PetVitalsWizard';
import { getSpeciesCategory } from '@/lib/pet-species-utils';
import type { VitalSign } from '@/types/medical';
import toast from 'react-hot-toast';

interface VitalsWizardRouterProps {
  isOpen: boolean;
  onClose: () => void;
  familyMember: {
    id: string;
    name: string;
    age?: number;
    conditions?: string[];
    createdAt?: string;
    type?: 'human' | 'pet';
    species?: string;
    breed?: string;
  };
  recentReadings?: any[];
  onSubmit: (vitals: any) => Promise<void>;
  onComplete?: (savedVitals: VitalSign[]) => void;
  caregivers?: Array<{
    id: string;
    name: string;
    relationship?: string;
    userId?: string;
  }>;
}

export default function VitalsWizardRouter({
  isOpen,
  onClose,
  familyMember,
  recentReadings = [],
  onSubmit,
  onComplete,
  caregivers = []
}: VitalsWizardRouterProps) {
  // Determine if this is a pet or human
  const isPet = familyMember.type === 'pet';

  // For pets, route to PetVitalsWizard
  if (isPet) {
    return (
      <PetVitalsWizard
        isOpen={isOpen}
        onClose={onClose}
        petData={{
          speciesCategory: getSpeciesCategory(familyMember.species),
          speciesDetail: familyMember.species,
          breed: familyMember.breed,
          name: familyMember.name
        }}
        onComplete={async (vitalsData: PetVitalsData) => {
          // Transform PetVitalsData to the format expected by onSubmit
          const transformedVitals: any = {
            timestamp: new Date(),
            recordedDate: new Date()
          };

          // Add weight if provided
          if (vitalsData.weight) {
            transformedVitals.weight = vitalsData.weight;
            transformedVitals.weightUnit = vitalsData.weightUnit || 'lbs';
          }

          // Add temperature if provided
          if (vitalsData.temperature) {
            transformedVitals.temperature = vitalsData.temperature;
          }

          // Add heart rate if provided
          if (vitalsData.heartRate) {
            transformedVitals.heartRate = vitalsData.heartRate;
          }

          // Add respiratory rate if provided
          if (vitalsData.respiratoryRate) {
            transformedVitals.respiratoryRate = vitalsData.respiratoryRate;
          }

          // Store all pet-specific vitals in a structured object
          transformedVitals.petVitals = vitalsData;

          try {
            await onSubmit(transformedVitals);
            toast.success('Pet health vitals saved successfully!');

            // Call onComplete if provided
            if (onComplete) {
              // Convert to VitalSign format if needed
              const savedVitals: VitalSign[] = [];
              const timestamp = new Date();

              if (vitalsData.weight) {
                savedVitals.push({
                  id: `weight-${Date.now()}`,
                  type: 'weight',
                  value: vitalsData.weight,
                  unit: vitalsData.weightUnit || 'lbs',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.temperature) {
                savedVitals.push({
                  id: `temperature-${Date.now() + 1}`,
                  type: 'temperature',
                  value: vitalsData.temperature,
                  unit: '°F',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.heartRate) {
                savedVitals.push({
                  id: `heartRate-${Date.now() + 2}`,
                  type: 'heartRate',
                  value: vitalsData.heartRate,
                  unit: 'bpm',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.respiratoryRate) {
                savedVitals.push({
                  id: `respiratoryRate-${Date.now() + 3}`,
                  type: 'respiratoryRate',
                  value: vitalsData.respiratoryRate,
                  unit: 'breaths/min',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.bodyConditionScore) {
                savedVitals.push({
                  id: `bodyConditionScore-${Date.now() + 4}`,
                  type: 'bodyConditionScore',
                  value: vitalsData.bodyConditionScore,
                  unit: vitalsData.bodyConditionScale || '1-9',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              // Fish-specific vitals
              if (vitalsData.waterTemp) {
                savedVitals.push({
                  id: `waterTemp-${Date.now() + 5}`,
                  type: 'waterTemp',
                  value: vitalsData.waterTemp,
                  unit: '°F',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.pH !== undefined) {
                savedVitals.push({
                  id: `pH-${Date.now() + 6}`,
                  type: 'pH',
                  value: vitalsData.pH,
                  unit: 'pH',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.ammonia !== undefined) {
                savedVitals.push({
                  id: `ammonia-${Date.now() + 7}`,
                  type: 'ammonia',
                  value: vitalsData.ammonia,
                  unit: 'ppm',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.nitrite !== undefined) {
                savedVitals.push({
                  id: `nitrite-${Date.now() + 8}`,
                  type: 'nitrite',
                  value: vitalsData.nitrite,
                  unit: 'ppm',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.nitrate !== undefined) {
                savedVitals.push({
                  id: `nitrate-${Date.now() + 9}`,
                  type: 'nitrate',
                  value: vitalsData.nitrate,
                  unit: 'ppm',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              // Reptile-specific vitals
              if (vitalsData.baskingTemp) {
                savedVitals.push({
                  id: `baskingTemp-${Date.now() + 10}`,
                  type: 'baskingTemp',
                  value: vitalsData.baskingTemp,
                  unit: '°F',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.coolSideTemp) {
                savedVitals.push({
                  id: `coolSideTemp-${Date.now() + 11}`,
                  type: 'coolSideTemp',
                  value: vitalsData.coolSideTemp,
                  unit: '°F',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              if (vitalsData.humidity !== undefined) {
                savedVitals.push({
                  id: `humidity-${Date.now() + 12}`,
                  type: 'humidity',
                  value: vitalsData.humidity,
                  unit: '%',
                  recordedAt: timestamp.toISOString(),
                  patientId: familyMember.id,
                  takenBy: familyMember.id,
                  method: 'manual'
                } as VitalSign);
              }

              onComplete(savedVitals);
            }

            onClose();
          } catch (error) {
            console.error('Error saving pet vitals:', error);
            toast.error('Failed to save pet vitals');
          }
        }}
      />
    );
  }

  // For humans, route to SupervisedVitalsWizard
  return (
    <SupervisedVitalsWizard
      isOpen={isOpen}
      onClose={onClose}
      familyMember={{
        id: familyMember.id,
        name: familyMember.name,
        age: familyMember.age,
        conditions: familyMember.conditions,
        createdAt: familyMember.createdAt
      }}
      recentReadings={recentReadings}
      onSubmit={onSubmit}
      onComplete={onComplete}
      caregivers={caregivers}
    />
  );
}
