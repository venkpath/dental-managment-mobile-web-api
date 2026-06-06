import {
  countRemainingSlots,
  resolveBranchDisplayKey,
  resolveListingCover,
  type BranchSchedule,
} from './public-directory-image.utils';

const baseBranch: BranchSchedule = {
  working_days: '1,2,3,4,5,6',
  working_start_time: '10:00',
  working_end_time: '20:00',
  lunch_start_time: null,
  lunch_end_time: null,
  slot_duration: 15,
  buffer_minutes: 0,
  default_appt_duration: 30,
};

describe('resolveListingCover', () => {
  it('prefers branch photo when uploaded', () => {
    const result = resolveListingCover(
      [{ id: 'b1', photo_url: 'clinics/1/branch-photos/b1.jpg' }],
      'clinics/1/clinic-cover.jpg',
      'clinics/1/staff-photos/dentist.jpg',
    );
    expect(result).toEqual({
      branchCoverId: 'b1',
      coverKey: 'clinics/1/branch-photos/b1.jpg',
    });
  });

  it('falls back to clinic cover when no branch photo', () => {
    const result = resolveListingCover(
      [{ id: 'b1', photo_url: null }],
      'clinics/1/clinic-cover.jpg',
      'clinics/1/staff-photos/dentist.jpg',
    );
    expect(result).toEqual({
      branchCoverId: null,
      coverKey: 'clinics/1/clinic-cover.jpg',
    });
  });

  it('falls back to dentist photo when no branch or clinic cover', () => {
    const result = resolveListingCover(
      [{ id: 'b1', photo_url: null }],
      null,
      'clinics/1/staff-photos/dentist.jpg',
    );
    expect(result).toEqual({
      branchCoverId: null,
      coverKey: 'clinics/1/staff-photos/dentist.jpg',
    });
  });

  it('returns null when no images exist', () => {
    expect(resolveListingCover([], null, null)).toEqual({
      branchCoverId: null,
      coverKey: null,
    });
  });
});

describe('resolveBranchDisplayKey', () => {
  it('uses branch photo when present', () => {
    expect(resolveBranchDisplayKey('branch.jpg', 'clinic.jpg')).toBe('branch.jpg');
  });

  it('falls back to clinic cover only', () => {
    expect(resolveBranchDisplayKey(null, 'clinic.jpg')).toBe('clinic.jpg');
  });

  it('returns null without branch or clinic cover', () => {
    expect(resolveBranchDisplayKey(null, null)).toBeNull();
  });
});

describe('countRemainingSlots', () => {
  it('returns zero after closing time', () => {
    const afterClose = timeToMins('20:30');
    expect(countRemainingSlots(baseBranch, afterClose)).toBe(0);
  });

  it('counts only future slots before close', () => {
    const at2pm = timeToMins('14:00');
    const remaining = countRemainingSlots(baseBranch, at2pm);
    const fullDay = countRemainingSlots(baseBranch, timeToMins('09:00'));
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(fullDay);
  });

  it('returns zero when only past slots remain before close', () => {
    const at730pm = timeToMins('19:30');
    expect(countRemainingSlots(baseBranch, at730pm)).toBe(0);
  });
});

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
