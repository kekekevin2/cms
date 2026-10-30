import { Injectable } from '@angular/core';
import * as pdfjs from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { Pie3dItem, toPie3dSlices } from '../../shared/components/pie-3d-chart/pie-3d-chart';
import { drawPie3d } from '../../shared/components/pie-3d-chart/pie-3d';

export type InvolvementChartType = 'research' | 'extension' | 'seminars';

const TITLES: Record<InvolvementChartType, string> = {
  research: 'Faculty Involvement in Research-related Seminars/Workshops/Trainings/Conferences',
  extension: 'Faculty Involvement in Extension Services',
  seminars: 'Faculty Involvement in Seminars/Workshops/Trainings/Conferences',
};

@Injectable({ providedIn: 'root' })
export class InvolvementChartPdfService {
  async download(type: InvolvementChartType, items: Pie3dItem[], employment: string, period: string): Promise<void> {
    if (!items.some((item) => item.value > 0)) return;
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    }
    const template = await pdfjs.getDocument('/all-activities-bg-template.pdf').promise;
    try {
      const page = await template.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const { width, height } = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create the PDF canvas.');
      await page.render({ canvasContext: ctx, viewport }).promise;

      const pdf = new jsPDF({ unit: 'pt', format: [width, height] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
      pdf.setFont('times', 'italic');
      pdf.setFontSize(16);
      const lines: string[] = pdf.splitTextToSize(TITLES[type], width - 100);
      lines.push(`(${employment})`, period);
      const titleTop = 158;
      pdf.text(lines, width / 2, titleTop, { align: 'center', lineHeightFactor: 1.25 });

      // Draw independently of the dashboard size and theme for a clear printable chart.
      const chart = document.createElement('canvas');
      const chartWidth = width - 72;
      const chartHeight = Math.min(430, height - 100 - (titleTop + lines.length * 20 + 24));
      chart.width = chartWidth * 3;
      chart.height = chartHeight * 3;
      const chartCtx = chart.getContext('2d');
      if (!chartCtx) throw new Error('Unable to draw the chart.');
      chartCtx.scale(3, 3);
      drawPie3d(chartCtx, chartWidth, chartHeight, toPie3dSlices(items), {
        dark: false, fontFamily: 'Arial, sans-serif',
      });
      pdf.addImage(chart.toDataURL('image/png'), 'PNG', 36, titleTop + lines.length * 20 + 24, chartWidth, chartHeight);
      const filename = `Faculty_Involvement_${type}_${employment}_${period}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
      pdf.save(`${filename}.pdf`);
    } finally {
      await template.destroy();
    }
  }
}
