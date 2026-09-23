import test from 'node:test';
import assert from 'node:assert/strict';
import { TripStateMachine, type TripModel, type TripStatus } from './tripStateMachine';

function makeTrip(status: TripStatus = 'REQUESTED'): TripModel {
  const created = TripStateMachine.createNewTrip({
    id: 'trip-test-1',
    pillar: 'WIN_KNIGHT',
    citizenId: 'citizen-1',
    citizenName: 'Citizen',
    citizenPhone: '0800000000',
    originName: 'A',
    destinationName: 'B',
    distanceKm: 3,
    fare: 45,
    feeBreakdown: { baseFare: 45, platformFee: 2, knightNet: 43, deductionsTotal: 2 },
    proofPhotos: {},
  });
  if (status === 'REQUESTED') return created;
  const path: TripStatus[] = ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
  let current = created;
  for (const next of path) {
    current = TripStateMachine.transition(current, next, 'actor', 'knight');
    if (next === status) return current;
  }
  throw new Error(`Unsupported test state: ${status}`);
}

const allowed: Record<TripStatus, TripStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
const all: TripStatus[] = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

test('state machine allows every documented transition and rejects every undocumented transition', () => {
  for (const from of all) {
    for (const to of all) {
      assert.equal(TripStateMachine.canTransition(from, to), allowed[from].includes(to), `${from} -> ${to}`);
    }
  }
});

test('happy path is strictly one-way and records immutable history entries', () => {
  let trip = makeTrip();
  for (const next of ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] as TripStatus[]) {
    const previous = trip;
    trip = TripStateMachine.transition(trip, next, 'knight-1', 'knight');
    assert.equal(trip.status, next);
    assert.notEqual(trip, previous);
    assert.equal(trip.history.at(-1)?.toStatus, next);
  }
  assert.throws(() => TripStateMachine.transition(trip, 'IN_PROGRESS', 'knight-1', 'knight'));
});

test('cancellation is valid from each non-terminal state and terminal afterwards', () => {
  for (const from of ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] as TripStatus[]) {
    const cancelled = TripStateMachine.transition(makeTrip(from), 'CANCELLED', 'citizen-1', 'citizen', 'user_cancelled');
    assert.equal(cancelled.status, 'CANCELLED');
    for (const next of all) assert.equal(TripStateMachine.canTransition('CANCELLED', next), false);
  }
});
