import { PersonalDataSheet } from './pds.service';

/**
 * Page-4 questionnaire of CS Form 212 Revised 2026 (questions 34–40), worded and grouped exactly
 * as printed, shared by the faculty and dean PDS forms.
 *
 * The data fields keep their older names (same mapping as buildOverlays() in pds-pdf.service.ts):
 *   34a/b → q34_a/q34_b, 35a → q35_a, 35b → q35_b (+ q36_date_filed / q36_case_status), 36 → q36,
 *   37 → q37, 38a → q38, 38b → q39, 39 → q40, 40a → q41 (q41_country holds the group),
 *   40b → q43, 40c → q44.
 */
export interface PdsQuestionDetail {
  label: string;
  field: keyof PersonalDataSheet;
  type: 'text' | 'date' | 'textarea';
}

export interface PdsQuestion {
  /** Sub-item letter ("a", "b", "c"), omitted for single questions */
  letter?: string;
  text: string;
  answer: keyof PersonalDataSheet;
  /** Shown when the answer is YES */
  details: PdsQuestionDetail[];
}

export interface PdsQuestionGroup {
  no: number;
  /** Lead-in text printed before the lettered sub-items */
  intro?: string;
  items: PdsQuestion[];
}

const giveDetails = (field: keyof PersonalDataSheet): PdsQuestionDetail[] => [
  { label: 'If YES, give details:', field, type: 'textarea' },
];

export const PDS_QUESTIONNAIRE: PdsQuestionGroup[] = [
  {
    no: 34,
    intro:
      'Are you related by consanguinity or affinity to the appointing or recommending authority, ' +
      'or to the chief of bureau or office or to the person who has immediate supervision over you ' +
      'in the Office, Bureau or Department where you will be appointed,',
    items: [
      { letter: 'a', text: 'within the third degree?', answer: 'q34_a_answer', details: giveDetails('q34_a_details') },
      {
        letter: 'b',
        text: 'within the fourth degree (for Local Government Unit - Career Employees)?',
        answer: 'q34_b_answer',
        details: giveDetails('q34_b_details'),
      },
    ],
  },
  {
    no: 35,
    items: [
      {
        letter: 'a',
        text: 'Have you ever been found guilty of any administrative offense?',
        answer: 'q35_a_answer',
        details: giveDetails('q35_a_details'),
      },
      {
        letter: 'b',
        text: 'Have you been criminally charged before any court?',
        answer: 'q35_b_answer',
        details: [
          { label: 'If YES, give details:', field: 'q35_b_details', type: 'textarea' },
          { label: 'Date Filed:', field: 'q36_date_filed', type: 'date' },
          { label: 'Status of Case/s:', field: 'q36_case_status', type: 'text' },
        ],
      },
    ],
  },
  {
    no: 36,
    items: [
      {
        text:
          'Have you ever been convicted of any crime or violation of any law, decree, ordinance or ' +
          'regulation by any court or tribunal?',
        answer: 'q36_answer',
        details: giveDetails('q36_details'),
      },
    ],
  },
  {
    no: 37,
    items: [
      {
        text:
          'Have you ever been separated from the service in any of the following modes: resignation, ' +
          'retirement, dropped from the rolls, dismissal, termination, end of term, finished contract ' +
          'or phased out (abolition) in the public or private sector?',
        answer: 'q37_answer',
        details: giveDetails('q37_details'),
      },
    ],
  },
  {
    no: 38,
    items: [
      {
        letter: 'a',
        text:
          'Have you ever been a candidate in a national or local election held within the last year ' +
          '(except Barangay election)?',
        answer: 'q38_answer',
        details: giveDetails('q38_details'),
      },
      {
        letter: 'b',
        text:
          'Have you resigned from the government service during the three (3)-month period before the ' +
          'last election to promote/actively campaign for a national or local candidate?',
        answer: 'q39_answer',
        details: giveDetails('q39_details'),
      },
    ],
  },
  {
    no: 39,
    items: [
      {
        text: 'Have you acquired the status of an immigrant or permanent resident of another country?',
        answer: 'q40_answer',
        details: [{ label: 'If YES, give details (country):', field: 'q40_details', type: 'text' }],
      },
    ],
  },
  {
    no: 40,
    intro:
      "Pursuant to: (a) Indigenous People's Act (RA 8371); (b) Magna Carta for Disabled Persons " +
      '(RA 7277, as amended); and (c) Expanded Solo Parents Welfare Act (RA 11861), please answer ' +
      'the following items:',
    items: [
      {
        letter: 'a',
        text: 'Are you a member of any indigenous group?',
        answer: 'q41_answer',
        details: [{ label: 'If YES, please specify:', field: 'q41_country', type: 'text' }],
      },
      {
        letter: 'b',
        text: 'Are you a person with disability?',
        answer: 'q43_answer',
        details: [{ label: 'If YES, please specify ID No:', field: 'q43_id_no', type: 'text' }],
      },
      {
        letter: 'c',
        text: 'Are you a solo parent?',
        answer: 'q44_answer',
        details: [{ label: 'If YES, please specify ID No:', field: 'q44_id_no', type: 'text' }],
      },
    ],
  },
];
