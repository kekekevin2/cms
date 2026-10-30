import { ElementRef } from '@angular/core';
import { DeanRequirementsMonitoring } from './requirements-monitoring';
import { DeanRequirementService } from '../../../services/dean/dean-requirement.service';
import { DeanFacultyService, Faculty } from '../../../services/dean/dean-faculty.service';
import { DropdownService } from '../../../services/core/dropdown.service';
import { of } from 'rxjs';

describe('Portfolio faculty search', () => {
  let component: DeanRequirementsMonitoring;
  let requirements: jasmine.SpyObj<DeanRequirementService>;
  const leoven = { faculty_id: 1, first_name: 'Leoven', last_name: 'Garcia', employee_id: 'EMP001' } as Faculty;
  const maria = { faculty_id: 2, first_name: 'Maria', last_name: 'Austria', employee_id: 'EMP002' } as Faculty;

  beforeEach(() => {
    requirements = jasmine.createSpyObj('DeanRequirementService', [
      'getFacultyRequirements',
      'previewRequirement',
    ]);
    requirements.getFacultyRequirements.and.returnValue(of({ faculty: leoven, requirements: [] } as any));
    requirements.previewRequirement.and.returnValue(
      of({
        kind: 'docx',
        filename: 'requirement.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        url: 'https://files.example/requirement.docx',
      }),
    );
    component = new DeanRequirementsMonitoring(requirements, {} as DeanFacultyService, {} as DropdownService);
    component.facultyList.set([leoven, maria]);
  });

  it('finds names regardless of case, whitespace, or name order', () => {
    component.searchQuery.set('  GARCIA leov  ');
    expect(component.filteredFacultyList()).toEqual([leoven]);
  });

  it('searches names only and restores the list when cleared', () => {
    component.searchQuery.set('EMP001');
    expect(component.filteredFacultyList()).toEqual([]);
    component.searchQuery.set('');
    expect(component.filteredFacultyList()).toEqual([leoven, maria]);
  });

  it('opens the selected result using the current academic year and semester', () => {
    component.selectedAcademicYear = 7;
    component.selectedSemester = '2nd Semester';
    component.searchResultsOpen.set(true);
    component.selectSearchFaculty(leoven);
    expect(component.selectedFacultyId).toBe(1);
    expect(component.searchResultsOpen()).toBeFalse();
    expect(requirements.getFacultyRequirements).toHaveBeenCalledOnceWith(1, 7, '2nd Semester');
    expect(component.selectedFacultyRequirements()?.faculty).toEqual(leoven);
  });

  it('loads the submitted requirement contents from the view icon', () => {
    const renderDocx = spyOn<any>(component, 'renderRequirementDocx').and.callFake(async () => {
      component.previewLoading.set(false);
    });
    component.openViewModal({ submission_id: 17, file_name: 'requirement.docx' });

    expect(requirements.previewRequirement).toHaveBeenCalledOnceWith(17);
    expect(component.showViewModal()).toBeTrue();
    expect(component.previewKind()).toBe('docx');
    expect(renderDocx).toHaveBeenCalledWith(
      'https://files.example/requirement.docx',
      jasmine.any(Number),
    );
    expect(component.previewLoading()).toBeFalse();
  });

  it('resizes requirement PDF pages without reloading the file', () => {
    const container = window.document.createElement('div');
    const canvas = window.document.createElement('canvas');
    canvas.dataset['baseWidth'] = '800';
    canvas.dataset['baseHeight'] = '1000';
    container.appendChild(canvas);
    (component as any).requirementPdfPreviewContainer = new ElementRef(container);

    component.previewZoom.set(100);
    component.zoomPdfOut();

    expect(component.previewZoom()).toBe(75);
    expect(canvas.style.width).toBe('600px');
    expect(canvas.style.height).toBe('750px');

    component.zoomPdfIn();
    expect(component.previewZoom()).toBe(100);
    expect(canvas.style.width).toBe('800px');
  });
});
