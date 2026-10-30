import {
  drawProfileCover,
  FacultyProfilePdfData,
} from './faculty-profile-cover';

interface DrawnText {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  weight: number;
  descent: number;
}

function recorder() {
  const ctx = document.createElement('canvas').getContext('2d')!;
  const drawn: DrawnText[] = [];
  const bullets: { x: number; y: number; radius: number }[] = [];
  const rules: { x: number; y: number; width: number; height: number }[] = [];
  spyOn(ctx, 'fillText').and.callFake((text, x, y) => {
    drawn.push({
      text, x, y, width: ctx.measureText(text).width,
      size: Number(ctx.font.match(/([\d.]+)px/)![1]),
      weight: Number(ctx.font.match(/^(\d+)\s/)?.[1] || 400),
      descent: ctx.measureText(text).actualBoundingBoxDescent,
    });
  });
  spyOn(ctx, 'arc').and.callFake((x, y, radius) => { bullets.push({ x, y, radius }); });
  spyOn(ctx, 'fillRect').and.callFake((x, y, width, height) => { rules.push({ x, y, width, height }); });
  return { ctx, drawn, bullets, rules };
}

function profile(courses: string[] = []): FacultyProfilePdfData {
  return {
    faculty: {
      first_name: 'Estelito', middle_name: 'Corpus', last_name: 'Carpio',
      email: 'faculty@example.edu', department: 'College of Engineering Technology',
      academic_rank: 'Lecturer I', employment_status: 'Guest Lecturer',
    },
    personal: null, academic: [], employment: [], coursesHandled: courses,
  };
}

describe('Faculty Profile cover layout', () => {
  const appointmentText = (drawn: DrawnText[]) => drawn
    .filter((item) => item.x === 250.8 && item.size === 14.2 && item.weight === 800)
    .map((item) => item.text).join(' ');

  it('prints the saved designation and Academic Rank with an automatic pipe separator', () => {
    const data = profile();
    data.faculty.designation = 'OJT and SFAO Coordinator';
    data.faculty.position_level = 'Instructor I';
    data.faculty.academic_rank = 'Associate Professor III';
    data.employment = [{ is_current: true, position_title: 'Old Coordinator' }];
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(appointmentText(drawn)).toBe('OJT and SFAO Coordinator | Instructor I');
    const label = drawn.find((item) => item.text === 'ACADEMIC RANK')!;
    expect(drawn.find((item) => item.x === 303.2 && item.y === label.y)?.text).toBe('Instructor I');
    expect(drawn.some((item) => item.text.includes('Old Coordinator'))).toBeFalse();
    expect(drawn.some((item) => item.text.includes('Associate Professor III'))).toBeFalse();
  });

  it('joins multiple saved designations before the rank and preserves acronyms', () => {
    const data = profile();
    data.faculty.designation = '\r\n OJT and SFAO Coordinator \n\n Research Coordinator \r\n';
    data.faculty.position_level = 'PROFESSOR VI';
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(appointmentText(drawn)).toBe('OJT and SFAO Coordinator | Research Coordinator | Professor VI');
  });

  for (const designation of [undefined, null, '', ' \n  ']) {
    it(`omits the designation line when none is saved (${String(designation)}) despite employment history`, () => {
      const data = profile();
      data.faculty.designation = designation;
      data.faculty.position_level = 'Instructor II';
      data.employment = [{ is_current: true, position_title: 'Old Coordinator' }];
      const { ctx, drawn } = recorder();
      drawProfileCover(ctx, 1, data, null);
      expect(appointmentText(drawn)).toBe('');
      expect(drawn.some((item) => item.text.includes('|') || item.text.includes('Old Coordinator'))).toBeFalse();
      expect(drawn.filter((item) => item.x === 250.8 && item.text === 'Instructor II').length).toBe(1);
    });
  }

  it('prints a designation without an orphan separator when the saved rank is empty', () => {
    const data = profile();
    data.faculty.designation = 'OJT and SFAO Coordinator';
    data.faculty.position_level = '';
    data.faculty.academic_rank = '';
    data.employment = [{ is_current: true, position_title: 'Old Position' }];
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(appointmentText(drawn)).toBe('OJT and SFAO Coordinator');
    const label = drawn.find((item) => item.text === 'ACADEMIC RANK')!;
    expect(drawn.find((item) => item.x === 303.2 && item.y === label.y)).toBeUndefined();
    expect(drawn.some((item) => item.text.includes('|') || item.text.includes('Old Position'))).toBeFalse();
  });

  it('uses the legacy saved academic rank only when the Faculty Management rank is absent', () => {
    const data = profile();
    data.faculty.position_level = '   ';
    data.faculty.academic_rank = 'Associate Professor III';
    data.faculty.designation = 'Research Coordinator';
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(appointmentText(drawn)).toBe('Research Coordinator | Associate Professor III');
  });

  it('wraps long designations above the contact details and personal information', () => {
    const data = profile();
    data.faculty.designation = ('Research and Extension Program Coordinator '.repeat(7)).slice(0, 255);
    data.faculty.position_level = 'Professorial Lecturer VI';
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    const lines = drawn.filter((item) => item.x === 250.8 && item.size === 14.2 && item.weight === 800);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.x + line.width).toBeLessThanOrEqual(550.01);
    const last = Math.max(...lines.map((item) => item.y));
    const contact = drawn.find((item) => item.text === 'Contact Number:')!;
    expect(contact.y).toBeGreaterThan(last);
    expect(drawn.find((item) => item.text === 'PERSONAL INFORMATION')!.y).toBeGreaterThan(contact.y);
  });

  for (const status of ['Permanent', 'Temporary', 'Guest Lecturer']) {
    it(`prints the College Department status (${status}) instead of employment history`, () => {
      const data = profile();
      data.faculty.employment_status = status;
      data.employment = [{ is_current: true, employment_status: 'Contractual' }];
      const { ctx, drawn } = recorder();
      drawProfileCover(ctx, 1, data, null);
      const label = drawn.find((item) => item.text === 'EMPLOYMENT STATUS')!;
      const value = drawn.find((item) => item.x === 303.2 && item.y === label.y);
      expect(value?.text).toBe(status);
    });
  }

  for (const status of [undefined, null, '', '   ']) {
    it(`leaves an unset department status blank (${String(status)}) despite employment history`, () => {
      const data = profile();
      data.faculty.employment_status = status;
      data.employment = [{ is_current: true, employment_status: 'Contractual' }];
      const { ctx, drawn } = recorder();
      drawProfileCover(ctx, 1, data, null);
      const label = drawn.find((item) => item.text === 'EMPLOYMENT STATUS')!;
      expect(drawn.find((item) => item.x === 303.2 && item.y === label.y)).toBeUndefined();
    });
  }

  for (const extension of ['Jr.', 'Sr.', 'III']) {
    it(`prints ${extension} in the full name and the separate name extension field`, () => {
      const data = profile();
      data.personal = { extension_name: extension };
      const { ctx, drawn } = recorder();
      drawProfileCover(ctx, 1, data, null);
      const header = drawn.filter((item) => item.size === 19.8).map((item) => item.text).join(' ');
      expect(header).toBe(`ESTELITO C. CARPIO ${extension.toUpperCase()}`);
      const label = drawn.find((item) => item.text === 'NAME EXTENSION:')!;
      const value = drawn.find((item) => item.text === extension.toUpperCase() && item.y > label.y)!;
      expect(label.x).toBeGreaterThan(400);
      expect(value.x).toBeGreaterThanOrEqual(label.x);
      expect(value.y).toBeGreaterThan(label.y);
    });
  }

  it('omits the extension when My Profile is missing even if another record has a suffix', () => {
    const data = profile();
    data.faculty.extension_name = 'Jr.';
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(drawn.some((item) => item.text === 'NAME EXTENSION:')).toBeFalse();
    expect(drawn.some((item) => item.text === 'JR.')).toBeFalse();
  });

  for (const extension of [undefined, '', '   ', 'None', 'N/A']) {
    it(`omits the label and suffix for an empty My Profile choice (${String(extension)})`, () => {
      const data = profile();
      data.personal = { extension_name: extension };
      data.faculty.extension_name = 'Jr.';
      const { ctx, drawn } = recorder();
      drawProfileCover(ctx, 1, data, null);
      expect(drawn.some((item) => item.text === 'NAME EXTENSION:')).toBeFalse();
      const header = drawn.filter((item) => item.size === 19.8).map((item) => item.text).join(' ');
      expect(header).toBe('ESTELITO C. CARPIO');
    });
  }

  it('omits the extension field when no suffix is supplied', () => {
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, profile(), null);
    expect(drawn.some((item) => item.text === 'NAME EXTENSION:')).toBeFalse();
  });

  it('keeps long personal names clear of the extension field', () => {
    const data = profile();
    data.faculty.first_name = 'A very long first name that needs several lines';
    data.faculty.middle_name = 'A very long middle name';
    data.personal = { extension_name: 'Jr.' };
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, data, null);
    const label = drawn.find((item) => item.text === 'NAME EXTENSION:')!;
    const nearbyValues = drawn.filter((item) => item.x === 303.2 && item.y < label.y + 34);
    for (const item of nearbyValues) expect(item.x + item.width).toBeLessThan(418);
  });

  it('keeps a short course list in one column', () => {
    const { ctx, drawn, bullets } = recorder();
    const courses = ['Data Analytics', 'Technopreneurship', 'Professional Ethics'];
    drawProfileCover(ctx, 1, profile(courses), null);
    expect(bullets.length).toBe(3);
    const courseText = drawn.filter((item) => courses.includes(item.text));
    expect(new Set(courseText.map((item) => item.x)).size).toBe(1);
  });

  it('uses two aligned columns and wraps long titles for the sample course list', () => {
    const courses = [
      'C01 Data Analytics', 'C02 Circuits Analysis I and II', 'C03 Technopreneurship',
      'C04 Differential Calculus for BET',
      'C05 Occupational Health and Industrial Safety Management',
      'C06 Electrical and Electronics Principles', 'C07 Fluid Mechanics and Heat Transfer',
      'C08 Materials Technology Management', 'C09 Professional Ethics',
    ];
    const { ctx, drawn, bullets } = recorder();
    drawProfileCover(ctx, 1, profile(courses), null);
    expect(bullets.length).toBe(9);
    const courseText = drawn.filter((item) => item.size === 12);
    expect(new Set(courseText.map((item) => item.x))).toEqual(new Set([124, 334]));
    expect(courseText.filter((item) => /^C\d+/.test(item.text)).length).toBe(9);
    expect(Math.min(...courseText.filter((item) => item.x === 124).map((item) => item.y)))
      .toBe(Math.min(...courseText.filter((item) => item.x === 334).map((item) => item.y)));
    for (const item of courseText) {
      expect(item.x + item.width).toBeLessThanOrEqual(item.x === 124 ? 314.01 : 590.01);
      expect(item.y).toBeLessThanOrEqual(885);
    }
  });

  it('wraps a maximum-length title even when it has no spaces', () => {
    const { ctx, drawn } = recorder();
    drawProfileCover(ctx, 1, profile(['W'.repeat(255)]), null);
    const courseText = drawn.filter((item) => item.size === 12);
    expect(courseText.map((item) => item.text).join('')).toBe('W'.repeat(255));
    for (const item of courseText) expect(item.x + item.width).toBeLessThanOrEqual(590.01);
  });

  it('fits a large list on one page without losing courses or crossing the footer', () => {
    const courses = Array.from({ length: 100 }, (_, i) =>
      `C${String(i + 1).padStart(3, '0')} Applied engineering and industrial technology course`,
    );
    const { ctx, drawn, bullets, rules } = recorder();
    drawProfileCover(ctx, 1, profile(courses), null);
    expect(bullets.length).toBe(100);
    const ids = drawn.filter((item) => /^C\d+/.test(item.text)).map((item) => item.text.split(' ')[0]);
    expect(ids).toEqual(courses.map((course) => course.split(' ')[0]));
    expect(drawn.find((item) => /^C\d+/.test(item.text))!.size).toBeLessThan(12);
    for (const item of drawn) {
      expect(item.y + Math.max(0, item.descent)).toBeLessThanOrEqual(885.01);
      expect(item.x + item.width).toBeLessThanOrEqual(590.01);
    }
    for (const bullet of bullets) expect(bullet.y + bullet.radius).toBeLessThanOrEqual(885.01);
    for (const rule of rules) expect(rule.y + rule.height).toBeLessThanOrEqual(885.01);
  });

  it('fits long personal details, all education levels, eligibilities, and courses above the footer', () => {
    const courses = Array.from({ length: 40 }, (_, index) => `C${index + 1} Advanced applications of engineering and technology management`);
    const data = profile(courses);
    data.faculty.first_name = 'A long faculty first name that needs to wrap across several lines';
    data.faculty.designation = ('Research and Extension Coordinator\nOJT and SFAO Coordinator\n').repeat(4).slice(0, 255);
    data.faculty.position_level = 'Professorial Lecturer VI';
    data.personal = { extension_name: 'Jr.', date_of_birth: '1985-01-01', civil_status: 'Married' };
    data.academic = ['Undergraduate', 'Master', 'Doctorate'].map((level) => ({
      level, degree_course: `${level} degree in applied engineering and interdisciplinary technology management`,
      school_name: 'Example State University College of Engineering and Technology',
      year_graduated: 2020, honors_received: 'Academic Excellence Award',
    }));
    data.eligibilities = Array.from({ length: 12 }, (_, index) => `ELIG${index + 1} Professional engineering and technical competency eligibility`);
    const { ctx, drawn, bullets, rules } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(bullets.length).toBe(courses.length);
    expect(drawn.filter((item) => /^C\d+ /.test(item.text)).length).toBe(courses.length);
    expect(drawn.filter((item) => /^ELIG\d+ /.test(item.text)).length).toBe(12);
    for (const label of ['PERSONAL INFORMATION', 'EDUCATION', 'ELIGIBILITIES', 'COURSES HANDLED', 'NAME EXTENSION:']) {
      expect(drawn.some((item) => item.text === label)).toBeTrue();
    }
    for (const item of drawn) {
      expect(item.y + Math.max(0, item.descent)).toBeLessThanOrEqual(885.01);
      expect(item.x + item.width).toBeLessThanOrEqual(590.01);
    }
    for (const rule of rules) expect(rule.y + rule.height).toBeLessThanOrEqual(885.01);
  });

  it('also fits overflowing profile sections when there are no courses to paginate', () => {
    const data = profile();
    data.faculty.contact_number = '9'.repeat(255);
    data.faculty.email = `${'a'.repeat(230)}@example.edu`;
    data.eligibilities = Array.from({ length: 100 }, (_, index) => `ELIG${index + 1} Professional technical certification and competency assessment`);
    const { ctx, drawn, rules } = recorder();
    drawProfileCover(ctx, 1, data, null);
    expect(drawn.filter((item) => /^ELIG\d+ /.test(item.text)).length).toBe(100);
    for (const item of drawn) {
      expect(item.y + Math.max(0, item.descent)).toBeLessThanOrEqual(885.01);
      expect(item.x + item.width).toBeLessThanOrEqual(590.01);
    }
    for (const rule of rules) expect(rule.y + rule.height).toBeLessThanOrEqual(885.01);
  });
});
