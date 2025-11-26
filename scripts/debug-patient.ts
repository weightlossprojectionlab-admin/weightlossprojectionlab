import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { adminDb } from '../lib/firebase-admin';

const patientId = '5a53d109-b19b-4c20-8237-0156f0809b28';

(async () => {
  console.log('Searching for patient:', patientId);
  console.log('');

  // Search all users for this patient
  // Note: collectionGroup with documentId() requires full path, so we search by document ID
  const result = await adminDb.collectionGroup('patients')
    .get();

  const matchingDocs = result.docs.filter(doc => doc.id === patientId);

  console.log(`Found ${matchingDocs.length} patient documents with this ID`);

  if (matchingDocs.length > 0) {
    matchingDocs.forEach(doc => {
      console.log('\nPatient Path:', doc.ref.path);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  } else {
    console.log('\n⚠️  Patient document NOT FOUND in Firestore');
    console.log('\nSearching for family members who reference it...\n');

    // Find family members with this patient in patientsAccess
    const familyMembers = await adminDb.collectionGroup('familyMembers')
      .where('patientsAccess', 'array-contains', patientId)
      .get();

    console.log(`Found ${familyMembers.size} family members with access to this patient:`);

    familyMembers.forEach(doc => {
      const data = doc.data();
      console.log('\nFamily Member Path:', doc.ref.path);
      console.log('  Email:', data.email);
      console.log('  Status:', data.status);
      console.log('  UserId:', data.userId);
      console.log('  Patients Access:', data.patientsAccess);
    });

    console.log('\n💡 Solution: The family member invitation references a patient that no longer exists.');
    console.log('   This could happen if:');
    console.log('   1. The patient was deleted after the invitation was created');
    console.log('   2. The invitation was created with an invalid patient ID');
    console.log('   3. Database migration/cleanup removed the patient');
  }
})();
