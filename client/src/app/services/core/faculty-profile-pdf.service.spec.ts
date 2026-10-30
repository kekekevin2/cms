import { jsPDF } from 'jspdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FacultyProfilePdfService, FacultyProfilePdfData } from './faculty-profile-pdf.service';

describe('Faculty Profile PDF pagination', () => {
  for (const count of [3, 100]) {
    it(`exports exactly one paper with ${count} courses`, async () => {
      const service = new FacultyProfilePdfService();
      const render = jasmine.createSpy('render').and.returnValue({ promise: Promise.resolve() });
      const getPage = jasmine.createSpy('getPage').and.resolveTo({
        getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 936 * scale }),
        render,
      });
      spyOn<any>(service, 'getTemplate').and.resolveTo({ getPage } as unknown as PDFDocumentProxy);
      spyOn<any>(service, 'loadImage').and.resolveTo(null);
      spyOn(document.fonts, 'load').and.resolveTo([]);
      const data: FacultyProfilePdfData = {
        faculty: {
          first_name: 'Sample', last_name: 'Faculty', email: 'sample@example.edu',
          department: 'College of Engineering Technology', position_level: 'Instructor III',
          employment_status: 'Permanent', designation: 'Research Coordinator\nOJT and SFAO Coordinator',
        },
        personal: null,
        academic: [
          { level: 'Undergraduate', degree_course: 'Bachelor of Science in Computer Engineering', school_name: 'Example University' },
          { level: 'Master', degree_course: 'Master of Science in Computer Engineering', school_name: 'Example University' },
          { level: 'Doctorate', degree_course: 'Doctor of Philosophy in Engineering', school_name: 'Example University' },
        ],
        employment: [],
        eligibilities: ['Career Service Professional Eligibility'],
        coursesHandled: Array.from({ length: count }, (_, index) =>
          `C${index + 1} Applied engineering and industrial technology course`,
        ),
      };

      const pdf = await (service as unknown as {
        buildPdf(data: FacultyProfilePdfData): Promise<jsPDF>;
      }).buildPdf(data);

      expect(pdf.getNumberOfPages()).toBe(1);
      expect(pdf.internal.pageSize.getWidth()).toBe(612);
      expect(pdf.internal.pageSize.getHeight()).toBe(936);
      expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(1000);
      expect(getPage).toHaveBeenCalledOnceWith(1);
      expect(render).toHaveBeenCalledTimes(1);
    });
  }
});
