import test from 'node:test';
import assert from 'node:assert';
import { cleanFirestorePayload, getFriendlyErrorMessage } from './firestoreUtils';

test('cleanFirestorePayload removes undefined fields from shallow objects', () => {
  const payload = {
    displayName: 'Alex',
    bio: 'Creator',
    avatarUrl: undefined,
    photoURL: undefined,
    currentAmountDollars: 0,
    showSupporters: false,
    emptyField: '',
    removedAvatar: null,
  };

  const cleaned = cleanFirestorePayload(payload);

  assert.strictEqual('avatarUrl' in cleaned, false);
  assert.strictEqual('photoURL' in cleaned, false);
  assert.strictEqual(cleaned.displayName, 'Alex');
  assert.strictEqual(cleaned.bio, 'Creator');
  assert.strictEqual(cleaned.currentAmountDollars, 0);
  assert.strictEqual(cleaned.showSupporters, false);
  assert.strictEqual(cleaned.emptyField, '');
  assert.strictEqual(cleaned.removedAvatar, null);
});

test('cleanFirestorePayload removes nested undefined fields (e.g. activeGoal.description)', () => {
  const payload = {
    activeGoal: {
      id: 'goal_123',
      title: 'New microphone',
      targetAmountDollars: 150,
      currentAmountDollars: 0,
      description: undefined,
      isActive: true,
      createdAt: 1234567890,
    },
    updatedAt: 1234567890,
  };

  const cleaned = cleanFirestorePayload(payload);

  assert.strictEqual(cleaned.activeGoal?.title, 'New microphone');
  assert.strictEqual(cleaned.activeGoal?.currentAmountDollars, 0);
  assert.strictEqual('description' in (cleaned.activeGoal || {}), false);
  assert.strictEqual(cleaned.updatedAt, 1234567890);
});

test('cleanFirestorePayload preserves $0 goal values', () => {
  const payload = {
    activeGoal: {
      id: 'goal_zero',
      title: 'Free goal',
      targetAmountDollars: 0,
      currentAmountDollars: 0,
      isActive: true,
    },
  };

  const cleaned = cleanFirestorePayload(payload);
  assert.strictEqual(cleaned.activeGoal?.targetAmountDollars, 0);
  assert.strictEqual(cleaned.activeGoal?.currentAmountDollars, 0);
});

test('getFriendlyErrorMessage replaces internal raw Firestore exceptions with friendly message', () => {
  const rawFirestoreError = new Error(
    'Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field avatarUrl in a users document)'
  );

  const friendly = getFriendlyErrorMessage(rawFirestoreError);
  assert.strictEqual(friendly, 'Couldn’t save your changes. Please try again.');
  assert.strictEqual(friendly.includes('updateDoc'), false);
  assert.strictEqual(friendly.includes('undefined'), false);
});
